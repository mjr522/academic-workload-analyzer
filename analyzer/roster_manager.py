"""
Department Roster Ingestion & Billet Manager
--------------------------------------------
Allows users and Department Heads to provide official department rosters (CSV or XLSX).
Maps faculty directly to their authorized home department (ESME, ESCS, ESAN, etc.),
tracks billet occupancy and type, assigns tiered expected teaching loads, and
calculates non-teaching Section Equivalents using dual-rule FTE attribution:
- Rule 1 (Implied Ratio): If actual_sections > 0 and FTE_Acad > 0
- Rule 2 (Baseline Anchor): If actual_sections == 0 (25% FTE = 1 Section Equivalent)
"""

import csv
import glob
import os
from collections import defaultdict
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

from analyzer.config import DEPARTMENT_ALIASES
from analyzer.parser import get_col, parse_instructor_names


def normalize_dept_code(dept: str) -> str:
    d = str(dept or '').strip().upper()
    return DEPARTMENT_ALIASES.get(d, d)


def compute_section_equivalents(
    actual_sections: float,
    fte_acad: Any,
    fte_admin: Any,
    fte_res: Any,
    fte_lab: Any
) -> Dict[str, float]:
    """
    Computes Section Equivalents based on two institutional rules:
    - Rule 1 (Implied Ratio Model): If actual_sections > 0 and fte_acad > 0:
        implied_capacity = actual_sections / fte_acad
        sec_equiv_admin = implied_capacity * fte_admin
        sec_equiv_res   = implied_capacity * fte_res
        sec_equiv_lab   = implied_capacity * fte_lab
    - Rule 2 (Baseline Anchor Model): If actual_sections == 0 or fte_acad == 0:
        sec_equiv_admin = fte_admin / 0.25  (i.e. 25% FTE = 1 section equivalent)
        sec_equiv_res   = fte_res   / 0.25
        sec_equiv_lab   = fte_lab   / 0.25
    """
    def norm_pct(val: Any) -> float:
        if val is None or val == '':
            return 0.0
        if isinstance(val, str):
            val = val.replace('%', '').strip()
        try:
            v = float(val)
        except (ValueError, TypeError):
            return 0.0
        return v / 100.0 if v > 1.0 else max(0.0, v)

    p_acad = norm_pct(fte_acad)
    p_admin = norm_pct(fte_admin)
    p_res = norm_pct(fte_res)
    p_lab = norm_pct(fte_lab)

    try:
        s_act = max(0.0, float(actual_sections or 0.0))
    except (ValueError, TypeError):
        s_act = 0.0

    if s_act > 0.0 and p_acad > 0.0:
        # Rule 1: Implied Ratio
        implied_capacity = s_act / p_acad
        sec_admin = implied_capacity * p_admin
        sec_res = implied_capacity * p_res
        sec_lab = implied_capacity * p_lab
    else:
        # Rule 2: Revert to 25% FTE = 1 Section
        sec_admin = p_admin / 0.25
        sec_res = p_res / 0.25
        sec_lab = p_lab / 0.25

    gross = s_act + sec_admin + sec_res + sec_lab

    return {
        'admin': round(sec_admin, 2),
        'research': round(sec_res, 2),
        'labops': round(sec_lab, 2),
        'gross_burden': round(gross, 2)
    }


@dataclass
class RosterEntry:
    faculty_name: str
    department_code: str
    emplid: str = ''
    user: str = ''
    is_advisor: bool = False
    billet_occupancy: str = 'Filled'
    billet_type: str = 'Military'
    billet_status: str = 'Filled (Military)'
    expected_tier: str = 'Line_Faculty (3 secs)'
    expected_sections: float = 3.0
    fte_academics_pct: float = 0.75
    fte_admin_pct: float = 0.10
    fte_research_pct: float = 0.15
    fte_labops_pct: float = 0.00
    sec_equiv_admin: float = 0.0
    sec_equiv_research: float = 0.0
    sec_equiv_labops: float = 0.0
    gross_sections_burden: float = 0.0
    notes: str = ''


def parse_tier_to_sections(tier_str: str) -> float:
    t = str(tier_str or '').lower()
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
        self.by_last_fi: Dict[Tuple[str, str], List[RosterEntry]] = defaultdict(list)
        self.has_fte_data: bool = False

    def load_roster_files(self, patterns: List[str]) -> int:
        """Loads one or more roster CSV or XLSX files."""
        matched_files = []
        for pat in patterns:
            matches = glob.glob(pat)
            if matches:
                matched_files.extend(matches)
            elif os.path.exists(pat):
                matched_files.append(pat)

        count = 0
        for fp in matched_files:
            if fp.lower().endswith(('.xlsx', '.xlsm')):
                count += self._parse_single_xlsx(fp)
            else:
                count += self._parse_single_csv(fp)
        return count

    def _process_row_dict(self, row: Dict[str, Any]) -> int:
        raw_name = get_col(row, [
            'Description', 'Faculty_Name', 'Faculty Name',
            'Instructor_Name', 'Instructor Name', 'Name', 'Faculty'
        ])
        if not raw_name or '[VACANT' in str(raw_name).upper():
            return 0

        raw_dept = get_col(row, [
            'Acad Org', 'Acad_Org', 'Academic Organization', 'Academic Org',
            'Department_Code', 'Department Code', 'Department', 'Dept', 'Dept_Code', 'Org'
        ])
        dept = normalize_dept_code(raw_dept)

        emplid = get_col(row, ['ID', 'EMPLID', 'User ID', 'User_ID', 'Empl_ID'])
        user = get_col(row, ['User', 'Username', 'User_Name'])

        raw_adv = str(get_col(row, ['Advisor', 'Is_Advisor', 'Advisor Role', 'Adv'])).upper()
        is_advisor = raw_adv in {'Y', 'YES', 'TRUE', '1', 'ADVISOR'}

        # Handle split Billet_Occupancy and Billet_Type vs legacy Billet_Status
        raw_occ = get_col(row, ['Billet_Occupancy', 'Occupancy', 'Billet_Status', 'Billet Status', 'Status'])
        raw_typ = get_col(row, ['Billet_Type', 'Type'])

        occ_str = str(raw_occ).strip()
        typ_str = str(raw_typ).strip() if raw_typ else ''

        if 'vacant' in occ_str.lower():
            billet_occ = 'Vacant'
        else:
            billet_occ = 'Filled'

        if typ_str:
            billet_typ = typ_str
        elif 'civ' in occ_str.lower():
            billet_typ = 'Civilian'
        elif 'moa' in occ_str.lower() or 'courtesy' in occ_str.lower():
            billet_typ = 'MOA_Courtesy'
        else:
            billet_typ = 'Military'

        billet_status = f"{billet_occ} ({billet_typ})"

        tier = get_col(row, ['Expected_Tier', 'Expected Tier', 'Tier', 'Role'], default='Line_Faculty (3 secs)')
        exp_secs = parse_tier_to_sections(tier)
        notes = get_col(row, ['Department_Head_Notes', 'Notes', 'Comment'])

        # FTE Percentages
        actual_secs = get_col(row, ['Weighted_Sections_Taught', 'Sections_Taught', 'Actual_Sections'], default='0.0')
        fte_acad = get_col(row, ['FTE_Academics_Pct', 'Academics_FTE_Percent', 'Academics_Pct', 'FTE_Acad'])
        fte_admin = get_col(row, ['FTE_Admin_Pct', 'Administration_FTE_Percent', 'Admin_FTE_Percent', 'FTE_Admin'])
        fte_res = get_col(row, ['FTE_Research_Pct', 'Research_FTE_Percent', 'FTE_Research'])
        fte_lab = get_col(row, ['FTE_LabOps_Pct', 'Lab_Operations_FTE_Percent', 'Lab_Ops_FTE_Percent', 'FTE_LabOps'])

        # If any FTE percentage is supplied, compute Section Equivalents
        if any(x not in (None, '') for x in [fte_acad, fte_admin, fte_res, fte_lab]):
            self.has_fte_data = True
            sec_equiv = compute_section_equivalents(actual_secs, fte_acad, fte_admin, fte_res, fte_lab)
        else:
            sec_equiv = {'admin': 0.0, 'research': 0.0, 'labops': 0.0, 'gross_burden': float(actual_secs or 0.0)}

        def to_pct_float(val: Any, default: float) -> float:
            if val in (None, ''):
                return default
            if isinstance(val, str):
                val = val.replace('%', '').strip()
            try:
                v = float(val)
                return v / 100.0 if v > 1.0 else v
            except (ValueError, TypeError):
                return default

        names = parse_instructor_names(raw_name)
        norm_name = names[0] if names else str(raw_name).strip()

        entry = RosterEntry(
            faculty_name=norm_name,
            department_code=dept,
            emplid=emplid,
            user=user,
            is_advisor=is_advisor,
            billet_occupancy=billet_occ,
            billet_type=billet_typ,
            billet_status=billet_status,
            expected_tier=tier,
            expected_sections=exp_secs,
            fte_academics_pct=to_pct_float(fte_acad, 0.75),
            fte_admin_pct=to_pct_float(fte_admin, 0.10),
            fte_research_pct=to_pct_float(fte_res, 0.15),
            fte_labops_pct=to_pct_float(fte_lab, 0.00),
            sec_equiv_admin=sec_equiv['admin'],
            sec_equiv_research=sec_equiv['research'],
            sec_equiv_labops=sec_equiv['labops'],
            gross_sections_burden=sec_equiv['gross_burden'],
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

        return 1

    def _parse_single_csv(self, filepath: str) -> int:
        added = 0
        with open(filepath, 'r', encoding='utf-8-sig', errors='ignore') as f:
            reader = csv.DictReader(f)
            for row in reader:
                added += self._process_row_dict(row)
        return added

    def _parse_single_xlsx(self, filepath: str) -> int:
        import openpyxl
        wb = openpyxl.load_workbook(filepath, data_only=True)
        ws = wb.active
        rows = list(ws.iter_rows(values_only=True))
        if not rows:
            return 0

        headers = [str(h).strip() if h is not None else f"col_{i}" for i, h in enumerate(rows[0])]
        added = 0
        for r_vals in rows[1:]:
            row_dict = {headers[i]: (r_vals[i] if i < len(r_vals) else None) for i in range(len(headers))}
            added += self._process_row_dict(row_dict)
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

