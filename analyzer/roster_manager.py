"""
Department Roster Ingestion & Billet Manager
--------------------------------------------
Allows users and Department Heads to provide official department rosters.
Maps faculty directly to their authorized home department (ESME, ESCS, ESAN, etc.),
tracks billet status (Filled Military, Filled Civilian, Vacant, Double-Billeted, MOA),
and assigns tiered expected teaching loads.
"""

import csv
import glob
import os
from collections import defaultdict
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

from analyzer.config import DEPARTMENT_ALIASES
from analyzer.parser import get_col, parse_instructor_names


def normalize_dept_code(dept: str) -> str:
    d = dept.strip().upper()
    return DEPARTMENT_ALIASES.get(d, d)


@dataclass
class RosterEntry:
    faculty_name: str
    department_code: str
    emplid: str = ''
    user: str = ''
    is_advisor: bool = False
    billet_status: str = 'Filled (Military)'
    expected_tier: str = 'Line_Faculty (3 secs)'
    expected_sections: float = 3.0
    notes: str = ''


def parse_tier_to_sections(tier_str: str) -> float:
    t = tier_str.lower()
    if '1' in t or 'head' in t or 'director' in t and 'course' not in t or 'courtesy' in t:
        return 1.0
    if '2' in t or 'course' in t:
        return 2.0
    if '3' in t or 'line' in t:
        return 3.0
    return 3.0


class RosterManager:
    def __init__(self):
        self.roster: Dict[str, RosterEntry] = {}            # key: normalized faculty name
        self.by_id: Dict[str, RosterEntry] = {}             # key: EMPLID / ID
        self.by_last_fi: Dict[Tuple[str, str], List[RosterEntry]] = defaultdict(list) # key: (last_lower, first_initial_lower)

    def load_roster_files(self, patterns: List[str]) -> int:
        """Loads one or more roster CSV files."""
        matched_files = []
        for pat in patterns:
            matches = glob.glob(pat)
            if matches:
                matched_files.extend(matches)
            elif os.path.exists(pat):
                matched_files.append(pat)

        count = 0
        for fp in matched_files:
            count += self._parse_single_roster(fp)
        return count

    def _parse_single_roster(self, filepath: str) -> int:
        added = 0
        with open(filepath, 'r', encoding='utf-8-sig', errors='ignore') as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Name extraction: handles 'Description', 'Faculty_Name', 'Instructor Name', etc.
                raw_name = get_col(row, [
                    'Description', 'Faculty_Name', 'Faculty Name',
                    'Instructor_Name', 'Instructor Name', 'Name', 'Faculty'
                ])
                if not raw_name or '[VACANT' in raw_name.upper():
                    continue

                # Department / Acad Org extraction
                raw_dept = get_col(row, [
                    'Acad Org', 'Acad_Org', 'Academic Organization', 'Academic Org',
                    'Department_Code', 'Department Code', 'Department', 'Dept', 'Dept_Code', 'Org'
                ])
                dept = normalize_dept_code(raw_dept)

                # ID / EMPLID
                emplid = get_col(row, ['ID', 'EMPLID', 'User ID', 'User_ID', 'Empl_ID'])
                user = get_col(row, ['User', 'Username', 'User_Name'])

                # Advisor flag
                raw_adv = get_col(row, ['Advisor', 'Is_Advisor', 'Advisor Role', 'Adv']).upper()
                is_advisor = raw_adv in {'Y', 'YES', 'TRUE', '1', 'ADVISOR'}

                billet = get_col(row, ['Billet_Status', 'Billet Status', 'Billet', 'Status'], default='Filled (Military)')
                tier = get_col(row, ['Expected_Tier', 'Expected Tier', 'Tier', 'Role'], default='Line_Faculty (3 secs)')
                notes = get_col(row, ['Department_Head_Notes', 'Notes', 'Comment'])

                names = parse_instructor_names(raw_name)
                norm_name = names[0] if names else raw_name.strip()

                exp_secs = parse_tier_to_sections(tier)

                entry = RosterEntry(
                    faculty_name=norm_name,
                    department_code=dept,
                    emplid=emplid,
                    user=user,
                    is_advisor=is_advisor,
                    billet_status=billet,
                    expected_tier=tier,
                    expected_sections=exp_secs,
                    notes=notes
                )

                self.roster[norm_name] = entry
                if emplid:
                    self.by_id[emplid] = entry

                # Index by (last_name, first_initial)
                parts = [p.strip() for p in norm_name.split(',', 1)]
                if len(parts) == 2:
                    last = parts[0].lower()
                    fi = parts[1][0].lower() if parts[1] else ''
                    self.by_last_fi[(last, fi)].append(entry)

                added += 1
        return added

    def get_entry(self, instructor_name: str, instructor_id: str = '') -> Optional[RosterEntry]:
        """Looks up a faculty roster entry by exact name, ID, or last name + first initial."""
        if instructor_id and instructor_id in self.by_id:
            return self.by_id[instructor_id]

        if not instructor_name:
            return None

        # 1. Exact normalized name
        names = parse_instructor_names(instructor_name)
        norm_name = names[0] if names else instructor_name.strip()
        if norm_name in self.roster:
            return self.roster[norm_name]

        # 2. Case-insensitive exact name
        for r_name, entry in self.roster.items():
            if r_name.lower() == norm_name.lower():
                return entry

        # 3. Compatible Name Components check (e.g. 'Doe, Jane' == 'Doe, Jane B')
        from analyzer.name_resolver import extract_name_components, are_names_compatible
        c_inst = extract_name_components(norm_name)
        if c_inst:
            matches = []
            for r_name, entry in self.roster.items():
                c_roster = extract_name_components(r_name)
                if c_roster and are_names_compatible(c_inst, c_roster):
                    matches.append(entry)
            if len(matches) == 1:
                return matches[0]

        # 4. Fallback: Last Name + First Initial
        parts = [p.strip() for p in norm_name.split(',', 1)]
        if len(parts) == 2:
            last = parts[0].lower()
            fi = parts[1][0].lower() if parts[1] else ''
            matches = self.by_last_fi.get((last, fi), [])
            if len(matches) == 1:
                return matches[0]

        return None

    def all_names(self) -> List[str]:
        return list(self.roster.keys())
