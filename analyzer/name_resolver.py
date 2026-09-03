"""
Canonical Name Resolution and Faculty Deduplication Engine
---------------------------------------------------------
Disambiguates and deduplicates instructor and advisor names across registrar files,
course enrollment histories, and academic organization rosters.

Resolves variations such as:
- Missing vs. present middle initials/names: 'Doe, Jane' == 'Doe, Jane B' == 'Doe, Jane Beth'
- Suffix variations and positioning: 'Smith, John Jr.' == 'Smith Jr., John' == 'Smith, John'
- Roman numerals: 'Brown, Robert III' == 'Brown III, Robert' == 'Brown, Robert'
- Honorifics and ranks: Strips 'Dr.', 'Capt', 'Lt Col', etc. if attached
- Official Roster precedence: Names in the official Acad Org roster serve as ground truth.
"""

import re
from dataclasses import dataclass
from typing import Dict, List, Optional, Set, Tuple


SUFFIX_SET = {'JR', 'JR.', 'SR', 'SR.', 'II', 'III', 'IV', 'V', 'VI'}
HONORIFICS = {'DR', 'DR.', 'COL', 'LTCOL', 'LT COL', 'MAJ', 'CAPT', 'MSGT', 'TSGT', 'SSGT', 'MR', 'MR.', 'MS', 'MS.', 'PROF', 'PROF.'}


@dataclass
class NameComponents:
    raw: str
    last: str
    first: str
    middle: str = ''
    middle_initial: str = ''
    suffix: str = ''
    canonical_display: str = ''


def clean_token(token: str) -> str:
    """Removes non-alphanumeric characters for comparison."""
    return re.sub(r'[^a-zA-Z]', '', token).lower()


def extract_name_components(name_str: str) -> Optional[NameComponents]:
    """
    Parses a name into its structured components:
    Last Name, First Name, Middle Name/Initial, Suffix.
    """
    if not name_str or not isinstance(name_str, str):
        return None
    raw = name_str.strip()
    if not raw:
        return None

    # Strip honorifics/prefixes if present
    for h in HONORIFICS:
        if raw.upper().startswith(h + ' '):
            raw = raw[len(h) + 1:].strip()
            break

    parts = [p.strip() for p in raw.split(',', 1)]
    if len(parts) != 2:
        return None

    last_part = parts[0]
    first_part = parts[1]

    # Check for suffix in last_part (e.g., 'Smith Jr.', 'Brown III')
    suffix = ''
    last_tokens = last_part.split()
    if len(last_tokens) > 1 and last_tokens[-1].upper().rstrip('.') in {s.rstrip('.') for s in SUFFIX_SET}:
        suffix = last_tokens[-1]
        last_name = ' '.join(last_tokens[:-1])
    else:
        last_name = last_part

    # Check for suffix in first_part (e.g., 'John A Jr.', 'Robert III')
    first_tokens = first_part.split()
    if first_tokens and first_tokens[-1].upper().rstrip('.') in {s.rstrip('.') for s in SUFFIX_SET}:
        if not suffix:
            suffix = first_tokens[-1]
        first_tokens = first_tokens[:-1]

    # Strip any honorifics in first name tokens
    first_tokens = [t for t in first_tokens if t.upper().rstrip('.') not in {h.rstrip('.') for h in HONORIFICS}]

    if not first_tokens:
        return None

    first_name = first_tokens[0]
    middle_name = ' '.join(first_tokens[1:]) if len(first_tokens) > 1 else ''

    # Standardize suffix display
    if suffix:
        s_up = suffix.upper().rstrip('.')
        if s_up in {'JR', 'SR'}:
            suffix = s_up.capitalize() + '.'
        else:
            suffix = s_up

    # Clean middle initial
    middle_initial = ''
    if middle_name:
        m_clean = re.sub(r'[^A-Za-z]', '', middle_name)
        if m_clean:
            middle_initial = m_clean[0].upper()

    # Build standardized canonical display: 'Last, First M. Suffix'
    display_parts = [last_name + ',']
    display_parts.append(first_name)
    if middle_name:
        display_parts.append(middle_name.rstrip('.'))
    if suffix:
        display_parts.append(suffix)

    canonical_display = ' '.join(display_parts)

    return NameComponents(
        raw=raw,
        last=last_name,
        first=first_name,
        middle=middle_name,
        middle_initial=middle_initial,
        suffix=suffix,
        canonical_display=canonical_display
    )


def are_names_compatible(c1: NameComponents, c2: NameComponents) -> bool:
    """
    Checks if two parsed name components can represent the exact same person.
    Returns True if:
    1. Cleaned Last Names match.
    2. Cleaned First Names match (or one is an initial of the other).
    3. Middle initials do not contradict each other (empty is compatible with anything).
    4. Suffixes do not contradict each other (empty is compatible with anything).
    """
    # 1. Last name check
    if clean_token(c1.last) != clean_token(c2.last):
        return False

    # 2. First name check
    f1 = clean_token(c1.first)
    f2 = clean_token(c2.first)
    if f1 != f2:
        if (len(f1) == 1 and f2.startswith(f1)) or (len(f2) == 1 and f1.startswith(f2)):
            pass
        else:
            return False

    # 3. Middle initial compatibility (must not contradict)
    if c1.middle_initial and c2.middle_initial:
        if c1.middle_initial != c2.middle_initial:
            return False

    # 4. Suffix compatibility (must not contradict)
    if c1.suffix and c2.suffix:
        if c1.suffix.upper().rstrip('.') != c2.suffix.upper().rstrip('.'):
            return False

    return True


class CanonicalNameResolver:
    """
    Registry that clusters name variants and maps them to a single canonical display name.
    Official roster names are treated as authoritative canonical anchors.
    """

    def __init__(self, official_roster_names: Optional[List[str]] = None):
        self.raw_to_canonical: Dict[str, str] = {}
        self.canonical_names: Set[str] = set()
        self.name_components: Dict[str, NameComponents] = {}
        self.official_canonical: Set[str] = set()

        if official_roster_names:
            for name in official_roster_names:
                self.register_official_name(name)

    def register_official_name(self, name: str) -> str:
        """Registers a name from the official department / Acad Org roster as an authoritative root."""
        if not name:
            return name
        raw = name.strip()
        comp = extract_name_components(raw)
        if not comp:
            self.raw_to_canonical[raw] = raw
            return raw

        canon = comp.canonical_display
        self.name_components[canon] = comp
        self.official_canonical.add(canon)
        self.canonical_names.add(canon)
        self.raw_to_canonical[raw] = canon
        return canon

    def resolve(self, name: str) -> str:
        """
        Resolves any raw or parsed name string to its deduplicated canonical display name.
        """
        if not name:
            return name
        raw = name.strip()
        if raw in self.raw_to_canonical:
            return self.raw_to_canonical[raw]

        comp = extract_name_components(raw)
        if not comp:
            self.raw_to_canonical[raw] = raw
            return raw

        canon = comp.canonical_display
        self.name_components[canon] = comp

        # 1. Match against official canonical roots first
        official_matches = []
        for off in self.official_canonical:
            off_comp = self.name_components.get(off)
            if off_comp and are_names_compatible(comp, off_comp):
                official_matches.append(off)

        if len(official_matches) == 1:
            self.raw_to_canonical[raw] = official_matches[0]
            return official_matches[0]
        elif len(official_matches) > 1:
            if canon in official_matches:
                self.raw_to_canonical[raw] = canon
                return canon
            self.raw_to_canonical[raw] = canon
            return canon

        # 2. Match against existing discovered canonical names
        candidate_matches = []
        for existing in list(self.canonical_names):
            exist_comp = self.name_components.get(existing)
            if exist_comp and are_names_compatible(comp, exist_comp):
                candidate_matches.append(existing)

        if len(candidate_matches) == 1:
            existing = candidate_matches[0]
            exist_comp = self.name_components.get(existing)

            # Determine if new name is more specific than existing
            score_new = (1 if comp.suffix else 0) * 10 + (2 if len(comp.middle) > 1 else (1 if comp.middle_initial else 0))
            score_exist = (1 if exist_comp.suffix else 0) * 10 + (2 if len(exist_comp.middle) > 1 else (1 if exist_comp.middle_initial else 0))

            if score_new > score_exist:
                self.canonical_names.remove(existing)
                self.canonical_names.add(canon)
                for r, c in list(self.raw_to_canonical.items()):
                    if c == existing:
                        self.raw_to_canonical[r] = canon
                self.raw_to_canonical[raw] = canon
                return canon
            else:
                self.raw_to_canonical[raw] = existing
                return existing

        # 3. No match found: create new canonical entry
        self.canonical_names.add(canon)
        self.raw_to_canonical[raw] = canon
        return canon
