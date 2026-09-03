"""
Workload & Resourcing Metrics Engine
------------------------------------
Computes:
- Split co-teaching attribution (1/k) and duration weighting
- Statistical distributions (Count, Mean, Median, Min, Max, StdDev, Sum)
- Department vital statistics, SCH, and sub-10 cadet section tracking
- Declared major counts and class-year pipeline
- Academic advising loads and participation rates
- 2x2 Resourcing Quadrant Matrix coordinates
"""

import math
from collections import defaultdict, Counter
from typing import Any, Dict, List, Optional, Set, Tuple

from analyzer.config import (
    DEFAULT_DEPARTMENT_MAPPINGS,
    DEPARTMENT_METADATA,
    DEFAULT_EXCLUDED_SUBJECTS,
)
from analyzer.parser import SectionRecord, CadetRecord


def calc_stats(values: List[float]) -> Dict[str, float]:
    """Computes Count, Min, Max, Mean, Median, Sample StdDev, and Sum."""
    if not values:
        return {
            'count': 0, 'min': 0.0, 'max': 0.0,
            'mean': 0.0, 'median': 0.0, 'stddev': 0.0, 'sum': 0.0
        }

    sorted_vals = sorted(values)
    n = len(sorted_vals)
    total = sum(sorted_vals)
    mean = total / n
    min_val = sorted_vals[0]
    max_val = sorted_vals[-1]

    if n % 2 == 1:
        median = sorted_vals[n // 2]
    else:
        median = (sorted_vals[(n // 2) - 1] + sorted_vals[n // 2]) / 2.0

    if n > 1:
        variance = sum((x - mean) ** 2 for x in sorted_vals) / (n - 1)
        stddev = math.sqrt(variance)
    else:
        stddev = 0.0

    return {
        'count': n,
        'min': round(min_val, 2),
        'max': round(max_val, 2),
        'mean': round(mean, 2),
        'median': round(median, 2),
        'stddev': round(stddev, 2),
        'sum': round(total, 2)
    }


class MetricsEngine:
    def __init__(self, sections: List[SectionRecord], cadets: Dict[str, CadetRecord],
                 dept_mappings: Optional[Dict[str, List[str]]] = None):
        self.sections = sections
        self.cadets = cadets
        self.dept_mappings = dept_mappings or DEFAULT_DEPARTMENT_MAPPINGS

    def compute_all_metrics(self) -> Dict[str, Any]:
        """Computes comprehensive school, department, curriculum, and faculty metrics."""
        # 1. Filter out non-academic subjects
        active_sections = [s for s in self.sections if s.subject not in DEFAULT_EXCLUDED_SUBJECTS]

        # 2. Instructors Data & Split Attribution
        instructors_data = defaultdict(lambda: {
            'name': '',
            'primary_dept': 'OTHER',
            'subjects': set(),
            'courses': set(),
            'sections_allocated': 0.0,
            'students_allocated': 0.0,
            'raw_sections_count': 0,
            'total_cadet_seats': 0,
            'unique_cadets': set(),
            'course_details': [],
            'by_subject': defaultdict(lambda: {'sections_allocated': 0.0, 'students_allocated': 0.0})
        })

        for sec in active_sections:
            if not sec.instructors:
                continue

            k = len(sec.instructors)
            alloc_sec = sec.section_weight / k
            alloc_stu = (sec.cadet_count * sec.cadet_weight) / k

            for inst in sec.instructors:
                inst_entry = instructors_data[inst]
                inst_entry['name'] = inst
                inst_entry['subjects'].add(sec.subject)
                course_code = f"{sec.subject} {sec.course_number}".strip()
                inst_entry['courses'].add(course_code)
                inst_entry['sections_allocated'] += alloc_sec
                inst_entry['students_allocated'] += alloc_stu
                inst_entry['raw_sections_count'] += 1
                inst_entry['total_cadet_seats'] += sec.cadet_count
                inst_entry['unique_cadets'].update(sec.cadet_ids)
                inst_entry['by_subject'][sec.subject]['sections_allocated'] += alloc_sec
                inst_entry['by_subject'][sec.subject]['students_allocated'] += alloc_stu

                inst_entry['course_details'].append({
                    'term': sec.term,
                    'course': course_code,
                    'title': sec.course_title,
                    'section': sec.section_code,
                    'cadets': sec.cadet_count,
                    'credit_units': sec.credit_units,
                    'sec_weight': sec.section_weight,
                    'weight_type': sec.weight_type,
                    'co_instructors': [x for x in sec.instructors if x != inst]
                })

        # 3. Determine Primary Department for each instructor
        inst_primary_dept = {}
        for inst, idata in instructors_data.items():
            if idata['by_subject']:
                # Subject with highest section load (student load as tie-breaker)
                best_subj = max(
                    idata['by_subject'].keys(),
                    key=lambda s: (idata['by_subject'][s]['sections_allocated'], idata['by_subject'][s]['students_allocated'])
                )
                # Map to Department
                pdept = 'OTHER'
                for dcode, subjs in self.dept_mappings.items():
                    if best_subj in subjs:
                        pdept = dcode
                        break
                inst_primary_dept[inst] = pdept
                idata['primary_dept'] = pdept

        # 4. Department Summaries (Combining all subjects in each department)
        dept_summaries = []
        all_inst_allocated_sections = []
        all_inst_allocated_students = []

        for dept_code, subjs in self.dept_mappings.items():
            meta = DEPARTMENT_METADATA.get(dept_code, {'name': dept_code, 'division': 'Engineering'})
            dept_secs = [s for s in active_sections if s.subject in subjs]
            dept_faculty = [inst for inst, pdept in inst_primary_dept.items() if pdept == dept_code]

            # Faculty loads for faculty mapped to this department
            sec_per_inst = [instructors_data[inst]['sections_allocated'] for inst in dept_faculty]
            stu_per_inst = [instructors_data[inst]['students_allocated'] for inst in dept_faculty]

            all_inst_allocated_sections.extend(sec_per_inst)
            all_inst_allocated_students.extend(stu_per_inst)

            sec_stats = calc_stats(sec_per_inst)
            stu_stats = calc_stats(stu_per_inst)

            # Section sizes and small section count (<= 10)
            sec_sizes = [s.cadet_count for s in dept_secs]
            sec_size_stats = calc_stats(sec_sizes)
            sub10_secs = [s for s in dept_secs if s.is_sub10]
            capstone_secs = [s for s in dept_secs if s.is_capstone]

            # Student Credit Hours (SCH)
            total_sch = sum(s.student_credit_hours for s in dept_secs)

            # Unique courses offered
            unique_courses = sorted(list(set(f"{s.subject} {s.course_number}".strip() for s in dept_secs)))

            # Course levels
            course_levels = Counter()
            for s in dept_secs:
                cnum = s.course_number
                lvl = cnum[0] + '00' if cnum and cnum[0] in '1234' else 'Other'
                course_levels[lvl] += len(s.cadet_ids)

            # Declared majors in this department
            dept_majors = Counter()
            class_pipeline = defaultdict(Counter)
            dept_major_names = self._get_department_major_names(dept_code)

            for cid, c in self.cadets.items():
                m1 = c.major1
                m2 = c.major2
                cy = c.class_year
                for m in [m1, m2]:
                    if m and any(d_major.lower() in m.lower() for d_major in dept_major_names):
                        dept_majors[m] += 1
                        if cy:
                            class_pipeline[m][cy] += 1

            # Advising stats
            dept_advisors = set(instructors_data[inst]['name'] for inst in dept_faculty)
            advisee_counts = Counter()
            for cid, c in self.cadets.items():
                if c.advisor and c.advisor in dept_advisors:
                    advisee_counts[c.advisor] += 1

            adv_loads = list(advisee_counts.values())
            adv_stats = calc_stats(adv_loads)

            dept_summaries.append({
                'dept_code': dept_code,
                'dept_name': meta['name'],
                'division': meta['division'],
                'subjects_included': subjs,
                'faculty_count': len(dept_faculty),
                'total_sections': len(dept_secs),
                'total_courses': len(unique_courses),
                'total_cadet_seats': sum(sec_sizes),
                'total_sch': round(total_sch, 1),
                'sub10_sections_count': len(sub10_secs),
                'sub10_percentage': round((len(sub10_secs) / len(dept_secs) * 100), 1) if dept_secs else 0.0,
                'capstone_sections_count': len(capstone_secs),
                'sections_per_inst_mean': sec_stats['mean'],
                'sections_per_inst_median': sec_stats['median'],
                'students_per_inst_mean': stu_stats['mean'],
                'students_per_inst_median': stu_stats['median'],
                'students_per_inst_max': stu_stats['max'],
                'section_size_mean': sec_size_stats['mean'],
                'section_size_median': sec_size_stats['median'],
                'course_levels': dict(course_levels),
                'declared_majors_total': sum(dept_majors.values()),
                'declared_majors': dict(dept_majors),
                'class_pipeline': {m: dict(cy_cnt) for m, cy_cnt in class_pipeline.items()},
                'advising_stats': {
                    'active_advisors_count': len(advisee_counts),
                    'total_advisees': sum(adv_loads),
                    'mean_advisees_per_advisor': adv_stats['mean'],
                    'max_advisees': adv_stats['max']
                },
                'non_teaching_placeholders': {
                    'admin_fte_allocated': None,
                    'research_fte_allocated': None,
                    'lab_ops_hazard_rating': None,
                    'service_fte_allocated': None
                }
            })

        # 5. School-wide KPIs & Overall Benchmarks
        overall_sizes = [s.cadet_count for s in active_sections]
        overall_sub10 = [s for s in active_sections if s.is_sub10]
        overall_sch = sum(s.student_credit_hours for s in active_sections)

        school_kpis = {
            'total_sections': len(active_sections),
            'total_cadet_seats': sum(overall_sizes),
            'total_sch': round(overall_sch, 1),
            'unique_faculty_count': len(instructors_data),
            'unique_departments_count': len([d for d in dept_summaries if d['total_sections'] > 0]),
            'overall_avg_sec_per_inst': calc_stats(all_inst_allocated_sections)['mean'],
            'overall_avg_stu_per_inst': calc_stats(all_inst_allocated_students)['mean'],
            'overall_avg_section_size': calc_stats(overall_sizes)['mean'],
            'overall_sub10_count': len(overall_sub10),
            'overall_sub10_pct': round((len(overall_sub10) / len(active_sections) * 100), 1) if active_sections else 0.0
        }

        # 6. Faculty Directory Summary
        faculty_directory = []
        for inst, idata in sorted(instructors_data.items()):
            sec_alloc = round(idata['sections_allocated'], 2)
            stu_alloc = round(idata['students_allocated'], 2)
            avg_sz = round(stu_alloc / sec_alloc, 1) if sec_alloc > 0 else round(idata['total_cadet_seats'] / max(1, idata['raw_sections_count']), 1)

            faculty_directory.append({
                'instructor': inst,
                'primary_dept': idata['primary_dept'],
                'subjects_taught': sorted(list(idata['subjects'])),
                'courses_taught': sorted(list(idata['courses'])),
                'weighted_sections': sec_alloc,
                'cadet_load_allocated': stu_alloc,
                'total_cadet_seats': idata['total_cadet_seats'],
                'unique_cadets': len(idata['unique_cadets']),
                'avg_section_size': avg_sz,
                'course_assignments': idata['course_details']
            })

        # 7. Granular Sections Audit List
        sections_audit = []
        for s in active_sections:
            sections_audit.append({
                'term': s.term,
                'class_nbr': s.class_nbr,
                'department': s.department,
                'subject': s.subject,
                'course_nbr': s.course_number,
                'title': s.course_title,
                'section': s.section_code,
                'credit_units': s.credit_units,
                'cadet_count': s.cadet_count,
                'instructors': s.instructors,
                'section_weight': s.section_weight,
                'cadet_weight': s.cadet_weight,
                'weight_type': s.weight_type,
                'is_sub10': s.is_sub10,
                'is_capstone': s.is_capstone,
                'sch': round(s.student_credit_hours, 1)
            })

        return {
            'school_kpis': school_kpis,
            'departments': dept_summaries,
            'faculty_directory': faculty_directory,
            'sections_audit': sections_audit
        }

    def _get_department_major_names(self, dept_code: str) -> List[str]:
        """Returns major names associated with a department."""
        lookup = {
            'DFEM': ['Mechanical Engineering', 'Systems Engineering'],
            'DFCS': ['Computer Science', 'Cyber Science'],
            'DFAN': ['Aeronautical Engineering'],
            'DFCE': ['Civil Engineering'],
            'DFEC': ['Electrical & Computer Engineering', 'Electrical Engineering'],
            'DFAS': ['Astronautical Engineering'],
            'INTERDIS': ['Data Science', 'General Engineering']
        }
        return lookup.get(dept_code, [])
