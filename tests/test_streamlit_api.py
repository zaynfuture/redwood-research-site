import unittest
from unittest.mock import Mock, patch

from redwood_streamlit.api import ResearchApiClient, ResearchApiError


class ResearchApiClientTests(unittest.TestCase):
    def test_requires_https(self):
        client = ResearchApiClient("http://localhost:8788", "token")
        with self.assertRaisesRegex(ResearchApiError, "HTTPS"):
            client.query("inflation")

    @patch("redwood_streamlit.api.requests.request")
    def test_query_uses_versioned_endpoint_and_server_token(self, request: Mock):
        response = Mock(ok=True, status_code=200)
        response.json.return_value = {"answer": "result", "evidence": []}
        request.return_value = response
        client = ResearchApiClient("https://api.example.com/", "service-secret")

        result = client.query(" inflation ")

        self.assertEqual(result["answer"], "result")
        request.assert_called_once_with(
            "POST",
            "https://api.example.com/v1/query",
            headers={"Accept": "application/json", "Authorization": "Bearer service-secret"},
            json={"input": "inflation"},
            timeout=60.0,
            allow_redirects=False,
        )

    def test_rejects_oversized_question_before_network(self):
        client = ResearchApiClient("https://api.example.com", "token")
        with self.assertRaisesRegex(ResearchApiError, "8,000"):
            client.query("x" * 8_001)


if __name__ == "__main__":
    unittest.main()
