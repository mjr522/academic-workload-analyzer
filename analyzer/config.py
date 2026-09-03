"""
Academic Workload & Department Resourcing Analyzer
-------------------------------------------------
Configuration module defining:
- Institutional department mappings (DFEM, DFCS, DFAN, DFCE, DFEC, DFAS, etc.)
- Course duration weighting rules
- The Dean's tiered faculty expectation baseline
- Non-teaching workload facet categories
"""

from typing import Dict, List, Set

# =========================================================================
# 1. Department to Subject / Program Mappings
# =========================================================================
# Maps official institutional department codes to academic course subjects
DEFAULT_DEPARTMENT_MAPPINGS: Dict[str, List[str]] = {
    'DFEM': ['MECHENGR', 'SYSENGR'],                     # Mechanical Engineering (houses Mech & Systems)
    'DFCS': ['COMPSCI', 'CYBERSCI'],                      # Computer Science (houses CS & Cyber)
    'DFAN': ['AEROENGR'],                                 # Aeronautics
    'DFCE': ['CIVENGR'],                                  # Civil & Environmental Engineering
    'DFEC': ['ECE'],                                      # Electrical & Computer Engineering
    'DFAS': ['ASTRENGR'],                                 # Astronautics
    'INTERDIS': ['ENGR', 'DATASCI'],                      # Interdisciplinary Engineering & Data Science
}

DEPARTMENT_METADATA: Dict[str, Dict[str, str]] = {
    'DFEM': {'name': 'Mechanical Engineering', 'division': 'Engineering', 'chair_title': 'Department Head'},
    'DFCS': {'name': 'Computer Science', 'division': 'Engineering', 'chair_title': 'Department Head'},
    'DFAN': {'name': 'Aeronautics', 'division': 'Engineering', 'chair_title': 'Department Head'},
    'DFCE': {'name': 'Civil & Environmental Engineering', 'division': 'Engineering', 'chair_title': 'Department Head'},
    'DFEC': {'name': 'Electrical & Computer Engineering', 'division': 'Engineering', 'chair_title': 'Department Head'},
    'DFAS': {'name': 'Astronautics', 'division': 'Engineering', 'chair_title': 'Department Head'},
    'INTERDIS': {'name': 'Interdisciplinary Programs', 'division': 'Engineering', 'chair_title': 'Program Director'},
}

# Reverse mapping: Subject -> Department
SUBJECT_TO_DEPARTMENT: Dict[str, str] = {}
for dept, subjs in DEFAULT_DEPARTMENT_MAPPINGS.items():
    for s in subjs:
        SUBJECT_TO_DEPARTMENT[s.upper()] = dept

# Core Engineering subjects of interest
DEFAULT_ENGINEERING_SUBJECTS: Set[str] = {
    'AEROENGR', 'ASTRENGR', 'CIVENGR', 'COMPSCI', 'CYBERSCI',
    'DATASCI', 'ECE', 'ENGR', 'MECHENGR', 'SYSENGR'
}

# Non-academic subjects filtered out by default
DEFAULT_EXCLUDED_SUBJECTS: Set[str] = {
    'PHYED', 'ARMNSHP', 'ARMSHP', 'AVIATION', 'SPACE'
}

# =========================================================================
# 2. Course Duration & Section Weighting Rules
# =========================================================================
HALF_SEMESTER_COURSES: Set[str] = {
    'COMMSTRT 101', 'COMMSTRT 101X', 'COMMSTR 101', 'COMMSTR 101X'
}

FULL_SEMESTER_EXPERIMENTAL_COURSES: Set[str] = {
    'AEROENGR 206X', 'CIVENGR 486X'
}

# =========================================================================
# 3. Faculty Tiered Expectation Baseline (Dean's Model)
# =========================================================================
# Standard expected teaching sections per semester by faculty role category
TIER_EXPECTATIONS: Dict[str, float] = {
    'dept_head': 1.0,         # Department Heads / Deans (Administrative dominant)
    'lab_director': 1.0,      # High-hazard / Major Facility Lab Directors
    'course_director': 2.0,   # Core Course Directors & Discipline Leads
    'line_faculty': 3.0,      # Core instructional faculty
    'adjunct_courtesy': 1.0,  # Agency research fellows (AFRL, NASA MOAs)
    'endowed_chair': 1.0,     # Endowed chairs (part-time or fractional allocation)
}

# Billet Status Categories
BILLET_STATUSES: List[str] = [
    'Filled (Military)',
    'Filled (Civilian)',
    'Vacant (Hiring in Progress)',
    'Double-Billeted',
    'MOA Adjunct Courtesy'
]

# Workload Facets for the Extensible "Boulder" Architecture
WORKLOAD_FACETS: List[str] = [
    'teaching',
    'administration',
    'research',
    'lab_operations',
    'cadet_service'
]
