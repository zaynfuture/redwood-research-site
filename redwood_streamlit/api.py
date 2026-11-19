"""Server-side research client with tenant verification and admission-safe retries."""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import UTC, datetime
from time import sleep
from typing import Any, Callable

import requests

from .access import AccessError, https_origin


class ResearchApiError(RuntimeError):
    """Safe metadata only; never retain upstream bodies, credentials or transport exceptions."""
    def __init__(self, message: str, *, code: str = 'unavailable', request_id: str | None = None,
                 retry_after: int | None = None, uncertain: bool = False):
        super().__init__(message)
        self.code = code
        self.request_id = request_id
        self.retry_after = retry_after
        self.uncertain = uncertain


def _metadata(response) -> dict:
    headers = response.headers
    request_id = headers.get('X-Request-ID', '')
    if not isinstance(request_id, str) or not re.fullmatch(r'[0-9a-fA-F]{32}', request_id):
        request_id = None
    retry = headers.get('Retry-After', '')
    retry_after = int(retry) if isinstance(retry, str) and re.fullmatch(r'[0-9]{1,5}', retry) else None
    if retry_after is not None and not 1 <= retry_after <= 86400:
        retry_after = None
    return {'request_id': request_id, 'retry_after': retry_after}


@dataclass(frozen=True)
class ResearchApiClient:
    base_url: str
    service_token: str = field(repr=False)
    connect_timeout_seconds: float = 5.0
    read_timeout_seconds: float = 75.0
    retry_attempts: int = 2
    expected_tenant_id: str | None = None

    @property
    def configured(self) -> bool:
        try:
            https_origin(self.base_url)
        except AccessError:
            return False
        return isinstance(self.service_token, str) and bool(self.service_token.strip())

    def health(self) -> dict[str, Any]:
        return self._request('GET', '/health', authenticated=False, read_timeout=5.0)

    def account(self) -> dict[str, Any]:
        if not self.expected_tenant_id:
            raise ResearchApiError('Customer workspace access is not configured.', code='configuration')
        payload = self._request('GET', '/v1/account', read_timeout=5.0)
        if payload.get('tenant_id') != self.expected_tenant_id:
            raise ResearchApiError('Customer workspace verification failed.', code='tenant_mismatch')
        try:
            if (payload.get('unit') != 'admitted_queries'
                    or payload.get('charging_policy') != 'admitted_requests_including_failures'):
                raise ValueError
            result = {'tenant_id': self.expected_tenant_id, 'unit': payload['unit'],
                      'charging_policy': payload['charging_policy']}
            for name in ('minute', 'day'):
                window = payload[name]
                limit, used, remaining = (window[key] for key in ('limit', 'used', 'remaining'))
                if (type(limit) is not int or not 1 <= limit <= 1_000_000
                        or type(used) is not int or not 0 <= used <= 1_000_000
                        or type(remaining) is not int or remaining != max(0, limit - used)):
                    raise ValueError
                reset = datetime.fromisoformat(window['resets_at'].replace('Z', '+00:00'))
                if reset.tzinfo is None or reset.utcoffset() is None:
                    raise ValueError
                result[name] = {'limit': limit, 'used': used, 'remaining': remaining,
                                'resets_at': reset.astimezone(UTC).isoformat()}
            return result
        except (KeyError, TypeError, ValueError, AttributeError, OverflowError):
            raise ResearchApiError('The research service returned invalid allowance information.',
                                   code='invalid_response') from None

    def query(self, input_text: str, *, authorize: Callable[[], bool] | None = None) -> dict[str, Any]:
        text = input_text.strip()
        if not 1 <= len(text) <= 8_000:
            raise ResearchApiError('Question must contain between 1 and 8,000 characters.', code='invalid_input')
        if self.expected_tenant_id is not None:
            self.account()  # Verify actual credential ownership before every research POST.
        if authorize is not None and authorize() is not True:
            raise ResearchApiError('Customer workspace access changed.', code='unauthorized')
        return self._request('POST', '/v1/query', json={'input': text})

    def _request(self, method: str, path: str, *, authenticated: bool = True,
                 json: dict[str, Any] | None = None, read_timeout: float | None = None) -> dict[str, Any]:
        try:
            base_url = https_origin(self.base_url)
        except AccessError:
            raise ResearchApiError('The research API HTTPS origin is not configured.', code='configuration') from None
        headers = {'Accept': 'application/json'}
        if authenticated:
            if not self.service_token:
                raise ResearchApiError('Customer workspace access is not configured.', code='configuration')
            headers['Authorization'] = f'Bearer {self.service_token}'
        timeout = (self.connect_timeout_seconds, read_timeout or self.read_timeout_seconds)
        # POST has no idempotency/replay contract. A timeout or gateway response may follow admission.
        attempts = min(max(self.retry_attempts, 0), 3) + 1 if method == 'GET' else 1
        response = None
        for attempt in range(attempts):
            try:
                response = requests.request(method, f'{base_url}{path}', headers=headers, json=json,
                                            timeout=timeout, allow_redirects=False)
            except requests.RequestException:
                response = None
            else:
                if response.status_code not in {502, 503, 504}:
                    break
            if attempt + 1 < attempts:
                sleep(0.35 * (2 ** attempt))
        if response is None:
            raise ResearchApiError('The request outcome is uncertain. Check allowance before trying again.'
                if method == 'POST' else 'The research service is temporarily unreachable.',
                code='uncertain' if method == 'POST' else 'unavailable', uncertain=method == 'POST') from None
        metadata = _metadata(response)
        status = response.status_code
        if status in {401, 403}:
            raise ResearchApiError('Customer workspace access was rejected.', code='unauthorized', **metadata)
        if status == 429:
            raise ResearchApiError('The research allowance is exhausted.', code='quota', **metadata)
        if not 200 <= status < 300:
            uncertain = method == 'POST' and status >= 500
            raise ResearchApiError('The request may have consumed allowance. Check usage before trying again.'
                if uncertain else 'The research service is temporarily unavailable.',
                code='uncertain' if uncertain else 'unavailable', uncertain=uncertain, **metadata)
        try:
            payload = response.json()
        except (ValueError, requests.JSONDecodeError):
            raise ResearchApiError('The research service returned an invalid response.', code='invalid_response',
                                   uncertain=method == 'POST', **metadata) from None
        if not isinstance(payload, dict):
            raise ResearchApiError('The research service returned an invalid response.', code='invalid_response',
                                   uncertain=method == 'POST', **metadata)
        return payload
