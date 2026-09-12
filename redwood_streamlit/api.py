"""Server-side client for the versioned Redwood Research API."""

from __future__ import annotations

from dataclasses import dataclass
from time import sleep
from typing import Any

import requests


class ResearchApiError(RuntimeError):
    """A safe, user-displayable API failure."""


@dataclass(frozen=True)
class ResearchApiClient:
    base_url: str
    service_token: str
    connect_timeout_seconds: float = 5.0
    read_timeout_seconds: float = 75.0
    retry_attempts: int = 2

    @property
    def configured(self) -> bool:
        return self.base_url.startswith("https://") and bool(self.service_token)

    def health(self) -> dict[str, Any]:
        return self._request("GET", "/health", authenticated=False, read_timeout=5.0)

    def query(self, input_text: str) -> dict[str, Any]:
        text = input_text.strip()
        if not 1 <= len(text) <= 8_000:
            raise ResearchApiError("Question must contain between 1 and 8,000 characters.")
        return self._request("POST", "/v1/query", json={"input": text})

    def _request(
        self,
        method: str,
        path: str,
        *,
        authenticated: bool = True,
        json: dict[str, Any] | None = None,
        read_timeout: float | None = None,
    ) -> dict[str, Any]:
        if not self.base_url.startswith("https://"):
            raise ResearchApiError("The research API HTTPS URL is not configured.")
        headers = {"Accept": "application/json"}
        if authenticated:
            if not self.service_token:
                raise ResearchApiError("The research API service token is not configured.")
            headers["Authorization"] = f"Bearer {self.service_token}"
        url = f"{self.base_url.rstrip('/')}{path}"
        timeout = (self.connect_timeout_seconds, read_timeout or self.read_timeout_seconds)
        response = None
        last_error: requests.RequestException | None = None
        for attempt in range(self.retry_attempts + 1):
            try:
                response = requests.request(
                    method,
                    url,
                    headers=headers,
                    json=json,
                    timeout=timeout,
                    allow_redirects=False,
                )
            except requests.RequestException as exc:
                last_error = exc
            else:
                if response.status_code not in {429, 502, 503, 504}:
                    break
            if attempt < self.retry_attempts:
                sleep(0.35 * (2**attempt))
        if response is None:
            raise ResearchApiError("The research service is temporarily unreachable.") from last_error
        if response.status_code == 401:
            raise ResearchApiError("The research service rejected its server credential.")
        if response.status_code in {429, 502, 503, 504}:
            raise ResearchApiError("The research service is waking up or temporarily busy. Please reconnect shortly.")
        if not response.ok:
            raise ResearchApiError(f"The research service returned HTTP {response.status_code}.")
        try:
            payload = response.json()
        except requests.JSONDecodeError as exc:
            raise ResearchApiError("The research service returned an invalid response.") from exc
        if not isinstance(payload, dict):
            raise ResearchApiError("The research service returned an invalid response.")
        return payload
