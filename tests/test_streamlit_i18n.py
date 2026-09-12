import unittest

from redwood_streamlit.i18n import SUPPORTED_LANGUAGES, translate


class TranslationTests(unittest.TestCase):
    def test_supported_languages_have_core_navigation(self):
        for language in SUPPORTED_LANGUAGES:
            self.assertNotEqual(translate(language, "nav.home"), "nav.home")
            self.assertNotEqual(translate(language, "research.input"), "research.input")

    def test_unknown_language_falls_back_to_english(self):
        self.assertEqual(
            translate("unknown", "nav.home"),
            translate("en", "nav.home"),
        )

    def test_interpolation(self):
        self.assertIn("3", translate("zh", "research.evidence", count=3))


if __name__ == "__main__":
    unittest.main()
