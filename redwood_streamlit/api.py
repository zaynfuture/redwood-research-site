"""Server-side client for the versioned Redwood Research API."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import requests


class ResearchApiError(RuntimeError):
    """A safe, user-displayable API failure."""


@dataclass(frozen=True)
class ResearchApiClient:
    base_url: str
    service_token: str
    timeout_seconds: float = 60.0

    @property
    def configured(self) -> bool:
        return self.base_url.startswith("https://") and bool(self.service_token)

    def health(self) -> dict[str, Any]:
        return self._request("GET", "/health", authenticated=False)

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
    ) -> dict[str, Any]:
        if not self.base_url.startswith("https://"):
            raise ResearchApiError("The research API HTTPS URL is not configured.")
        headers = {"Accept": "application/json"}
        if authenticated:
            if not self.service_token:
                raise ResearchApiError("The research API service token is not configured.")
            headers["Authorization"] = f"Bearer {self.service_token}"
        try:
            response = requests.request(
                method,
                f"{self.base_url.rstrip('/')}{path}",
                headers=headers,
                json=json,
                timeout=self.timeout_seconds,
                allow_redirects=False,
            )
        except requests.RequestException as exc:
            raise ResearchApiError("The research service is temporarily unreachable.") from exc
        if response.status_code == 401:
            raise ResearchApiError("The research service rejected its server credential.")
        if not response.ok:
            raise ResearchApiError(f"The research service returned HTTP {response.status_code}.")
        try:
            payload = response.json()
        except requests.JSONDecodeError as exc:
            raise ResearchApiError("The research service returned an invalid response.") from exc
        if not isinstance(payload, dict):
            raise ResearchApiError("The research service returned an invalid response.")
        return payload
