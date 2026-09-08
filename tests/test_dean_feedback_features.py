import unittest
from analyzer.config import (
    CAPSTONE_COURSES,
    CROSS_LISTED_COURSES,
    TIER_EXPECTATIONS,
    SCHOOL_METADATA,
)
from analyzer.parser import SectionRecord, RegistrarParser
from analyzer.metrics import MetricsEngine
from analyzer.roster_manager import parse_tier_to_sections


class TestDeanFeedbackFeatures(unittest.TestCase):

    def test_tier_expectations(self):
        """Verify MOA/Courtesy is 0.0 and Adjunct/Chair is 0.5."""
        self.assertEqual(TIER_EXPECTATIONS['moa_courtesy'], 0.0)
        self.assertEqual(TIER_EXPECTATIONS['adjunct_chair'], 0.5)
        self.assertEqual(parse_tier_to_sections('MOA / Courtesy (0.0 secs)'), 0.0)
        self.assertEqual(parse_tier_to_sections('Adjunct / Chair (0.5 secs)'), 0.5)
        self.assertEqual(parse_tier_to_sections('adjunct_chair'), 0.5)
        self.assertEqual(parse_tier_to_sections('moa'), 0.0)

    def test_capstone_registry_and_properties(self):
        """Verify whitelist and properties correctly identify Capstones without false positives."""
        self.assertIn(('AEROENGR', '480'), CAPSTONE_COURSES)
        self.assertIn(('AEROENGR', '481'), CAPSTONE_COURSES)
        self.assertIn(('MECHENGR', '491'), CAPSTONE_COURSES)

        # Verified capstone in whitelist
        s_cap = SectionRecord(
            file_source="test.csv", term="Fall 2025", class_nbr="1001",
            subject="AEROENGR", course_number="480", course_title="INTRO TO AIRCRAFT ENG DESIGN",
            section_code="M1A", credit_units=3.0, instructors=["Smith, John A"]
        )
        self.assertTrue(s_cap.is_capstone)

        # Capstone identified by title
        s_title = SectionRecord(
            file_source="test.csv", term="Fall 2025", class_nbr="1002",
            subject="SYSENGR", course_number="491", course_title="SYS ENGR SENIOR DESIGN",
            section_code="T1A", credit_units=3.0, instructors=["Smith, John A"]
        )
        self.assertTrue(s_title.is_capstone)

        # Regular course with 491 number (not a capstone)
        s_regular = SectionRecord(
            file_source="test.csv", term="Fall 2025", class_nbr="1003",
            subject="CHEM", course_number="491", course_title="BIOCHEMISTRY LAB TECHNIQUES",
            section_code="W1A", credit_units=3.0, instructors=["Smith, John A"]
        )
        self.assertFalse(s_regular.is_capstone)

    def test_499_property(self):
        """Verify is_499 flag accurately detects independent study."""
        s_499 = SectionRecord(
            file_source="test.csv", term="Fall 2025", class_nbr="2001",
            subject="ENGLISH", course_number="499", course_title="INDEPENDENT STUDY",
            section_code="IS1", credit_units=3.0, instructors=["Doe, Jane B"]
        )
        self.assertTrue(s_499.is_499)

        s_regular = SectionRecord(
            file_source="test.csv", term="Fall 2025", class_nbr="2002",
            subject="ENGLISH", course_number="111", course_title="INTRODUCTORY COMPOSITION",
            section_code="M1A", credit_units=3.0, instructors=["Doe, Jane B"]
        )
        self.assertFalse(s_regular.is_499)

    def test_cross_listed_merge(self):
        """Verify cross-listed sections meeting in same period are merged."""
        parser = RegistrarParser()
        s1 = SectionRecord(
            file_source="f.csv", term="Fall 2025", class_nbr="3001",
            subject="MECHENGR", course_number="332", course_title="AEROSPACE STRUCTURES",
            section_code="M2A", credit_units=3.0, instructors=["Scott, Emily R"],
            cadet_ids={"C1", "C2", "C3", "C4", "C5", "C6", "C7"}
        )
        s2 = SectionRecord(
            file_source="f.csv", term="Fall 2025", class_nbr="3002",
            subject="AEROENGR", course_number="436", course_title="AIRCRAFT STRUCTURAL DYNAMICS",
            section_code="M2A", credit_units=3.0, instructors=["Scott, Emily R"],
            cadet_ids={"C8", "C9", "C10", "C11", "C12", "C13", "C14", "C15", "C16"}
        )
        parser.sections = {("Fall 2025", "3001"): s1, ("Fall 2025", "3002"): s2}

        # Before merge: each section is sub-10 (< 10) or 9 cadets
        self.assertTrue(s1.is_sub10)
        self.assertTrue(s2.is_sub10)

        merged = parser.merge_cross_listed_sections()
        self.assertEqual(merged, 1)
        self.assertEqual(len(parser.sections), 1)

        merged_sec = list(parser.sections.values())[0]
        self.assertEqual(merged_sec.cadet_count, 16)
        self.assertFalse(merged_sec.is_sub10)
        self.assertIn("Cross-Listed", merged_sec.course_title)

    def test_multi_mode_computation(self):
        """Verify compute_all_modes returns core, no_capstones, no_499s, and all snapshots."""
        s_reg = SectionRecord(
            file_source="f.csv", term="Fall 2025", class_nbr="4001",
            subject="AEROENGR", course_number="210", course_title="INTRO TO AERONAUTICS",
            section_code="M1A", credit_units=3.0, instructors=["Smith, John A"],
            cadet_ids={f"C{i}" for i in range(15)}
        )
        s_cap = SectionRecord(
            file_source="f.csv", term="Fall 2025", class_nbr="4002",
            subject="AEROENGR", course_number="480", course_title="INTRO TO AIRCRAFT DESIGN",
            section_code="M2A", credit_units=3.0, instructors=["Smith, John A"],
            cadet_ids={f"C{i}" for i in range(8)}
        )
        s_499 = SectionRecord(
            file_source="f.csv", term="Fall 2025", class_nbr="4003",
            subject="AEROENGR", course_number="499", course_title="INDEPENDENT STUDY",
            section_code="IS1", credit_units=3.0, instructors=["Smith, John A"],
            cadet_ids={"C100"}
        )

        engine = MetricsEngine([s_reg, s_cap, s_499], cadets={})
        results = engine.compute_all_modes()

        self.assertEqual(results['default_mode'], 'core')
        modes = results['modes']
        self.assertIn('core', modes)
        self.assertIn('no_capstones', modes)
        self.assertIn('no_499s', modes)
        self.assertIn('all', modes)

        # Core excludes both capstone and 499
        self.assertEqual(modes['core']['institution_kpis']['total_sections'], 1)
        # No capstones keeps 499
        self.assertEqual(modes['no_capstones']['institution_kpis']['total_sections'], 2)
        # No 499s keeps capstone
        self.assertEqual(modes['no_499s']['institution_kpis']['total_sections'], 2)
        # All keeps everything
        self.assertEqual(modes['all']['institution_kpis']['total_sections'], 3)

        # Master sections_audit retains all 3 sections with flags
        audit = results['sections_audit']
        self.assertEqual(len(audit), 3)
        cap_audit = [a for a in audit if a['class_nbr'] == '4002'][0]
        self.assertTrue(cap_audit['is_capstone'])
        study_audit = [a for a in audit if a['class_nbr'] == '4003'][0]
        self.assertTrue(study_audit['is_499'])


if __name__ == '__main__':
    unittest.main()
