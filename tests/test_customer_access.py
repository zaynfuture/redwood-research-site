import json
import unittest

from redwood_streamlit.access import AccessError, resolve_access


NOW = 1794830400
USER = {'is_logged_in': True, 'iss': 'https://accounts.google.com', 'sub': 'subject-a',
        'exp': NOW + 3600, 'email': 'customer@example.test'}
BINDING = {'issuer': USER['iss'], 'subject': USER['sub'], 'tenant_id': 'tenant-a',
           'credential_setting': 'REDWOOD_TENANT_TOKEN_A', 'enabled': True}


class CustomerAccessTests(unittest.TestCase):
    def resolve(self, user=None, **changes):
        args = dict(auth_enabled=True, mode='tenant', bindings=json.dumps({'version': 1, 'bindings': [BINDING]}),
                    base_url='https://api.example.test', credential_lookup=lambda key: 'private-key-sentinel', now=NOW)
        args.update(changes)
        return resolve_access(USER if user is None else user, **args)

    def test_verified_subject_selects_assigned_server_credential(self):
        result = self.resolve()
        self.assertEqual(result.tenant_id, 'tenant-a')
        self.assertEqual(result.credential, 'private-key-sentinel')
        self.assertNotIn('private-key-sentinel', repr(result))
        self.assertEqual(len(result.scope), 64)
        self.assertNotIn(USER['email'], result.scope)

    def test_missing_expired_or_email_only_identity_denied(self):
        for patch in [{'is_logged_in': False}, {'iss': ''}, {'sub': ''}, {'exp': NOW},
                      {'exp': True}, {'exp': str(NOW + 1)}, {'exp': None}, {'sub': 'someone-else'}]:
            with self.subTest(patch=patch), self.assertRaises(AccessError):
                self.resolve({**USER, **patch})
        with self.assertRaises(AccessError):
            self.resolve({'is_logged_in': True, 'email': USER['email']})

    def test_tenant_mode_ignores_legacy_bypasses(self):
        for kwargs in [dict(auth_enabled=False), dict(bindings=''),
                       dict(credential_lookup=lambda _: ''), dict(mode='unknown')]:
            with self.subTest(kwargs=kwargs), self.assertRaises(AccessError):
                self.resolve(legacy_token='legacy-secret', allow_all=True,
                             authorized_emails=USER['email'], **kwargs)
        with self.assertRaises(AccessError):
            self.resolve({**USER, 'sub': 'wrong'}, allow_all=True, authorized_emails=USER['email'])

    def test_strict_bindings_duplicates_and_conflicting_mapping(self):
        bad = [{**BINDING, 'enabled': 'true'}, {**BINDING, 'credential_setting': 'REDWOOD_API_SERVICE_TOKEN'},
               {**BINDING, 'tenant_id': '../owner'}, {**BINDING, 'extra': 1},
               {**BINDING, 'issuer': 'https://user:secret@accounts.google.com'}]
        for row in bad:
            with self.subTest(row=row), self.assertRaises(AccessError):
                self.resolve(bindings=json.dumps({'version': 1, 'bindings': [row]}))
        for rows in [[BINDING, BINDING],
                     [BINDING, {**BINDING, 'subject': 'b', 'credential_setting': 'REDWOOD_TENANT_TOKEN_B'}],
                     [BINDING, {**BINDING, 'subject': 'b', 'tenant_id': 'tenant-b'}]]:
            with self.assertRaises(AccessError):
                self.resolve(bindings=json.dumps({'version': 1, 'bindings': rows}))
        for raw in ['{"version":1,"version":1,"bindings":[]}', '{invalid', '{"version": NaN,"bindings":[]}']:
            with self.assertRaises(AccessError):
                self.resolve(bindings=raw)

    def test_shared_tenant_members_allowed_but_disabled_identity_denied(self):
        rows = [BINDING, {**BINDING, 'subject': 'b'}]
        result = self.resolve({**USER, 'sub': 'b'}, bindings=json.dumps({'version': 1, 'bindings': rows}))
        self.assertEqual(result.tenant_id, 'tenant-a')
        with self.assertRaises(AccessError):
            self.resolve(bindings=json.dumps({'version': 1, 'bindings': [{**BINDING, 'enabled': False}]}))

    def test_scope_changes_for_identity_origin_credential_and_mode(self):
        first = self.resolve()
        changed = [self.resolve(base_url='https://other.example.test'),
                   self.resolve(credential_lookup=lambda _: 'rotated-key-sentinel'),
                   self.resolve(mode='legacy', legacy_token='private-key-sentinel', allow_all=True)]
        self.assertTrue(all(result.scope != first.scope for result in changed))
        for url in ['http://api.example.test', 'https://user:key@api.example.test',
                    'https://api.example.test/path', 'https://api.example.test?key=secret']:
            with self.subTest(url=url), self.assertRaises(AccessError):
                self.resolve(base_url=url)

    def test_legacy_compatibility(self):
        self.assertEqual(self.resolve(mode='legacy', allow_all=True, legacy_token='old-key').mode, 'legacy')
        self.assertEqual(self.resolve(mode='legacy', authorized_emails=USER['email'], legacy_token='old-key').mode, 'legacy')
        self.assertEqual(self.resolve({}, mode='legacy', auth_enabled=False, legacy_token='old-key').mode, 'legacy')
        with self.assertRaises(AccessError):
            self.resolve(mode='legacy', authorized_emails='other@example.test')
