"""
Unit Tests for Multi-School Architecture and Cross-School Analytics
-------------------------------------------------------------------
Verifies:
1. School metadata integrity (SINE, SIBS, HASS).
2. Department aliasing (DFxx, ESxx, BSxx/SIxx, HSxx).
3. Hierarchical metrics aggregation across schools and institution KPIs.
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from analyzer.config import (
    SCHOOL_METADATA,
    DEFAULT_DEPARTMENT_MAPPINGS,
    DEPARTMENT_METADATA,
    DEPARTMENT_ALIASES,
    DEPARTMENT_MAJORS,
)
from analyzer.parser import SectionRecord, CadetRecord
from analyzer.metrics import MetricsEngine


class TestMultiSchoolArchitecture(unittest.TestCase):

    def test_school_metadata_definitions(self):
        """Verify the three USAFA schools and leadership are registered."""
        self.assertIn('SINE', SCHOOL_METADATA)
        self.assertIn('SIBS', SCHOOL_METADATA)
        self.assertIn('HASS', SCHOOL_METADATA)

        sine = SCHOOL_METADATA['SINE']
        self.assertEqual(sine['dean'], 'Dean of Engineering Sciences')
        self.assertIn('ESME', sine['departments'])
        self.assertIn('ESAN', sine['departments'])

        sibs = SCHOOL_METADATA['SIBS']
        self.assertEqual(sibs['dean'], 'Dean of Basic Sciences')
        self.assertIn('BSCH', sibs['departments'])
        self.assertIn('BSMS', sibs['departments'])

        hass = SCHOOL_METADATA['HASS']
        self.assertEqual(hass['dean'], 'Dean of Humanities & Social Sciences')
        self.assertIn('HSHI', hass['departments'])
        self.assertIn('HSBL', hass['departments'])

    def test_department_aliasing(self):
        """Verify legacy DF and modern ES, BS/SI, HS aliases map properly."""
        # SINE
        self.assertEqual(DEPARTMENT_ALIASES.get('DFEM'), 'ESME')
        self.assertEqual(DEPARTMENT_ALIASES.get('DFME'), 'ESME')
        self.assertEqual(DEPARTMENT_ALIASES.get('DFCS'), 'ESCS')
        self.assertEqual(DEPARTMENT_ALIASES.get('DFAN'), 'ESAN')

        # SIBS (supports both BS and SI alongside DF)
        self.assertEqual(DEPARTMENT_ALIASES.get('DFCH'), 'BSCH')
        self.assertEqual(DEPARTMENT_ALIASES.get('SICH'), 'BSCH')
        self.assertEqual(DEPARTMENT_ALIASES.get('BSCH'), 'BSCH')
        self.assertEqual(DEPARTMENT_ALIASES.get('DFMS'), 'BSMS')
        self.assertEqual(DEPARTMENT_ALIASES.get('SIMS'), 'BSMS')

        # HASS (supports HS alongside DF)
        self.assertEqual(DEPARTMENT_ALIASES.get('DFHI'), 'HSHI')
        self.assertEqual(DEPARTMENT_ALIASES.get('HSHI'), 'HSHI')
        self.assertEqual(DEPARTMENT_ALIASES.get('DFBL'), 'HSBL')
        self.assertEqual(DEPARTMENT_ALIASES.get('HSBL'), 'HSBL')

    def test_multi_school_metrics_aggregation(self):
        """Verify MetricsEngine produces institution KPIs and school-level rollups."""
        s_sine = SectionRecord(
            file_source='test', term='2251', class_nbr='101', subject='MECHENGR',
            course_number='101', course_title='Statics', section_code='M1',
            credit_units=3.0, instructors=['Instructor, Sine A'], cadet_ids={'C1', 'C2', 'C3'},
            section_weight=1.0, cadet_weight=1.0, weight_type='Full Semester', department='ESME'
        )
        s_sibs = SectionRecord(
            file_source='test', term='2251', class_nbr='102', subject='CHEM',
            course_number='101', course_title='General Chem', section_code='T1',
            credit_units=3.0, instructors=['Instructor, Sibs B'], cadet_ids={'C4', 'C5'},
            section_weight=1.0, cadet_weight=1.0, weight_type='Full Semester', department='BSCH'
        )
        s_hass = SectionRecord(
            file_source='test', term='2251', class_nbr='103', subject='HISTORY',
            course_number='101', course_title='Military History', section_code='W1',
            credit_units=3.0, instructors=['Instructor, Hass C'], cadet_ids={'C6', 'C7', 'C8', 'C9'},
            section_weight=1.0, cadet_weight=1.0, weight_type='Full Semester', department='HSHI'
        )

        cadets = {
            'C1': CadetRecord(cadet_id='C1', major1='Mechanical Engineering', class_year='2026', advisor='Instructor, Sine A'),
            'C4': CadetRecord(cadet_id='C4', major1='Chemistry', class_year='2027', advisor='Instructor, Sibs B'),
            'C6': CadetRecord(cadet_id='C6', major1='History', class_year='2028', advisor='Instructor, Hass C'),
        }

        engine = MetricsEngine([s_sine, s_sibs, s_hass], cadets=cadets)
        results = engine.compute_all_metrics()

        # Check top-level contract keys
        self.assertIn('institution_kpis', results)
        self.assertIn('schools', results)
        self.assertIn('departments', results)
        self.assertIn('faculty_directory', results)

        # Check institution KPIs
        ikpis = results['institution_kpis']
        self.assertEqual(ikpis['total_sections'], 3)
        self.assertEqual(ikpis['total_cadet_seats'], 9)
        self.assertEqual(ikpis['unique_faculty_count'], 3)

        # Check schools list
        schools_map = {s['school_code']: s for s in results['schools']}
        self.assertIn('SINE', schools_map)
        self.assertIn('SIBS', schools_map)
        self.assertIn('HASS', schools_map)

        self.assertEqual(schools_map['SINE']['total_sections'], 1)
        self.assertEqual(schools_map['SINE']['total_cadet_seats'], 3)
        self.assertEqual(schools_map['SIBS']['total_sections'], 1)
        self.assertEqual(schools_map['SIBS']['total_cadet_seats'], 2)
        self.assertEqual(schools_map['HASS']['total_sections'], 1)
        self.assertEqual(schools_map['HASS']['total_cadet_seats'], 4)

    def test_ce_commissioning_education_excluded(self):
        """Verify CE is recognized as Commissioning Education (excluded) and ESCE maps to CIVENGR."""
        from analyzer.config import DEFAULT_EXCLUDED_SUBJECTS, DEFAULT_DEPARTMENT_MAPPINGS

        self.assertIn('CE', DEFAULT_EXCLUDED_SUBJECTS)
        self.assertIn('CIVENGR', DEFAULT_DEPARTMENT_MAPPINGS['ESCE'])
        self.assertNotIn('CE', DEFAULT_DEPARTMENT_MAPPINGS['ESCE'])

        # Test MetricsEngine filtering
        s_civ = SectionRecord(
            file_source='test', term='2251', class_nbr='201', subject='CIVENGR',
            course_number='101', course_title='Civil Engr', section_code='M1',
            credit_units=3.0, instructors=['Civ, Alice'], cadet_ids={'C1', 'C2'},
            section_weight=1.0, cadet_weight=1.0, weight_type='Full Semester', department='ESCE'
        )
        s_ce = SectionRecord(
            file_source='test', term='2251', class_nbr='202', subject='CE',
            course_number='100', course_title='Commiss Ed For Inter Ldrsh', section_code='T1',
            credit_units=0.0, instructors=['Officer, Bob'], cadet_ids={'C3', 'C4'},
            section_weight=1.0, cadet_weight=1.0, weight_type='Full Semester', department='OTHER'
        )

        engine = MetricsEngine([s_civ, s_ce], cadets={})
        results = engine.compute_all_metrics()

        # Only CIVENGR section should be retained
        self.assertEqual(results['institution_kpis']['total_sections'], 1)
        self.assertEqual(len(results['faculty_directory']), 1)
        self.assertEqual(results['faculty_directory'][0]['instructor'], 'Civ, Alice')


if __name__ == '__main__':
    unittest.main()
