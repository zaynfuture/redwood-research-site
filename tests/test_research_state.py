import unittest

from redwood_streamlit.research_state import begin_operation, current_operation, synchronize


class ResearchStateTests(unittest.TestCase):
    def test_every_scope_change_and_denial_clears_history(self):
        state = {}
        for scope in ['user-a', 'user-b', 'new-tenant', 'rotated-key', 'new-origin', 'legacy', None]:
            state['messages'] = [{'role': 'user', 'content': 'private previous question'}]
            synchronize(state, scope)
            self.assertEqual(state['messages'], [])
        self.assertNotIn('private previous question', repr(state))

    def test_same_scope_preserves_history(self):
        state = {}
        synchronize(state, 'a')
        state['messages'].append({'role': 'user', 'content': 'current question'})
        synchronize(state, 'a')
        self.assertEqual(len(state['messages']), 1)

    def test_delayed_response_rejected_after_identity_change_or_newer_operation(self):
        state = {}
        synchronize(state, 'a')
        old = begin_operation(state, 'a')
        self.assertTrue(current_operation(state, old, 'a'))
        newer = begin_operation(state, 'a')
        self.assertFalse(current_operation(state, old, 'a'))
        self.assertTrue(current_operation(state, newer, 'a'))
        synchronize(state, 'b')
        self.assertFalse(current_operation(state, newer, 'b'))
        self.assertFalse(current_operation(state, newer, 'a'))
        synchronize(state, None)
        self.assertFalse(current_operation(state, newer, None))
