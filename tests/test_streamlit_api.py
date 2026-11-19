import unittest
from unittest.mock import Mock, patch

import requests

from redwood_streamlit.api import ResearchApiClient, ResearchApiError


def account_payload(tenant='tenant-a'):
    return {'tenant_id': tenant, 'unit': 'admitted_queries',
            'charging_policy': 'admitted_requests_including_failures',
            'minute': {'limit': 10, 'used': 2, 'remaining': 8, 'resets_at': '2026-11-16T13:01:00+00:00'},
            'day': {'limit': 200, 'used': 7, 'remaining': 193, 'resets_at': '2026-11-17T00:00:00+00:00'}}


def response(status=200, payload=None, headers=None):
    result = Mock(ok=200 <= status < 300, status_code=status, headers=headers or {})
    result.json.return_value = payload if payload is not None else {'answer': 'result', 'evidence': []}
    return result


class ResearchApiClientTests(unittest.TestCase):
    def test_requires_https(self):
        with self.assertRaisesRegex(ResearchApiError, 'HTTPS'):
            ResearchApiClient('http://localhost:8788', 'token').query('inflation')
        for url in ['https://user:key@api.example.test', 'https://api.example.test?token=secret']:
            self.assertFalse(ResearchApiClient(url, 'token').configured)
        self.assertNotIn('private-key', repr(ResearchApiClient('https://api.example.test', 'private-key')))

    @patch('redwood_streamlit.api.requests.request')
    def test_query_uses_versioned_endpoint_and_server_token(self, request):
        request.return_value = response()
        result = ResearchApiClient('https://api.example.com/', 'service-secret').query(' inflation ')
        self.assertEqual(result['answer'], 'result')
        request.assert_called_once_with('POST', 'https://api.example.com/v1/query',
            headers={'Accept': 'application/json', 'Authorization': 'Bearer service-secret'},
            json={'input': 'inflation'}, timeout=(5.0, 75.0), allow_redirects=False)

    @patch('redwood_streamlit.api.sleep')
    @patch('redwood_streamlit.api.requests.request')
    def test_post_never_retries_gateway_or_transport_failures(self, request, sleep):
        for failure in [response(503), response(502), response(504), requests.Timeout('secret-url'),
                        requests.ConnectionError('secret-header')]:
            request.reset_mock()
            request.side_effect = failure if isinstance(failure, Exception) else None
            request.return_value = failure
            with self.subTest(failure=type(failure).__name__), self.assertRaises(ResearchApiError) as caught:
                ResearchApiClient('https://api.example.test', 'token').query('inflation')
            self.assertEqual(request.call_count, 1)
            self.assertTrue(caught.exception.uncertain)
            self.assertNotIn('secret-', str(caught.exception))
        sleep.assert_not_called()

    @patch('redwood_streamlit.api.sleep')
    @patch('redwood_streamlit.api.requests.request')
    def test_safe_get_retries_transient_failure(self, request, sleep):
        request.side_effect = [response(503), response(payload={'status': 'ok'})]
        self.assertEqual(ResearchApiClient('https://api.example.test', '').health()['status'], 'ok')
        self.assertEqual(request.call_count, 2)
        self.assertEqual(request.call_args.kwargs['timeout'], (5.0, 5.0))
        sleep.assert_called_once_with(0.35)

    @patch('redwood_streamlit.api.requests.request')
    def test_account_verified_before_each_tenant_query(self, request):
        request.side_effect = [response(payload=account_payload()), response(),
                               response(payload=account_payload()), response()]
        client = ResearchApiClient('https://api.example.test', 'token', expected_tenant_id='tenant-a')
        client.query('one')
        client.query('two')
        self.assertEqual([call.args[0] for call in request.call_args_list], ['GET', 'POST', 'GET', 'POST'])

    @patch('redwood_streamlit.api.requests.request')
    def test_wrong_or_malformed_account_never_posts(self, request):
        payloads = [account_payload('tenant-b'), {}, {**account_payload(), 'unit': 'monthly_tokens'},
                    {**account_payload(), 'minute': {'limit': True}},
                    {**account_payload(), 'day': {**account_payload()['day'], 'remaining': 199}},
                    {**account_payload(), 'day': {**account_payload()['day'], 'resets_at': 'invalid'}}]
        for payload in payloads:
            request.reset_mock()
            request.return_value = response(payload=payload)
            with self.subTest(payload=payload), self.assertRaises(ResearchApiError):
                ResearchApiClient('https://api.example.test', 'token', expected_tenant_id='tenant-a').query('private question')
            self.assertEqual([call.args[0] for call in request.call_args_list], ['GET'])

    @patch('redwood_streamlit.api.sleep')
    @patch('redwood_streamlit.api.requests.request')
    def test_quota_is_not_retried_and_error_metadata_is_sanitized(self, request, sleep):
        for retry, reference, expected in [('59', 'a' * 32, 59), ('999999999999', '<script>secret</script>', None),
                                            ('0', 'private-token', None), ('invalid', '', None)]:
            request.reset_mock()
            request.return_value = response(429, headers={'Retry-After': retry, 'X-Request-ID': reference})
            with self.assertRaises(ResearchApiError) as caught:
                ResearchApiClient('https://api.example.test', 'token').query('inflation')
            self.assertEqual(request.call_count, 1)
            self.assertEqual(caught.exception.code, 'quota')
            self.assertEqual(caught.exception.retry_after, expected)
            self.assertNotIn('secret', str(caught.exception))
            self.assertIn(caught.exception.request_id, (None, 'a' * 32))
        sleep.assert_not_called()

    @patch('redwood_streamlit.api.requests.request')
    def test_upstream_error_bodies_and_redirects_not_rendered(self, request):
        for status in (401, 403, 500, 302):
            request.return_value = response(status, payload={'detail': 'private-token-sentinel'})
            with self.assertRaises(ResearchApiError) as caught:
                ResearchApiClient('https://api.example.test', 'token').query('inflation')
            self.assertNotIn('private-token-sentinel', str(caught.exception))
            self.assertFalse(request.call_args.kwargs['allow_redirects'])

    @patch('redwood_streamlit.api.requests.request')
    def test_rejects_oversized_question_before_network(self, request):
        with self.assertRaisesRegex(ResearchApiError, '8,000'):
            ResearchApiClient('https://api.example.test', 'token').query('x' * 8001)
        request.assert_not_called()
