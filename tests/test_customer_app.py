"""Exercise real Streamlit page functions with synthetic identity and in-memory transport."""
import json
import time
import unittest
from unittest.mock import Mock, patch

from streamlit.testing.v1 import AppTest

from test_streamlit_api import account_payload, response


class NativeUser:
    def __init__(self):
        self.claims = {'is_logged_in': True, 'iss': 'https://accounts.google.com',
                       'sub': 'subject-a', 'exp': int(time.time()) + 3600, 'email': 'a@example.test'}

    def to_dict(self):
        return dict(self.claims)

    def __getattr__(self, name):
        return self.claims.get(name)


class CustomerApplicationTests(unittest.TestCase):
    def setUp(self):
        self.user = NativeUser()
        self.binding = {'issuer': self.user.iss, 'subject': 'subject-a', 'tenant_id': 'tenant-a',
                        'credential_setting': 'REDWOOD_TENANT_TOKEN_A', 'enabled': True}
        self.settings = {'AUTH_ENABLED': True, 'REDWOOD_ACCESS_MODE': 'tenant',
                         'REDWOOD_API_BASE_URL': 'https://api.example.test',
                         'REDWOOD_CUSTOMER_BINDINGS': json.dumps({'version': 1, 'bindings': [self.binding]}),
                         'REDWOOD_TENANT_TOKEN_A': 'private-key-sentinel'}
        self.patches = [patch('streamlit.user', self.user),
                        patch('redwood_streamlit.settings.setting', side_effect=lambda name, default=None: self.settings.get(name, default)),
                        patch('streamlit.navigation', return_value=Mock()),
                        patch('redwood_streamlit.api.requests.request', side_effect=self.transport)]
        self.mocks = [item.start() for item in self.patches]
        for item in self.patches:
            self.addCleanup(item.stop)
        # Keep the actual app source and page renderer, bypass navigation selection only.
        self.app = AppTest.from_string("import runpy\nmodule = runpy.run_path('streamlit_app.py')\nmodule['page_research']()", default_timeout=10)
        self.app.session_state['language'] = 'en'

    def transport(self, method, url, **kwargs):
        if url.endswith('/health'):
            return response(payload={'status': 'ok'})
        if url.endswith('/v1/account'):
            return response(payload=account_payload())
        return response(payload={'answer': 'Synthetic verified answer', 'evidence': [], 'gaps': [],
                                 'estimated_tokens': 12, 'observation_id': 'synthetic-observation'})

    def run_app(self):
        self.app.run()
        self.assertEqual(len(self.app.exception), 0, str(self.app.exception))

    def test_usage_rendered_and_secret_never_rendered(self):
        self.run_app()
        self.assertEqual([metric.value for metric in self.app.metric], ['2 / 10', '7 / 200'])
        self.assertTrue(self.app.chat_input)
        self.app.chat_input[0].set_value('Synthetic question').run()
        self.assertEqual(len(self.app.exception), 0)
        self.assertEqual(len(self.app.session_state['messages']), 2)
        visible = ' '.join(element.value for name in ('markdown', 'caption', 'error', 'warning')
                           for element in getattr(self.app, name))
        self.assertIn('Synthetic verified answer', visible)
        self.assertNotIn('private-key-sentinel', visible)
        self.assertNotIn('private-key-sentinel', repr(self.app.session_state.filtered_state))

    def test_identity_expiry_binding_and_credential_changes_clear_history(self):
        self.run_app()
        for change in ('identity', 'expiration', 'binding', 'credential'):
            self.user.claims.update(sub='subject-a', exp=int(time.time()) + 3600)
            self.settings['REDWOOD_CUSTOMER_BINDINGS'] = json.dumps({'version': 1, 'bindings': [self.binding]})
            self.run_app()
            self.app.session_state['messages'] = [{'role': 'assistant', 'content': 'old-private-history'}]
            if change == 'identity':
                self.user.claims['sub'] = 'subject-b'
            elif change == 'expiration':
                self.user.claims['exp'] = 1
            elif change == 'binding':
                self.settings['REDWOOD_CUSTOMER_BINDINGS'] = json.dumps({'version': 1, 'bindings': [{**self.binding, 'enabled': False}]})
            else:
                self.settings['REDWOOD_TENANT_TOKEN_A'] = 'rotated-key-sentinel'
            self.run_app()
            self.assertEqual(self.app.session_state['messages'], [])
            self.assertFalse(any('old-private-history' in item.value for item in self.app.markdown))

    def test_wrong_backend_account_blocks_history_and_chat(self):
        self.run_app()
        self.app.session_state['messages'] = [{'role': 'assistant', 'content': 'old-private-history'}]
        self.mocks[-1].side_effect = lambda method, url, **kw: response(payload=account_payload('wrong-tenant'))
        self.run_app()
        self.assertFalse(self.app.chat_input)
        self.assertEqual(self.app.session_state['messages'], [])
        self.assertTrue(self.app.error)

    def test_logout_clears_history_before_native_logout(self):
        self.run_app()
        self.app.session_state['messages'] = [{'role': 'assistant', 'content': 'old-private-history'}]
        def logout():
            self.assertEqual(self.app.session_state['messages'], [])
            self.user.claims['is_logged_in'] = False
        with patch('streamlit.logout', side_effect=logout) as native_logout:
            next(button for button in self.app.sidebar.button if button.label == 'Sign out').click().run()
            native_logout.assert_called_once()
        self.assertEqual(self.app.session_state['messages'], [])

    def test_late_answer_is_not_rendered_after_binding_revocation(self):
        self.run_app()
        def transport(method, url, **kwargs):
            if method == 'POST':
                self.settings['REDWOOD_CUSTOMER_BINDINGS'] = json.dumps({'version': 1, 'bindings': [{**self.binding, 'enabled': False}]})
                return response(payload={'answer': 'late-private-sentinel', 'evidence': []})
            return self.transport(method, url, **kwargs)
        self.mocks[-1].side_effect = transport
        self.app.chat_input[0].set_value('Synthetic question').run()
        self.assertEqual(len(self.app.exception), 0)
        self.assertFalse(any('late-private-sentinel' in item.value for item in self.app.markdown))
        self.assertEqual(self.app.session_state['messages'], [])

    def test_access_change_during_account_verification_prevents_research_post(self):
        for change in ('expiration', 'binding', 'credential'):
            with self.subTest(change=change):
                self.user.claims['exp'] = int(time.time()) + 3600
                self.settings['REDWOOD_CUSTOMER_BINDINGS'] = json.dumps({'version': 1, 'bindings': [self.binding]})
                self.settings['REDWOOD_TENANT_TOKEN_A'] = 'private-key-sentinel'
                self.mocks[-1].side_effect = self.transport
                self.run_app()
                accounts, posts = [], []
                def transport(method, url, **kwargs):
                    if url.endswith('/v1/account'):
                        accounts.append(url)
                        if len(accounts) == 2:
                            if change == 'expiration':
                                self.user.claims['exp'] = 1
                            elif change == 'binding':
                                self.settings['REDWOOD_CUSTOMER_BINDINGS'] = json.dumps({'version': 1, 'bindings': [{**self.binding, 'enabled': False}]})
                            else:
                                self.settings['REDWOOD_TENANT_TOKEN_A'] = 'rotated-key-sentinel'
                    if method == 'POST':
                        posts.append(url)
                    return self.transport(method, url, **kwargs)
                self.mocks[-1].side_effect = transport
                self.app.chat_input[0].set_value('Synthetic question').run()
                self.assertEqual(len(self.app.exception), 0)
                self.assertEqual(len(accounts), 2)
                self.assertEqual(posts, [])
                self.assertEqual(self.app.session_state['messages'], [])
