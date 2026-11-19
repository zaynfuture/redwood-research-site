"""Check packaged local data, script boundaries and the public Streamlit entry point."""
from html.parser import HTMLParser
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock, patch

from streamlit.testing.v1 import AppTest

from redwood_streamlit import volume_profile
from redwood_streamlit.i18n import SUPPORTED_LANGUAGES, translate


class Document(HTMLParser):
    def __init__(self, markup):
        super().__init__()
        self.attributes = {}
        self.initial = None
        self.scripts = []
        self._in_script = False
        self.feed(markup)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "html":
            self.attributes = attrs
        if tag == "script":
            self._in_script = True
            self.scripts.append((attrs, []))

    def handle_endtag(self, tag):
        if tag == "script":
            self._in_script = False

    def handle_data(self, data):
        if self._in_script:
            self.scripts[-1][1].append(data)

    def initial_payload(self):
        blocks = [s for a, s in self.scripts if a.get("id") == "profile-initial"]
        if len(blocks) != 1:
            raise AssertionError("Expected one initial data block")
        return json.loads("".join(blocks[0]))


class VolumeProfilePageTests(unittest.TestCase):
    def test_static_demo_and_local_override_are_separate_documents(self):
        with tempfile.TemporaryDirectory() as temporary:
            assets = Path(temporary)
            (assets / "index.html").write_text(
                '<html lang="zh-CN"><head><!-- PROFILE_STYLE --></head>'
                '<body><!-- PROFILE_INITIAL --><!-- SYMBOL_DIRECTORY --><!-- PROFILE_SCRIPTS --></body></html>'
            )
            (assets / "style.css").write_text("body { margin: 0 }")
            (assets / "site-header.css").write_text(".site-header { color: red }")
            for name in ("model", "chart", "app"):
                (assets / f"{name}.js").write_text(f"/* {name} */")
            (assets / "demo.json").write_text('{"demo":true,"documents":[]}')
            (assets / "symbols.json").write_text('{"asOf":"2026-11-19","symbols":[]}')
            # Angle brackets in a data field must round-trip as text rather than change HTML markup.
            value = {"demo": False, "names": {"TEST": "A < B & C </script> <!-- PROFILE_SCRIPTS -->"}}
            with patch.object(volume_profile, "_ASSETS", assets):
                actual = Document(volume_profile.build_volume_profile_html(value, language="en"))
                demo = Document(volume_profile.build_volume_profile_html(language="zh"))
        self.assertEqual(actual.initial_payload(), value)
        self.assertEqual(len(actual.scripts), 5)
        self.assertEqual(actual.attributes["lang"], "en")
        self.assertTrue(demo.initial_payload()["demo"])
        self.assertEqual(demo.attributes["lang"], "zh-CN")

    def test_public_route_is_present_in_locales_and_renders_only_demo(self):
        # Run the actual page registered by navigation, selecting the new route for this session.
        def select_page(pages):
            selected = next(page for page in pages if page.url_path == "volume-profile")
            return Mock(run=selected._page)

        def local_setting(_name, default=None):
            return default

        for locale in SUPPORTED_LANGUAGES:
            with self.subTest(locale=locale):
                app = AppTest.from_file(str(Path(__file__).resolve().parents[1] / "streamlit_app.py"))
                app.session_state["language"] = locale
                with (
                    patch("streamlit.navigation", side_effect=select_page),
                    patch("redwood_streamlit.settings.setting", side_effect=local_setting),
                    patch("redwood_streamlit.volume_profile.build_volume_profile_html", return_value="<p>Demo</p>") as render,
                ):
                    app.run()
                self.assertFalse(list(app.exception), str(app.exception))
                self.assertNotEqual(translate(locale, "nav.volume_profile"), "nav.volume_profile")
                render.assert_called_once_with(language=locale)

    def test_packaged_page_has_a_synthetic_initial_dataset(self):
        document = Document(volume_profile.build_volume_profile_html())
        self.assertTrue(document.initial_payload()["demo"])
        self.assertTrue(document.initial_payload()["documents"])
        self.assertFalse(any("src" in attributes for attributes, _ in document.scripts))
