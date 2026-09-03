"""
Registrar Ingestion & Normalization Parser
------------------------------------------
Handles:
- Robust instructor name parsing with suffix handling (Jr., III, Ph.D.) and token cleaning
- Course duration weighting (Full, Half, Quarter, Independent Study 499)
- Granular section, cadet, credit hours, and advisor extraction
"""

import csv
import os
import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Set, Tuple

from analyzer.config import (
    DEFAULT_EXCLUDED_SUBJECTS,
    HALF_SEMESTER_COURSES,
    FULL_SEMESTER_EXPERIMENTAL_COURSES,
    SUBJECT_TO_DEPARTMENT,
)

SUFFIXES: Set[str] = {
    'JR', 'JR.', 'SR', 'SR.', 'II', 'III', 'IV', 'V',
    'PH.D.', 'PHD', 'MD', 'ESQ', 'ESQ.'
}

NULL_NAMES: Set[str] = {
    '', 'BLANK', 'NONE', 'NULL', 'N/A', 'TBD', 'STAFF',
    'UNKNOWN', 'UNASSIGNED', 'DEPARTMENT'
}


def parse_instructor_names(raw_str: Any) -> List[str]:
    """
    Parses instructor name string into normalized 'Last, First Middle' list.
    Handles semicolon-separated, comma-separated, suffixes, and null tokens.
    """
    if not raw_str or not isinstance(raw_str, str):
        return []

    raw = raw_str.strip()
    if not raw or raw.upper() in NULL_NAMES:
        return []

    # Semicolon separated
    if ';' in raw:
        names = []
        for part in raw.split(';'):
            cleaned = part.strip()
            if cleaned and cleaned.upper() not in NULL_NAMES:
                sub_parts = [p.strip() for p in cleaned.split(',') if p.strip()]
                if len(sub_parts) == 2:
                    names.append(f"{sub_parts[0]}, {sub_parts[1]}")
                else:
                    names.append(cleaned)
        return names

    # Single entity without comma
    if ',' not in raw:
        return [raw] if raw.upper() not in NULL_NAMES else []

    # Merge common suffixes with previous token
    raw_tokens = [p.strip() for p in raw.split(',') if p.strip()]
    parts = []
    i = 0
    while i < len(raw_tokens):
        token = raw_tokens[i]
        if i + 1 < len(raw_tokens) and raw_tokens[i + 1].upper() in SUFFIXES:
            parts.append(f"{token} {raw_tokens[i + 1]}")
            i += 2
        else:
            parts.append(token)
            i += 1

    # Exactly 2 parts: Last, First
    if len(parts) == 2:
        return [f"{parts[0]}, {parts[1]}"]

    # Even number of parts: Pair (0,1), (2,3), etc.
    if len(parts) % 2 == 0:
        names = []
        for j in range(0, len(parts), 2):
            names.append(f"{parts[j]}, {parts[j + 1]}")
        return names

    # Regex fallback matching 'Last, First'
    pattern = r'([A-Za-z\'-]+(?:\s+[A-Za-z\'-]+)*),\s*([A-Za-z\'-]+(?:\s+[A-Za-z\.\'-]+)*)'
    matches = re.findall(pattern, raw)
    if matches:
        return [f"{m[0].strip()}, {m[1].strip()}" for m in matches]

    return [raw]


def determine_section_weight(
    subject: str, course_nbr: str, course_title: str, section_code: str
) -> Tuple[float, float, str]:
    """
    Determines preparation section weight and cadet contact weight (0.0 to 1.0):
    - Independent Study (499, 'INDEPENDENT STUDY'): 0.0 sec prep, 1.0 cadet contact
    - Half-Semester (COMMSTRT 101, etc.): 0.50 sec prep, 0.50 cadet contact
    - Quarter-Semester blocks (A/B/C/D sections in modular subjects): 0.25 sec, 0.25 cadet
    - Full-Semester courses: 1.00 sec prep, 1.00 cadet contact
    Returns: (section_weight, cadet_weight, reason_label)
    """
    subj = subject.strip().upper()
    cnum = course_nbr.strip().upper()
    title = course_title.strip().upper()
    sec = section_code.strip().upper()
    course_full = f"{subj} {cnum}".strip()

    # 1. Independent Study Check (0.0 Section Prep, 1.0 Cadet Contact)
    if '499' in cnum or 'INDEPENDENT' in title or 'IND STUDY' in title or 'DIRECTED' in title:
        return (0.0, 1.0, 'Independent Study')

    # 2. Known Half-Semester Courses Check (0.50 Section Prep, 0.50 Cadet Contact)
    if course_full in HALF_SEMESTER_COURSES or (subj == 'COMMSTRT' and '101' in cnum):
        return (0.5, 0.5, 'Half Semester')

    # 3. Known Full-Semester Experimental Courses with 'X'
    if course_full in FULL_SEMESTER_EXPERIMENTAL_COURSES:
        return (1.0, 1.0, 'Full Semester (Exp)')

    # 4. Quarter-Semester Sections Check (0.25 Section Prep, 0.25 Cadet Contact)
    if subj in {'PHYED', 'ARMNSHP', 'AVIATION', 'SPACE'} and len(sec) >= 2 and sec[-1] in 'ABCD':
        return (0.25, 0.25, 'Quarter Block')

    # 5. Standard Full Semester Course
    return (1.0, 1.0, 'Full Semester')


@dataclass
class SectionRecord:
    file_source: str
    term: str
    class_nbr: str
    subject: str
    course_number: str
    course_title: str
    section_code: str
    credit_units: float
    instructors: List[str]
    cadet_ids: Set[str] = field(default_factory=set)
    section_weight: float = 1.0
    cadet_weight: float = 1.0
    weight_type: str = 'Full Semester'
    department: str = 'OTHER'

    @property
    def cadet_count(self) -> int:
        return len(self.cadet_ids)

    @property
    def is_sub10(self) -> bool:
        return self.cadet_count <= 10

    @property
    def is_capstone(self) -> bool:
        cnum = self.course_number.upper()
        title = self.course_title.upper()
        return 'CAPSTONE' in title or cnum in {'451', '452', '463', '464', '491', '492'}

    @property
    def student_credit_hours(self) -> float:
        return self.cadet_count * self.credit_units


@dataclass
class CadetRecord:
    cadet_id: str
    class_year: str = ''
    major1: str = ''
    major2: str = ''
    minor1: str = ''
    advisor: str = ''
    squadron: str = ''
    sport: str = ''


def get_col(row: Dict[str, Any], candidates: List[str], default: str = '') -> str:
    """Extracts column value with case-insensitive and whitespace-tolerant matching."""
    for c in candidates:
        if c in row and row[c] is not None and str(row[c]).strip():
            return str(row[c]).strip()
    row_lower = {k.strip().lower(): v for k, v in row.items() if k is not None}
    for c in candidates:
        cl = c.strip().lower()
        if cl in row_lower and row_lower[cl] is not None and str(row_lower[cl]).strip():
            return str(row_lower[cl]).strip()
    return default


class RegistrarParser:
    """Parses enrollment CSVs and extracts sections, cadets, and departmental associations."""

    def __init__(self):
        self.sections: Dict[Tuple[str, str], SectionRecord] = {}  # key: (term, class_nbr)
        self.cadets: Dict[str, CadetRecord] = {}
        self.files_processed: List[str] = []
        self.terms: List[str] = []
        self.all_subjects: Set[str] = set()

    def parse_file(self, filepath: str) -> None:
        filename = os.path.basename(filepath)
        if filename not in self.files_processed:
            self.files_processed.append(filename)

        with open(filepath, 'r', encoding='utf-8-sig', errors='ignore') as f:
            reader = csv.DictReader(f)
            for row in reader:
                term = get_col(row, ['Term', 'Semester'])
                class_nbr = get_col(row, ['Class Nbr', 'Class Number', 'ClassNbr', 'Class #', 'CRN'])
                subject = get_col(row, ['Subject', 'Subj', 'Dept', 'Department']).upper()
                cnum = get_col(row, ['Course Number', 'Course Nbr', 'Course', 'Catalog Nbr', 'Catalog Number'])
                title = get_col(row, ['Course Title', 'Title', 'Course Name', 'Descr'])
                sec = get_col(row, ['Section', 'Sec', 'Class Section'])
                cadet_id = get_col(row, ['Cadet EMPLID', 'EMPLID', 'Cadet ID', 'Student ID', 'ID'])

                if not class_nbr:
                    continue

                if subject:
                    self.all_subjects.add(subject)

                if term and term not in self.terms:
                    self.terms.append(term)

                # Parse credit hours
                credits_str = get_col(row, ['Unit Taken', 'Units', 'Credits', 'Credit Units', 'Credit Hours'], default='3.0')
                try:
                    credits_val = float(credits_str or '3.0')
                except ValueError:
                    credits_val = 3.0

                # Determine department mapping
                dept = SUBJECT_TO_DEPARTMENT.get(subject, 'OTHER')

                inst_candidates = [
                    'Corrected Names', 'Corrected Name', 'Instructor Name(s)',
                    'Instructor Name', 'Instructor Names', 'Instructor',
                    'Instructors', 'Faculty Name', 'Faculty', 'Primary Instructor'
                ]
                raw_inst = get_col(row, inst_candidates)

                sec_key = (term, class_nbr)
                if sec_key not in self.sections:
                    instructors = parse_instructor_names(raw_inst)
                    sec_wt, cadet_wt, wt_label = determine_section_weight(subject, cnum, title, sec)

                    self.sections[sec_key] = SectionRecord(
                        file_source=filename,
                        term=term,
                        class_nbr=class_nbr,
                        subject=subject,
                        course_number=cnum,
                        course_title=title,
                        section_code=sec,
                        credit_units=credits_val,
                        instructors=instructors,
                        cadet_ids=set(),
                        section_weight=sec_wt,
                        cadet_weight=cadet_wt,
                        weight_type=wt_label,
                        department=dept
                    )
                else:
                    if not self.sections[sec_key].instructors and raw_inst:
                        self.sections[sec_key].instructors = parse_instructor_names(raw_inst)

                if cadet_id:
                    self.sections[sec_key].cadet_ids.add(cadet_id)
                    if cadet_id not in self.cadets:
                        self.cadets[cadet_id] = CadetRecord(
                            cadet_id=cadet_id,
                            class_year=get_col(row, ['Srvc Reasn', 'Class Year', 'Class', 'Grad Year', 'Graduation Year']),
                            major1=get_col(row, ['Major 1', 'Major1', 'Major']),
                            major2=get_col(row, ['Major 2', 'Major2']),
                            minor1=get_col(row, ['Minor 1', 'Minor1', 'Minor']),
                            advisor=get_col(row, ['Advisor Name', 'Advisor', 'Advisor Name(s)', 'Faculty Advisor']),
                            squadron=get_col(row, ['Cadet Squadron', 'Squadron', 'Sqdn']),
                            sport=get_col(row, ['Sport', 'Athletic Sport', 'Team'])
                        )

        self.terms.sort()
