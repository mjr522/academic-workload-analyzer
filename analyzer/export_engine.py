"""
Export Engine & JSON Data Contract
-----------------------------------
Emits standardized, schema-compliant workload_data.json consumed by the Web Dashboard.
"""

import json
import os
from datetime import datetime
from typing import Any, Dict


class ExportEngine:
    def __init__(self, metrics_data: Dict[str, Any], meta_info: Dict[str, Any]):
        self.metrics_data = metrics_data
        self.meta_info = meta_info

    def build_payload(self) -> Dict[str, Any]:
        payload = {
            'schema_version': '3.0.0',
            'generated_at': datetime.now().isoformat(),
            'meta': self.meta_info,
            'institution_kpis': self.metrics_data.get('institution_kpis', self.metrics_data['school_kpis']),
            'school_kpis': self.metrics_data['school_kpis'],
            'schools': self.metrics_data.get('schools', []),
            'departments': self.metrics_data['departments'],
            'faculty_directory': self.metrics_data['faculty_directory'],
            'sections_audit': self.metrics_data['sections_audit']
        }
        if 'modes' in self.metrics_data:
            payload['modes'] = self.metrics_data['modes']
        if 'default_mode' in self.metrics_data:
            payload['default_mode'] = self.metrics_data['default_mode']

        # Package default institutional rules & tiers policy
        from analyzer.config import (
            CAPSTONE_COURSES, CROSS_LISTED_COURSES, TIER_EXPECTATIONS,
            DEFAULT_EXCLUDED_SUBJECTS, HALF_SEMESTER_COURSES, QUARTER_SEMESTER_COURSES
        )
        all_subjects = sorted(list(set(
            s['subject'] for s in self.metrics_data.get('sections_audit', [])
            if s.get('subject')
        )))

        # Collect half-credit and quarter-credit courses from config and sections_audit
        half_credit = set(HALF_SEMESTER_COURSES)
        quarter_credit = set(QUARTER_SEMESTER_COURSES)
        for s in self.metrics_data.get('sections_audit', []):
            subj = s.get('subject')
            cnum = s.get('course_nbr')
            if subj and cnum:
                pair_str = f"{subj} {cnum}".strip()
                sec_wt = s.get('section_weight', 1.0)
                if sec_wt == 0.5 and not s.get('is_499'):
                    half_credit.add(pair_str)
                elif sec_wt == 0.25:
                    quarter_credit.add(pair_str)

        default_policy = {
            'included_subjects': all_subjects,
            'excluded_subjects': sorted(list(DEFAULT_EXCLUDED_SUBJECTS)),
            'capstone_courses': sorted(list(set(f"{c[0]} {c[1]}" for c in CAPSTONE_COURSES))),
            'capstone_pairs': [{'subject': c[0], 'course_nbr': c[1]} for c in sorted(list(CAPSTONE_COURSES))],
            'half_credit_courses': sorted(list(half_credit)),
            'quarter_credit_courses': sorted(list(quarter_credit)),
            'co_convened_pairs': [
                [{'subject': pair[0][0], 'course_nbr': pair[0][1]}, {'subject': pair[1][0], 'course_nbr': pair[1][1]}]
                for cluster in CROSS_LISTED_COURSES
                for pair in [list(cluster)] if len(pair) == 2
            ],
            'sub10_threshold': 10,
            'exclude_capstones': True,
            'exclude_499s': True,
            'tiers': {
                'Line_Faculty': {'name': 'Line Faculty', 'expected_sections': 3.0, 'teaching_pct': 75.0, 'admin_pct': 10.0, 'research_pct': 10.0, 'labops_pct': 5.0},
                'Course_Director': {'name': 'CDs / 306 FTG Flyers', 'expected_sections': 2.0, 'teaching_pct': 50.0, 'admin_pct': 35.0, 'research_pct': 10.0, 'labops_pct': 5.0},
                'Dept_Head': {'name': 'Dept Head / Lab Dir', 'expected_sections': 1.0, 'teaching_pct': 25.0, 'admin_pct': 60.0, 'research_pct': 10.0, 'labops_pct': 5.0},
                'Adjunct_Chair': {'name': 'Adjunct / Chair', 'expected_sections': 0.5, 'teaching_pct': 15.0, 'admin_pct': 70.0, 'research_pct': 10.0, 'labops_pct': 5.0},
                'MOA_Courtesy': {'name': 'MOA / Courtesy', 'expected_sections': 0.0, 'teaching_pct': 0.0, 'admin_pct': 80.0, 'research_pct': 15.0, 'labops_pct': 5.0},
                'Lab_Staff': {'name': 'Lab Staff', 'expected_sections': 0.0, 'teaching_pct': 0.0, 'admin_pct': 0.0, 'research_pct': 0.0, 'labops_pct': 100.0}
            }
        }
        payload['default_policy'] = default_policy
        return payload

    def export_json(self, output_path: str, compact: bool = False) -> str:
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        payload = self.build_payload()
        with open(output_path, 'w', encoding='utf-8') as f:
            if compact:
                json.dump(payload, f, separators=(',', ':'))
            else:
                json.dump(payload, f, indent=2)
        return output_path

