"""
Workload & Resourcing Metrics Engine
------------------------------------
Computes:
- Split co-teaching attribution (1/k) and duration weighting
- Statistical distributions (Count, Mean, Median, Min, Max, StdDev, Sum)
- Department vital statistics, SCH, and sub-10 cadet section tracking
- Multi-School aggregation (SINE, SIBS, HASS) and overall institutional KPIs
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
    DEPARTMENT_MAJORS,
    DEPARTMENT_ALIASES,
    SCHOOL_METADATA,
    DEFAULT_EXCLUDED_SUBJECTS,
)
from analyzer.parser import SectionRecord, CadetRecord, parse_instructor_names


def calc_stats(values: List[float]) -> Dict[str, float]:
    """Computes Count, Min, Max, Mean, Median, Sample StdDev, and Sum."""
    if not values:
        return {
            'count': 0, 'min': 0.0, 'max': 0.0,
            'mean': 0.0, 'median': 0.0, 'stddev': 0.0, 'sum': 0.0
        }

    n = len(values)
    total = sum(values)
    mean = total / n
    sorted_vals = sorted(values)

    if n % 2 == 1:
        median = sorted_vals[n // 2]
    else:
        median = (sorted_vals[n // 2 - 1] + sorted_vals[n // 2]) / 2.0

    min_val = sorted_vals[0]
    max_val = sorted_vals[-1]

    if n > 1:
        variance = sum((x - mean) ** 2 for x in values) / (n - 1)
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
                 dept_mappings: Optional[Dict[str, List[str]]] = None,
                 roster_manager: Optional[Any] = None,
                 name_resolver: Optional[Any] = None):
        self.sections = sections
        self.cadets = cadets
        self.dept_mappings = dept_mappings or DEFAULT_DEPARTMENT_MAPPINGS
        self.roster_manager = roster_manager

        if name_resolver:
            self.name_resolver = name_resolver
        else:
            from analyzer.name_resolver import CanonicalNameResolver
            official_names = self.roster_manager.all_names() if self.roster_manager else []
            self.name_resolver = CanonicalNameResolver(official_roster_names=official_names)

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

            # Deduplicate and resolve instructors to canonical names
            resolved_insts = []
            for raw_inst in sec.instructors:
                c_name = self.name_resolver.resolve(raw_inst)
                if c_name and c_name not in resolved_insts:
                    resolved_insts.append(c_name)
            sec.instructors = resolved_insts

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
        eng_subjs = set()
        for dcode, subjs in self.dept_mappings.items():
            eng_subjs.update(subjs)

        # Core cross-department subjects
        discipline_subjs = {s for s in eng_subjs if s not in {'ENGR', 'INTERDIS'}}

        inst_primary_dept = {}
        for inst, idata in instructors_data.items():
            # Check official roster override first!
            roster_entry = self.roster_manager.get_entry(inst) if self.roster_manager else None
            if roster_entry and roster_entry.department_code in self.dept_mappings:
                pdept = roster_entry.department_code
                inst_primary_dept[inst] = pdept
                idata['primary_dept'] = pdept
                idata['billet_status'] = roster_entry.billet_status
                idata['expected_tier'] = roster_entry.expected_tier
                idata['expected_sections'] = roster_entry.expected_sections
                continue

            if idata['by_subject']:
                dept_candidates = [s for s in idata['by_subject'].keys() if s in discipline_subjs]
                if dept_candidates:
                    candidate_subjs = dept_candidates
                else:
                    candidate_subjs = [s for s in idata['by_subject'].keys() if s in eng_subjs]
                    if not candidate_subjs:
                        candidate_subjs = list(idata['by_subject'].keys())

                # Subject with highest section load
                best_subj = max(
                    candidate_subjs,
                    key=lambda s: (idata['by_subject'][s]['sections_allocated'], idata['by_subject'][s]['students_allocated'])
                )
                pdept = 'OTHER'
                for dcode, subjs in self.dept_mappings.items():
                    if best_subj in subjs:
                        pdept = dcode
                        break
                inst_primary_dept[inst] = pdept
                idata['primary_dept'] = pdept


        # 4. Department Summaries
        dept_summaries = []
        all_inst_allocated_sections = []
        all_inst_allocated_students = []

        for dept_code, subjs in self.dept_mappings.items():
            meta = DEPARTMENT_METADATA.get(dept_code, {'name': dept_code, 'school': 'OTHER', 'division': 'Academic'})
            dept_secs = [s for s in active_sections if s.subject in subjs]
            dept_faculty = [inst for inst, pdept in inst_primary_dept.items() if pdept == dept_code]

            sec_per_inst = [instructors_data[inst]['sections_allocated'] for inst in dept_faculty]
            stu_per_inst = [instructors_data[inst]['students_allocated'] for inst in dept_faculty]

            all_inst_allocated_sections.extend(sec_per_inst)
            all_inst_allocated_students.extend(stu_per_inst)

            sec_stats = calc_stats(sec_per_inst)
            stu_stats = calc_stats(stu_per_inst)

            sec_sizes = [s.cadet_count for s in dept_secs]
            sec_size_stats = calc_stats(sec_sizes)
            sub10_secs = [s for s in dept_secs if s.is_sub10]
            capstone_secs = [s for s in dept_secs if s.is_capstone]

            total_sch = sum(s.student_credit_hours for s in dept_secs)
            unique_courses = sorted(list(set(f"{s.subject} {s.course_number}".strip() for s in dept_secs)))

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
            advisee_counts = Counter()
            for cid, c in self.cadets.items():
                is_dept_major = any(
                    m and any(d_major.lower() in m.lower() for d_major in dept_major_names)
                    for m in [c.major1, c.major2]
                )

                adv_raw = c.advisor
                if not adv_raw:
                    continue

                norm_adv_list = parse_instructor_names(adv_raw)
                raw_adv = norm_adv_list[0] if norm_adv_list else adv_raw.strip()
                norm_adv = self.name_resolver.resolve(raw_adv)

                is_dept_advisor = (
                    norm_adv in dept_faculty or
                    inst_primary_dept.get(norm_adv) == dept_code or
                    (self.roster_manager and self.roster_manager.get_entry(norm_adv) and self.roster_manager.get_entry(norm_adv).department_code == dept_code)
                )

                if is_dept_major or is_dept_advisor:
                    advisee_counts[norm_adv] += 1

            adv_loads = list(advisee_counts.values())
            adv_stats = calc_stats(adv_loads)

            size_buckets = {'<=10': 0, '11-15': 0, '16-20': 0, '21-25': 0, '26+': 0}
            for sz in sec_sizes:
                if sz <= 10:
                    size_buckets['<=10'] += 1
                elif sz <= 15:
                    size_buckets['11-15'] += 1
                elif sz <= 20:
                    size_buckets['16-20'] += 1
                elif sz <= 25:
                    size_buckets['21-25'] += 1
                else:
                    size_buckets['26+'] += 1

            mil_cnt = 0
            civ_cnt = 0
            vac_cnt = 0
            moa_cnt = 0
            for inst in dept_faculty:
                b = instructors_data[inst].get('billet_status', 'Filled (Military)')
                if 'Civ' in b:
                    civ_cnt += 1
                elif 'Vac' in b:
                    vac_cnt += 1
                elif 'MOA' in b or 'Adjunct' in b or 'Cour' in b:
                    moa_cnt += 1
                else:
                    mil_cnt += 1

            billet_summary = {
                'authorized': len(dept_faculty) + vac_cnt,
                'filled_military': mil_cnt,
                'filled_civilian': civ_cnt,
                'vacant': vac_cnt,
                'moa_adjunct': moa_cnt
            }

            dept_summaries.append({
                'dept_code': dept_code,
                'dept_name': meta['name'],
                'school_code': meta.get('school', 'OTHER'),
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
                'section_size_distribution': size_buckets,
                'billet_summary': billet_summary,
                'course_levels': dict(course_levels),
                'declared_majors_total': sum(dept_majors.values()),
                'declared_majors': dict(dept_majors),
                'class_pipeline': {m: dict(cy_cnt) for m, cy_cnt in class_pipeline.items()},
                'advising_stats': {
                    'active_advisors_count': len(advisee_counts),
                    'total_advisees': sum(adv_loads),
                    'mean_advisees_per_advisor': adv_stats['mean'],
                    'max_advisees': adv_stats['max'],
                    'advisor_names': list(advisee_counts.keys())
                },
                'non_teaching_placeholders': {
                    'admin_fte_allocated': None,
                    'research_fte_allocated': None,
                    'lab_ops_hazard_rating': None,
                    'service_fte_allocated': None
                }
            })

        # 5. School-Level Aggregations (SINE, SIBS, HASS)
        school_summaries = []
        for s_code, s_meta in SCHOOL_METADATA.items():
            s_depts = [d for d in dept_summaries if d.get('school_code') == s_code]
            s_dept_codes = set(s_meta['departments'])
            s_faculty = [inst for inst, pdept in inst_primary_dept.items() if pdept in s_dept_codes]
            s_secs = [s for s in active_sections if s.department in s_dept_codes]

            s_sec_per_inst = [instructors_data[inst]['sections_allocated'] for inst in s_faculty]
            s_stu_per_inst = [instructors_data[inst]['students_allocated'] for inst in s_faculty]
            s_sec_stats = calc_stats(s_sec_per_inst)
            s_stu_stats = calc_stats(s_stu_per_inst)

            s_sizes = [s.cadet_count for s in s_secs]
            s_sub10 = [s for s in s_secs if s.is_sub10]
            s_capstones = [s for s in s_secs if s.is_capstone]
            s_sch = sum(s.student_credit_hours for s in s_secs)
            s_courses = len(set(f"{s.subject} {s.course_number}".strip() for s in s_secs))

            s_majors = Counter()
            s_pipeline = defaultdict(Counter)
            s_total_advisees = 0
            s_active_advisors = set()

            for d in s_depts:
                for m, cnt in d.get('declared_majors', {}).items():
                    s_majors[m] += cnt
                for m, cy_dict in d.get('class_pipeline', {}).items():
                    for cy, cnt in cy_dict.items():
                        s_pipeline[m][cy] += cnt
                adv_stat = d.get('advising_stats', {})
                s_total_advisees += adv_stat.get('total_advisees', 0)
                s_active_advisors.update(adv_stat.get('advisor_names', []))

            s_dist = {'<=10': 0, '11-15': 0, '16-20': 0, '21-25': 0, '26+': 0}
            for d in s_depts:
                for b_k, b_v in d.get('section_size_distribution', {}).items():
                    s_dist[b_k] = s_dist.get(b_k, 0) + b_v

            s_billet = {'authorized': 0, 'filled_military': 0, 'filled_civilian': 0, 'vacant': 0, 'moa_adjunct': 0}
            for d in s_depts:
                for b_k, b_v in d.get('billet_summary', {}).items():
                    s_billet[b_k] = s_billet.get(b_k, 0) + b_v

            mean_adv_load = round(s_total_advisees / len(s_active_advisors), 1) if s_active_advisors else 0.0

            school_summaries.append({
                'school_code': s_code,
                'school_name': s_meta['name'],
                'short_name': s_meta['short_name'],
                'dean': s_meta['dean'],
                'icon': s_meta['icon'],
                'departments': [d['dept_code'] for d in s_depts],
                'departments_count': len(s_depts),
                'faculty_count': len(s_faculty),
                'total_sections': len(s_secs),
                'total_courses': s_courses,
                'total_cadet_seats': sum(s_sizes),
                'total_sch': round(s_sch, 1),
                'sub10_sections_count': len(s_sub10),
                'sub10_percentage': round((len(s_sub10) / len(s_secs) * 100), 1) if s_secs else 0.0,
                'capstone_sections_count': len(s_capstones),
                'overall_avg_section_size': round(sum(s_sizes) / len(s_secs), 1) if s_secs else 0.0,
                'sections_per_inst_mean': s_sec_stats['mean'],
                'sections_per_inst_median': s_sec_stats['median'],
                'students_per_inst_mean': s_stu_stats['mean'],
                'students_per_inst_median': s_stu_stats['median'],
                'declared_majors_total': sum(s_majors.values()),
                'declared_majors': dict(s_majors),
                'class_pipeline': {m: dict(cy) for m, cy in s_pipeline.items()},
                'advising_stats': {
                    'active_advisors_count': len(s_active_advisors),
                    'total_advisees': s_total_advisees,
                    'mean_advisees_per_advisor': mean_adv_load
                },
                'section_size_distribution': s_dist,
                'billet_summary': s_billet
            })

        # 6. Institution-wide Academic Division KPIs
        overall_sizes = [s.cadet_count for s in active_sections]
        overall_sub10 = [s for s in active_sections if s.is_sub10]
        overall_sch = sum(s.student_credit_hours for s in active_sections)

        institution_kpis = {
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

        # 7. Faculty Directory Summary
        faculty_directory = []
        for inst, idata in sorted(instructors_data.items()):
            sec_alloc = round(idata['sections_allocated'], 2)
            stu_alloc = round(idata['students_allocated'], 2)
            avg_sz = round(stu_alloc / sec_alloc, 1) if sec_alloc > 0 else round(idata['total_cadet_seats'] / max(1, idata['raw_sections_count']), 1)
            exp_sec = idata.get('expected_sections', 3.0)
            sec_delta = round(sec_alloc - exp_sec, 2)
            pdept = idata['primary_dept']
            sch_code = DEPARTMENT_METADATA.get(pdept, {}).get('school', 'OTHER')

            faculty_directory.append({
                'instructor': inst,
                'primary_dept': pdept,
                'school_code': sch_code,
                'billet_status': idata.get('billet_status', 'Filled (Military)'),
                'expected_tier': idata.get('expected_tier', 'Line_Faculty (3 secs)'),
                'expected_sections': exp_sec,
                'section_delta': sec_delta,
                'subjects_taught': sorted(list(idata['subjects'])),
                'courses_taught': sorted(list(idata['courses'])),
                'weighted_sections': sec_alloc,
                'cadet_load_allocated': stu_alloc,
                'total_cadet_seats': idata['total_cadet_seats'],
                'unique_cadets': len(idata['unique_cadets']),
                'avg_section_size': avg_sz,
                'course_assignments': idata['course_details']
            })

        # 8. Granular Sections Audit List
        sections_audit = []
        for s in active_sections:
            sch_code = DEPARTMENT_METADATA.get(s.department, {}).get('school', 'OTHER')
            sections_audit.append({
                'term': s.term,
                'class_nbr': s.class_nbr,
                'department': s.department,
                'school_code': sch_code,
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

        # Return comprehensive multi-school payload
        sine_school = next((s for s in school_summaries if s['school_code'] == 'SINE'), institution_kpis)
        return {
            'institution_kpis': institution_kpis,
            'school_kpis': sine_school, # Backward compatibility for SINE
            'schools': school_summaries,
            'departments': dept_summaries,
            'faculty_directory': faculty_directory,
            'sections_audit': sections_audit
        }

    def _get_department_major_names(self, dept_code: str) -> List[str]:
        """Returns major names associated with a department."""
        norm_code = DEPARTMENT_ALIASES.get(dept_code, dept_code)
        return DEPARTMENT_MAJORS.get(norm_code, [])