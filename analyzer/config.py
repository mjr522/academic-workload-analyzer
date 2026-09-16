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

from typing import Any, Dict, List, Set, Tuple

# =========================================================================
# 1. School Definitions & Leadership
# =========================================================================
SCHOOL_METADATA: Dict[str, Dict[str, Any]] = {
    'SINE': {
        'code': 'SINE',
        'name': 'School of Integrated Engineering',
        'short_name': 'Integrated Engineering (SINE)',
        'dean': 'Dean of Engineering',
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
    # --- School of Integrated Engineering (SINE) ---
    'ESME': ['MECHENGR', 'SYSENGR'],                     # Mechanical Engineering
    'ESCS': ['COMPSCI', 'CYBERSCI'],                      # Computer Science
    'ESAN': ['AEROENGR'],                                 # Aeronautics
    'ESCE': ['CIVENGR', 'CIVENG'],                        # Civil & Environmental Engineering
    'ESEC': ['ECE'],                                      # Electrical & Computer Engineering
    'ESAS': ['ASTRENGR', 'SPACE'],                        # Astronautics
    'ESIS': ['ENGR'],                                     # SINE Core Engineering

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
    'ESME': {'name': 'Mechanical Engineering', 'school': 'SINE', 'division': 'School of Integrated Engineering', 'chair_title': 'Department Head'},
    'ESCS': {'name': 'Computer Science', 'school': 'SINE', 'division': 'School of Integrated Engineering', 'chair_title': 'Department Head'},
    'ESAN': {'name': 'Aeronautics', 'school': 'SINE', 'division': 'School of Integrated Engineering', 'chair_title': 'Department Head'},
    'ESCE': {'name': 'Civil & Environmental Engineering', 'school': 'SINE', 'division': 'School of Integrated Engineering', 'chair_title': 'Department Head'},
    'ESEC': {'name': 'Electrical & Computer Engineering', 'school': 'SINE', 'division': 'School of Integrated Engineering', 'chair_title': 'Department Head'},
    'ESAS': {'name': 'Astronautics', 'school': 'SINE', 'division': 'School of Integrated Engineering', 'chair_title': 'Department Head'},
    'ESIS': {'name': 'SINE Core Engineering', 'school': 'SINE', 'division': 'School of Integrated Engineering', 'chair_title': 'Dean / SINE Director'},

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
    'DFEC': 'ESEC', 'ESEC': 'ESEC', 'ESECE': 'ESEC',
    'DFAS': 'ESAS', 'ESAS': 'ESAS',
    'DFIS': 'ESIS', 'ESIS': 'ESIS',

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
    'PHYED', 'ARMNSHP', 'ARMSHP', 'AVIATION', 'EXTPROG', 'CE'
}

DEFAULT_ENGINEERING_SUBJECTS: Set[str] = {
    'AEROENGR', 'ASTRENGR', 'CIVENGR', 'COMPSCI', 'CYBERSCI',
    'ECE', 'ENGR', 'MECHENGR', 'SYSENGR', 'SPACE'
}

# =========================================================================
# 3. Course Duration & Section Weighting Rules
# =========================================================================
HALF_SEMESTER_COURSES: Set[str] = {
    'COMMSTRT 101', 'COMMSTRT 101X', 'COMMSTR 101', 'COMMSTR 101X',
    'LDRSHP 100', 'LDRSHP 100X', 'LDRSHP 400', 'LDRSHP 400X'
}

QUARTER_SEMESTER_COURSES: Set[str] = {
    'LDRSHP 300A', 'LDRSHP 300B', 'LDRSHP 300C', 'LDRSHP 300D',
    'SPACE 251A', 'SPACE 251C', 'SPACE 252B', 'SPACE 252D', 'SPACE 350', 'SPACE 472A', 'SPACE 472B'
}

FULL_SEMESTER_EXPERIMENTAL_COURSES: Set[str] = {
    'AEROENGR 206X', 'CIVENGR 486X'
}

# Verified Senior Capstone Courses (Catalog registry)
CAPSTONE_COURSES: Set[Tuple[str, str]] = {
    ('AEROENGR', '480'),  # Intro to Aircraft Eng Design
    ('AEROENGR', '481'),  # Intro to Aircraft Design
    ('BEHSCI', '498'),    # Senior Capstone
    ('CIVENGR', '451'),   # Civil Engineering Capstone 1
    ('COMPSCI', '453'),   # Software Engr Capstone Proj I
    ('CYBERSCI', '438'),  # Cyber Science Capstone I
    ('DATASCI', '421'),   # Data Science Capstone I
    ('ECE', '463'),       # Capstone Design Project I
    ('ENGLISH', '489'),   # Capstone Research
    ('GEO', '497'),       # Capstone Research in Geospatial
    ('LDRSHP', '400'),    # Leadership Capstone
    ('LDRSHP', '400X'),   # Leadership Capstone
    ('MATH', '420'),      # Mathematics Capstone I
    ('MECHENGR', '491'),  # Capstone Design Project I
    ('MGT', '472'),       # Strategic Mgt Capstone
    ('OPSRSCH', '421'),   # Capstone in Ops Research I
    ('PHYSICS', '490'),   # Capstone Physics Research
    ('POLSCI', '491'),    # Capstone Seminar in Pol Science
    ('SYSENGR', '491'),   # Sys Engr Capstone Design I
}

# Cross-listed / Co-convened course clusters: sets of (Subject, Course_Number) tuples
CROSS_LISTED_COURSES: List[Set[Tuple[str, str]]] = [
    {('MECHENGR', '332'), ('AEROENGR', '436')},
]

# =========================================================================
# 4. Faculty Tiered Expectation Baseline (Dean's Model)
# =========================================================================
TIER_EXPECTATIONS: Dict[str, float] = {
    'line_faculty': 3.0,      # Core instructional faculty
    'course_director': 2.0,   # CDs / 306 FTG Flyers & Discipline Leads
    'lab_director': 2.0,      # High-hazard / Major Facility Lab Directors
    'dept_head': 1.0,         # Department Heads / Deans (Administrative dominant)
    'research_exempt': 1.0,   # Research Exempt / Sabbatical
    'adjunct_chair': 0.5,     # Adjunct faculty & Endowed Chairs (part-time or fractional)
    'moa_courtesy': 0.0,      # MOA / Courtesy visitors, lab techs, GS lab staff (surplus capacity)
    'lab_staff': 0.0,         # Dedicated laboratory operations staff (100% lab ops)
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