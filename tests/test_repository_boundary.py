"""Executable separation between the Site presentation client and Redwood Research domain logic."""
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]


class RepositoryBoundaryTests(unittest.TestCase):
    def test_browser_model_does_not_reimplement_volume_profile_algorithms(self):
        model = (ROOT / 'assets/volume-profile/model.js').read_text()
        for forbidden in (
            'weightedLowerUnits', 'maxVolume', 'while (included',
            'included * 10 < totalShares * 7', 'volume / totalShares * 100',
        ):
            with self.subTest(forbidden=forbidden):
                self.assertNotIn(forbidden, model)
        self.assertIn('doc.analysis', model)
        self.assertIn('volume_distribution', model)

    def test_controller_renders_backend_analysis_without_bin_classification(self):
        controller = (ROOT / 'assets/volume-profile/app.js').read_text()
        for forbidden in ('for(const b of p.bins)split', 'position=b=>', 'split[i]/p.totalShares'):
            with self.subTest(forbidden=forbidden):
                self.assertNotIn(forbidden, controller)
        self.assertIn('analysis.distribution', controller)
        self.assertIn('analysis.position', controller)

    def test_research_transport_is_bounded_and_does_not_rewrite_results(self):
        transport = (ROOT / 'lib/api/backend.ts').read_text()
        for required in ('https:', 'AbortSignal.timeout', 'maxResponseBytes', 'content-type'):
            with self.subTest(required=required):
                self.assertIn(required, transport)
        for forbidden in ('FORBIDDEN_KEYS', 'publicResult', 'chain_of_thought', 'Object.fromEntries'):
            with self.subTest(forbidden=forbidden):
                self.assertNotIn(forbidden, transport)


if __name__ == '__main__':
    unittest.main()
