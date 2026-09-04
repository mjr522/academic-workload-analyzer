import sys
sys.path.insert(0, '.')

import unittest
from analyzer.name_resolver import CanonicalNameResolver, extract_name_components, are_names_compatible
from analyzer.parser import SectionRecord, CadetRecord
from analyzer.metrics import MetricsEngine
from analyzer.roster_manager import RosterManager, RosterEntry

class TestCanonicalNameResolver(unittest.TestCase):
    def test_name_compatibility(self):
        # Compatible cases
        self.assertTrue(are_names_compatible(
            extract_name_components("Doe, Jane"),
            extract_name_components("Doe, Jane B")
        ))
        self.assertTrue(are_names_compatible(
            extract_name_components("Doe, Jane"),
            extract_name_components("Doe, Jane Beth")
        ))
        self.assertTrue(are_names_compatible(
            extract_name_components("Doe, Jane B."),
            extract_name_components("Doe, Jane B")
        ))
        self.assertTrue(are_names_compatible(
            extract_name_components("Smith, John Jr."),
            extract_name_components("Smith, John")
        ))
        self.assertTrue(are_names_compatible(
            extract_name_components("Smith Jr., John A"),
            extract_name_components("Smith, John A")
        ))
        self.assertTrue(are_names_compatible(
            extract_name_components("Brown, Robert III"),
            extract_name_components("Brown, Robert")
        ))

        # Incompatible cases
        self.assertFalse(are_names_compatible(
            extract_name_components("Smith, John A"),
            extract_name_components("Smith, John B")
        ))
        self.assertFalse(are_names_compatible(
            extract_name_components("Smith, John Jr."),
            extract_name_components("Smith, John Sr.")
        ))
        self.assertFalse(are_names_compatible(
            extract_name_components("Smith, Jane"),
            extract_name_components("Smith, John")
        ))

    def test_resolver_with_official_roster(self):
        official = ["Doe, Jane B", "Smith, John Jr.", "Taylor, Chris M"]
        resolver = CanonicalNameResolver(official_roster_names=official)

        # Should resolve variations to official roster name
        self.assertEqual(resolver.resolve("Doe, Jane"), "Doe, Jane B")
        self.assertEqual(resolver.resolve("Doe, Jane B"), "Doe, Jane B")
        self.assertEqual(resolver.resolve("Smith, John"), "Smith, John Jr.")
        self.assertEqual(resolver.resolve("Smith Jr., John"), "Smith, John Jr.")

    def test_resolver_without_roster_cluster(self):
        resolver = CanonicalNameResolver()

        # Discovered in data: first 'Doe, Jane', then 'Doe, Jane B'
        r1 = resolver.resolve("Doe, Jane")
        self.assertEqual(r1, "Doe, Jane")

        # Upgrade to more complete name
        r2 = resolver.resolve("Doe, Jane B")
        self.assertEqual(r2, "Doe, Jane B")

        # Re-checking 'Doe, Jane' should now return the upgraded canonical name!
        self.assertEqual(resolver.resolve("Doe, Jane"), "Doe, Jane B")

    def test_metrics_engine_deduplication(self):
        # Create two sections taught by 'Doe, Jane' and 'Doe, Jane B'
        s1 = SectionRecord(
            file_source='test', term='2251', class_nbr='101', subject='MECHENG',
            course_number='101', course_title='Statics', section_code='M1',
            credit_units=3.0, instructors=['Doe, Jane'], cadet_ids={'C1', 'C2'},
            section_weight=1.0, cadet_weight=1.0, weight_type='Full Semester'
        )
        s2 = SectionRecord(
            file_source='test', term='2258', class_nbr='102', subject='MECHENG',
            course_number='102', course_title='Dynamics', section_code='T1',
            credit_units=3.0, instructors=['Doe, Jane B'], cadet_ids={'C3', 'C4'},
            section_weight=1.0, cadet_weight=1.0, weight_type='Full Semester'
        )

        roster_mgr = RosterManager()
        # Add official entry for Doe, Jane B
        roster_mgr.roster["Doe, Jane B"] = RosterEntry(
            faculty_name="Doe, Jane B",
            department_code="ESME"
        )

        engine = MetricsEngine([s1, s2], cadets={}, roster_manager=roster_mgr)
        results = engine.compute_all_metrics()

        # Should only have 1 faculty member total!
        fac_dir = results['faculty_directory']
        self.assertEqual(len(fac_dir), 1)
        doe = fac_dir[0]
        self.assertEqual(doe['instructor'], "Doe, Jane B")
        self.assertEqual(doe['weighted_sections'], 2.0)
        self.assertEqual(doe['cadet_load_allocated'], 4.0)

    def test_non_teaching_roster_faculty_eliminated(self):
        """Verify faculty present in official roster but teaching 0 sections are excluded."""
        s1 = SectionRecord(
            file_source='test', term='2251', class_nbr='101', subject='MECHENG',
            course_number='101', course_title='Statics', section_code='M1',
            credit_units=3.0, instructors=['Doe, Jane B'], cadet_ids={'C1', 'C2'},
            section_weight=1.0, cadet_weight=1.0, weight_type='Full Semester'
        )

        roster_mgr = RosterManager()
        # Active faculty teaching s1
        roster_mgr.roster["Doe, Jane B"] = RosterEntry(
            faculty_name="Doe, Jane B",
            department_code="ESME"
        )
        # Inactive / former faculty in official roster with 0 teaching assignments
        roster_mgr.roster["Ghost, Casper"] = RosterEntry(
            faculty_name="Ghost, Casper",
            department_code="ESME"
        )
        roster_mgr.roster["Retired, Professor"] = RosterEntry(
            faculty_name="Retired, Professor",
            department_code="ESME"
        )

        engine = MetricsEngine([s1], cadets={}, roster_manager=roster_mgr)
        results = engine.compute_all_metrics()

        # Ghost and Retired must NOT appear in faculty directory
        fac_dir = results['faculty_directory']
        self.assertEqual(len(fac_dir), 1)
        self.assertEqual(fac_dir[0]['instructor'], "Doe, Jane B")

        # Department faculty count must only reflect active teaching faculty
        esme_dept = [d for d in results['departments'] if d['dept_code'] == 'ESME'][0]
        self.assertEqual(esme_dept['faculty_count'], 1)

if __name__ == '__main__':
    unittest.main()
