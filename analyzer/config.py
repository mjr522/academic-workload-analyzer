"""
Academic Workload & Institutional Hierarchy Configuration
---------------------------------------------------------
Defines:
- Three Schools: SINE (Engineering), SIBS (Basic Sciences), HASS (Humanities & Social Sciences)
- All 20 Academic Departments, course subjects, and declared majors
- Two-way aliases (DF, ES, BS/SI, HS)
- The Dean's tiered faculty expectation baseline
- Course duration weighting rules
"""

from typing import Any, Dict, List, Set

# =========================================================================
# 1. School Definitions & Leadership
# =========================================================================
SCHOOL_METADATA: Dict[str, Dict[str, Any]] = {
    'SINE': {
        'code': 'SINE',
        'name': 'School of Integrated Engineering Sciences',
        'short_name': 'Engineering Sciences (SINE)',
        'dean': 'Dean of Engineering Sciences',
        'icon': '⚙️',
        'departments': ['ESME', 'ESCS', 'ESAN', 'ESCE', 'ESEC', 'ESAS', 'ESIS']
    },
    'SIBS': {
        'code': 'SIBS',
        'name': 'School of Integrated Basic Sciences',
        'short_name': 'Basic Sciences (SIBS)',
        'dean': 'Dean of Basic Sciences',
        'icon': '🔬',
        'departments': ['BSBI', 'BSCH', 'BSMS', 'BSPM']
    },
    'HASS': {
        'code': 'HASS',
        'name': 'School of Integrated Humanities, Arts, & Social Sciences',
        'short_name': 'Humanities & Social Sciences (HASS)',
        'dean': 'Dean of Humanities & Social Sciences',
        'icon': '📚',
        'departments': ['HSBL', 'HSEG', 'HSEN', 'HSHI', 'HSLA', 'HSLC', 'HSMA', 'HSMI', 'HSPS', 'HSPY']
    }
}

# =========================================================================
# 2. Department Mappings across All Three Schools
# =========================================================================
DEFAULT_DEPARTMENT_MAPPINGS: Dict[str, List[str]] = {
    # --- School of Integrated Engineering Sciences (SINE) ---
    'ESME': ['MECHENGR', 'SYSENGR'],                     # Mechanical Engineering
    'ESCS': ['COMPSCI', 'CYBERSCI'],                      # Computer Science
    'ESAN': ['AEROENGR'],                                 # Aeronautics
    'ESCE': ['CIVENGR', 'CE'],                            # Civil & Environmental Engineering
    'ESEC': ['ECE'],                                      # Electrical & Computer Engineering
    'ESAS': ['ASTRENGR', 'SPACE'],                        # Astronautics
    'ESIS': ['ENGR', 'INTERDIS'],                         # SINE Core Engineering

    # --- School of Integrated Basic Sciences (SIBS) ---
    'BSBI': ['BIOLOGY'],                                  # Biology
    'BSCH': ['CHEM'],                                     # Chemistry
    'BSMS': ['MATH', 'DATASCI', 'OPSRSCH'],               # Mathematical Sciences
    'BSPM': ['PHYSICS', 'METEOR'],                        # Physics & Meteorology

    # --- School of Integrated Humanities, Arts, & Social Sciences (HASS) ---
    'HSBL': ['BEHSCI', 'LDRSHP'],                         # Behavioral Sciences & Leadership
    'HSEG': ['ECON', 'GEO'],                              # Economics & Geosciences
    'HSEN': ['ENGLISH', 'CREATART', 'EAP', 'COMMSTRT', 'LRNSTRT'], # English & Fine Arts
    'HSHI': ['HISTORY'],                                  # History
    'HSLA': ['LAW'],                                      # Law
    'HSLC': ['ARABIC', 'CHINESE', 'FRENCH', 'GERMAN', 'JAPANESE', 'PORTUGSE', 'RUSSIAN', 'SPANISH', 'FORARSTU'], # Foreign Languages
    'HSMA': ['MGT'],                                      # Management
    'HSMI': ['MSS'],                                      # Military & Strategic Studies
    'HSPS': ['POLSCI', 'SOCSCI'],                         # Political Science
    'HSPY': ['PHILOS'],                                   # Philosophy
}

DEPARTMENT_METADATA: Dict[str, Dict[str, str]] = {
    # SINE
    'ESME': {'name': 'Mechanical Engineering', 'school': 'SINE', 'division': 'School of Integrated Engineering Sciences', 'chair_title': 'Department Head'},
    'ESCS': {'name': 'Computer Science', 'school': 'SINE', 'division': 'School of Integrated Engineering Sciences', 'chair_title': 'Department Head'},
    'ESAN': {'name': 'Aeronautics', 'school': 'SINE', 'division': 'School of Integrated Engineering Sciences', 'chair_title': 'Department Head'},
    'ESCE': {'name': 'Civil & Environmental Engineering', 'school': 'SINE', 'division': 'School of Integrated Engineering Sciences', 'chair_title': 'Department Head'},
    'ESEC': {'name': 'Electrical & Computer Engineering', 'school': 'SINE', 'division': 'School of Integrated Engineering Sciences', 'chair_title': 'Department Head'},
    'ESAS': {'name': 'Astronautics', 'school': 'SINE', 'division': 'School of Integrated Engineering Sciences', 'chair_title': 'Department Head'},
    'ESIS': {'name': 'SINE Core Engineering', 'school': 'SINE', 'division': 'School of Integrated Engineering Sciences', 'chair_title': 'Dean / SINE Director'},

    # SIBS
    'BSBI': {'name': 'Biology', 'school': 'SIBS', 'division': 'School of Integrated Basic Sciences', 'chair_title': 'Department Head'},
    'BSCH': {'name': 'Chemistry', 'school': 'SIBS', 'division': 'School of Integrated Basic Sciences', 'chair_title': 'Department Head'},
    'BSMS': {'name': 'Mathematical Sciences', 'school': 'SIBS', 'division': 'School of Integrated Basic Sciences', 'chair_title': 'Department Head'},
    'BSPM': {'name': 'Physics & Meteorology', 'school': 'SIBS', 'division': 'School of Integrated Basic Sciences', 'chair_title': 'Department Head'},

    # HASS
    'HSBL': {'name': 'Behavioral Sciences & Leadership', 'school': 'HASS', 'division': 'School of Integrated Humanities, Arts, & Social Sciences', 'chair_title': 'Department Head'},
    'HSEG': {'name': 'Economics & Geosciences', 'school': 'HASS', 'division': 'School of Integrated Humanities, Arts, & Social Sciences', 'chair_title': 'Department Head'},
    'HSEN': {'name': 'English & Fine Arts', 'school': 'HASS', 'division': 'School of Integrated Humanities, Arts, & Social Sciences', 'chair_title': 'Department Head'},
    'HSHI': {'name': 'History', 'school': 'HASS', 'division': 'School of Integrated Humanities, Arts, & Social Sciences', 'chair_title': 'Department Head'},
    'HSLA': {'name': 'Law', 'school': 'HASS', 'division': 'School of Integrated Humanities, Arts, & Social Sciences', 'chair_title': 'Department Head'},
    'HSLC': {'name': 'Foreign Languages & Cultures', 'school': 'HASS', 'division': 'School of Integrated Humanities, Arts, & Social Sciences', 'chair_title': 'Department Head'},
    'HSMA': {'name': 'Management', 'school': 'HASS', 'division': 'School of Integrated Humanities, Arts, & Social Sciences', 'chair_title': 'Department Head'},
    'HSMI': {'name': 'Military & Strategic Studies', 'school': 'HASS', 'division': 'School of Integrated Humanities, Arts, & Social Sciences', 'chair_title': 'Department Head'},
    'HSPS': {'name': 'Political Science', 'school': 'HASS', 'division': 'School of Integrated Humanities, Arts, & Social Sciences', 'chair_title': 'Department Head'},
    'HSPY': {'name': 'Philosophy', 'school': 'HASS', 'division': 'School of Integrated Humanities, Arts, & Social Sciences', 'chair_title': 'Department Head'},
}

# Declared Majors mapping per Department
DEPARTMENT_MAJORS: Dict[str, List[str]] = {
    # SINE
    'ESME': ['Mechanical Engineering', 'Systems Engineering'],
    'ESCS': ['Computer Science', 'Cyber Science'],
    'ESAN': ['Aeronautical Engineering'],
    'ESCE': ['Civil Engineering'],
    'ESEC': ['Electrical & Computer Engineering'],
    'ESAS': ['Astronautical Engineering'],
    'ESIS': ['General Engineering'],

    # SIBS
    'BSBI': ['Biology', 'Basic Sciences'],
    'BSCH': ['Chemistry'],
    'BSMS': ['Mathematics', 'Data Science', 'Operations Research'],
    'BSPM': ['Physics', 'Meteorology'],

    # HASS
    'HSBL': ['Behavioral Sciences'],
    'HSEG': ['Economics', 'Geospatial Science'],
    'HSEN': ['English'],
    'HSHI': ['History'],
    'HSLA': ['Legal Studies'],
    'HSLC': ['Foreign Area Studies'],
    'HSMA': ['Management'],
    'HSMI': ['Military & Strategic Studies'],
    'HSPS': ['Political Science', 'Social Sciences'],
    'HSPY': ['Philosophy', 'Humanities'],
}

# Two-way department code aliasing (handles legacy DF codes, ES, BS/SI, HS)
DEPARTMENT_ALIASES: Dict[str, str] = {
    # SINE
    'DFME': 'ESME', 'DFEM': 'ESME', 'ESME': 'ESME',
    'DFCS': 'ESCS', 'ESCS': 'ESCS',
    'DFAN': 'ESAN', 'ESAN': 'ESAN',
    'DFCE': 'ESCE', 'ESCE': 'ESCE',
    'DFEC': 'ESEC', 'ESEC': 'ESEC',
    'DFAS': 'ESAS', 'ESAS': 'ESAS',
    'DFIS': 'ESIS', 'ESIS': 'ESIS', 'INTERDIS': 'ESIS',

    # SIBS (supports both BSxx and SIxx alongside legacy DFxx)
    'DFBI': 'BSBI', 'SIBI': 'BSBI', 'BSBI': 'BSBI',
    'DFCH': 'BSCH', 'SICH': 'BSCH', 'BSCH': 'BSCH',
    'DFMS': 'BSMS', 'SIMS': 'BSMS', 'BSMS': 'BSMS', 'MATH': 'BSMS',
    'DFPM': 'BSPM', 'SIPM': 'BSPM', 'BSPM': 'BSPM',

    # HASS (supports HSxx alongside legacy DFxx)
    'DFBL': 'HSBL', 'HSBL': 'HSBL',
    'DFEG': 'HSEG', 'HSEG': 'HSEG',
    'DFEN': 'HSEN', 'HSEN': 'HSEN',
    'DFHI': 'HSHI', 'HSHI': 'HSHI',
    'DFLA': 'HSLA', 'HSLA': 'HSLA',
    'DFLC': 'HSLC', 'HSLC': 'HSLC',
    'DFMA': 'HSMA', 'HSMA': 'HSMA',
    'DFMI': 'HSMI', 'HSMI': 'HSMI',
    'DFPS': 'HSPS', 'HSPS': 'HSPS',
    'DFPY': 'HSPY', 'HSPY': 'HSPY',
}

# Reverse mapping: Subject -> Department
SUBJECT_TO_DEPARTMENT: Dict[str, str] = {}
for dept, subjs in DEFAULT_DEPARTMENT_MAPPINGS.items():
    for s in subjs:
        SUBJECT_TO_DEPARTMENT[s.upper()] = dept

# Non-academic subjects filtered out by default
DEFAULT_EXCLUDED_SUBJECTS: Set[str] = {
    'PHYED', 'ARMNSHP', 'ARMSHP', 'AVIATION', 'EXTPROG'
}

DEFAULT_ENGINEERING_SUBJECTS: Set[str] = {
    'AEROENGR', 'ASTRENGR', 'CIVENGR', 'CE', 'COMPSCI', 'CYBERSCI',
    'ECE', 'ENGR', 'MECHENGR', 'SYSENGR', 'SPACE'
}

# =========================================================================
# 3. Course Duration & Section Weighting Rules
# =========================================================================
HALF_SEMESTER_COURSES: Set[str] = {
    'COMMSTRT 101', 'COMMSTRT 101X', 'COMMSTR 101', 'COMMSTR 101X'
}

FULL_SEMESTER_EXPERIMENTAL_COURSES: Set[str] = {
    'AEROENGR 206X', 'CIVENGR 486X'
}

# =========================================================================
# 4. Faculty Tiered Expectation Baseline (Dean's Model)
# =========================================================================
TIER_EXPECTATIONS: Dict[str, float] = {
    'dept_head': 1.0,         # Department Heads / Deans (Administrative dominant)
    'lab_director': 1.0,      # High-hazard / Major Facility Lab Directors
    'course_director': 2.0,   # Core Course Directors & Discipline Leads
    'line_faculty': 3.0,      # Core instructional faculty
    'adjunct_courtesy': 1.0,  # Agency research fellows (AFRL, NASA MOAs)
    'endowed_chair': 1.0,     # Endowed chairs (part-time or fractional allocation)
}

BILLET_STATUSES: List[str] = [
    'Filled (Military)',
    'Filled (Civilian)',
    'Vacant (Hiring in Progress)',
    'Double-Billeted',
    'MOA Adjunct Courtesy'
]

WORKLOAD_FACETS: List[str] = [
    'teaching',
    'administration',
    'research',
    'lab_operations',
]