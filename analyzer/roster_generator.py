"""
Department Starter Roster Generator
-----------------------------------
Outputs pre-populated starter roster spreadsheets for Department Heads (Slide 9 deliverable).
Pre-fills verified teaching and advising data while leaving editable columns for:
- Billet Status (Filled Military, Filled Civilian, Vacant, Double-Billeted, MOA Courtesy)
- Expected Tier (Dept Head: 1, Course Dir: 2, Line: 3, Courtesy: 1)
- Major Non-Teaching Offsets (% Lab Ops, % Admin, % Research)
"""

import csv
import os
from typing import Any, Dict, List


class RosterGenerator:
    def __init__(self, metrics_data: Dict[str, Any], output_dir: str = "./rosters"):
        self.metrics_data = metrics_data
        self.output_dir = output_dir

    def generate_all_rosters(self) -> Dict[str, str]:
        """Generates a starter roster CSV for each department in the dataset."""
        os.makedirs(self.output_dir, exist_ok=True)
        generated_files = {}

        faculty_list = self.metrics_data.get('faculty_directory', [])
        departments = self.metrics_data.get('departments', [])

        for dept in departments:
            dept_code = dept['dept_code']
            dept_name = dept['dept_name']
            dept_faculty = [f for f in faculty_list if f['primary_dept'] == dept_code]

            filename = f"starter_roster_{dept_code}.csv"
            filepath = os.path.join(self.output_dir, filename)

            fieldnames = [
                'Department_Code',
                'Faculty_Name',
                'Billet_Status',
                'Expected_Tier',
                'Assigned_Courses',
                'Weighted_Sections_Taught',
                'Cadet_Contact_Load',
                'Cadet_Advisees_Count',
                'Lab_Operations_FTE_Percent',
                'Administration_FTE_Percent',
                'Research_FTE_Percent',
                'Service_FTE_Percent',
                'Department_Head_Notes'
            ]

            rows = []
            for f in dept_faculty:
                # Default Tier based on simple heuristic
                inst_name = f['instructor']
                courses_str = '; '.join(f['courses_taught'])
                secs = f['weighted_sections']
                cadets = f['cadet_load_allocated']

                # Guess default expected tier based on section load
                default_tier = 'Line_Faculty (3 secs)'
                if 'Head' in inst_name or secs <= 1.0:
                    default_tier = 'Dept_Head_or_Lab_Dir (1 sec)'
                elif secs <= 2.0:
                    default_tier = 'Course_Director (2 secs)'

                rows.append({
                    'Department_Code': dept_code,
                    'Faculty_Name': inst_name,
                    'Billet_Status': 'Filled (Select: Military / Civilian / Vacant / Double-Billeted / MOA)',
                    'Expected_Tier': default_tier,
                    'Assigned_Courses': courses_str,
                    'Weighted_Sections_Taught': secs,
                    'Cadet_Contact_Load': cadets,
                    'Cadet_Advisees_Count': 0,  # Populated if mapped
                    'Lab_Operations_FTE_Percent': '',
                    'Administration_FTE_Percent': '',
                    'Research_FTE_Percent': '',
                    'Service_FTE_Percent': '',
                    'Department_Head_Notes': ''
                })

            # Add sample vacant line row for the DH to calibrate
            rows.append({
                'Department_Code': dept_code,
                'Faculty_Name': '[VACANT BILLET EXAMPLE]',
                'Billet_Status': 'Vacant (Hiring in Progress)',
                'Expected_Tier': 'Line_Faculty (3 secs)',
                'Assigned_Courses': '(Unfilled)',
                'Weighted_Sections_Taught': 0.0,
                'Cadet_Contact_Load': 0.0,
                'Cadet_Advisees_Count': 0,
                'Lab_Operations_FTE_Percent': '0%',
                'Administration_FTE_Percent': '0%',
                'Research_FTE_Percent': '0%',
                'Service_FTE_Percent': '0%',
                'Department_Head_Notes': 'Add vacant or double-billeted lines here'
            })

            with open(filepath, 'w', newline='', encoding='utf-8') as csvfile:
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(rows)

            generated_files[dept_code] = filepath

        return generated_files
