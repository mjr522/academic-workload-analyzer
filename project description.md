# USAFA Academic Workload & Resourcing Workbench
## Comprehensive System Architecture, Methodology, & Operational Guide

---

## 1. Executive Summary & Purpose

The **USAFA Academic Workload & Resourcing Workbench** is an enterprise analytical platform designed for the United States Air Force Academy (USAFA) Dean of the Faculty (DF) and academic leadership. It models, visualizes, and calibrates instructional workloads, student contact burdens, faculty role expectations, and departmental capacity across all USAFA Academic Schools (SINE, SIBS, HASS).

### Core Objectives:
1. **Differentiate Preparation vs. Student Contact Burden**: Separate course preparation requirements (lecture prep, syllabus design, lab setups) from direct student contact load (grading, cadet mentoring, office hours).
2. **Standardize Modular & Outlier Curricula**: Properly account for 1-on-1 independent studies (`499` = 0.0s / 1.0c), half-semester courses (0.50s / 0.50c, e.g., `LDRSHP 100/400`, `COMMSTRT 101`), quarter-semester modular blocks (0.25s / 0.25c, e.g., `LDRSHP 300A-D`, `SPACE 251/252/350/472`), and senior capstones.
3. **Capture Non-Teaching Relief (Dean's Dual-Rule Model)**: Quantify institutional, governance, research, and laboratory responsibilities into standard Section Equivalents, revealing total gross burden.
4. **Disentangle Billet Type from Occupancy**: Analyze Military vs. Civilian staffing while tracking billet vacancies and vacancy rates independently.
5. **Interactive Client-Side Workbench**: Empower leadership to simulate faculty reassignments, adjust policy expectations, and fine-tune FTE allocations live in browser memory.
6. **Zero-PII Public Hosting (Option A)**: GitHub Pages hosts only static application code (HTML, CSS, JS). Users load their local `workload_data.json` directly into browser memory for 100% private in-memory processing.

---

## 2. Analytical Methodology & Mathematical Formulations

### 2.1 Course Duration & Modular Weighting Model
Standard raw section counts distort teaching load by treating an independent study or a 10-lesson modular block identically to a 40-lesson laboratory lecture course. The system applies semester-equivalent weighting:

| Course Format / Identifier | Section Preparation Weight | Cadet Contact Weight | Operational Rationale |
| :--- | :---: | :---: | :--- |
| **Standard Full-Semester** | **`1.00` sec** | **`1.00` stu** | Regular 40-lesson semester course (e.g., `MATH 141`, `MECHENGR 330`). |
| **Half-Semester Courses** | **`0.50` sec** | **`0.50` stu** | 20-lesson courses (e.g., `COMMSTRT 101`, `LDRSHP 100`, `LDRSHP 400`). Teaching two half-semester sections equals 1.0 section prep. |
| **Quarter-Semester Blocks** | **`0.25` sec** | **`0.25` stu** | 10-lesson modular blocks (e.g., `LDRSHP 300A-D`, `SPACE 251`, `SPACE 350`). Four blocks equal 1.0 section prep. |
| **Independent Study (`499`)** | **`0.00` sec** | **`1.00` stu** | 1-on-1 directed research. Carries **0.0 section prep load** (no classroom lectures), but awards full contact credit per cadet mentored. |
| **Senior Capstones** | **Configurable** | **`1.00` stu** | Evaluated via the Capstone Catalog with specialized team-mentoring weighting. |

---

### 2.2 Co-Teaching Attribution Model
When a course section is team-taught by $k$ co-instructors:
* **Allocated Preparation Load**:
  $$\text{Allocated Sections} = \frac{\text{Section Weight}}{k}$$
* **Allocated Student Contact Load**:
  $$\text{Allocated Students} = \frac{\text{Cadet Count} \times \text{Cadet Weight}}{k}$$
* **Headcount Metrics**: Total enrolled cadet seats (`cadet_seats`) and unique individual cadet IDs (`unique_cadets`) are strictly preserved.

---

### 2.3 Cross-Teaching Faculty Deduplication (Primary Home Department Rollup)
* **The Problem**: Instructors frequently teach interdisciplinary service courses (e.g., a Mechanical Engineering professor teaching Core Engineering or Systems Engineering courses). Without adjustment, that individual is counted as a separate faculty member in every department, artificially inflating institutional headcount and diluting department averages.
* **The Solution**: The engine identifies each instructor's **Primary Home Department** (the subject with their highest section load, with student load as tie-breaker). All teaching contributions—including cross-department service courses—roll up into their primary department.
* **Result**: Total faculty across all departments equals the exact count of unique physical instructors across the institution.

---

### 2.4 Dean's Dual-Rule Faculty FTE Model & Role Tiers

The Workbench implements the Dean's Dual-Rule Model to balance teaching expectations with non-instructional administrative and operational duties:

#### Rule 1: Role-Based Teaching Standards (Current Tiers)
| Role / Tier | Target Sections / Sem | Teaching % | Admin % | Research % | Lab Ops % | Notes / USAFA Context |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Line Faculty** | **3.0** | 75% | 10% | 10% | 5% | Standard teaching faculty baseline |
| **CDs / 306 FTG Flyers** | **2.0** | 50% | 35% | 10% | 5% | Course Directors and 306 Flying Training Group operational flyers |
| **Dept Head / Lab Dir** | **1.0** | 25% | 60% | 10% | 5% | Academic department heads and major laboratory directors |
| **Adjunct / Chair** | **0.5** | 15% | 70% | 10% | 5% | Endowed chairs, senior scholars, adjuncts |
| **MOA / Courtesy** | **0.0** | 0% | 80% | 15% | 5% | Military personnel on external Memorandums of Agreement / courtesy billets |
| **Lab Staff** | **0.0** | 0% | 0% | 0% | 100% | Dedicated laboratory technicians and operations personnel |
| **Custom Tiers** | Configurable | Dynamic | Dynamic | Dynamic | Dynamic | User-defined via Admin tab |

#### Rule 2: Effort Relief Translation
Non-instructional responsibilities are converted into standard section equivalents ($0.25\text{ FTE} = 1.0\text{ section equivalent}$ based on a 4-course full-time baseline), enabling calculation of gross operational burden.

---

### 2.5 Orthogonal Billet Modeling (Billet Type vs. Occupancy)
To prevent conflation between personnel categorization and staffing vacancies:
* **Billet Type**: Categorized as **Military** (Active Duty / Reserve) or **Civilian** (Title 10 / AD / GS).
* **Billet Occupancy**: Tracked independently as **Occupied** (filled by an active instructor) or **Vacant** (authorized billet currently empty).
* **Operational Value**: Enables leadership to analyze true vacancy rates, military-to-civilian staffing ratios, and instructional deficits caused by unfilled authorizations.

---

### 2.6 3-Way Instructional Capacity & Section Sizing Balance Model
To resolve the analytical distortion where departments "mask" instructional deficits by carrying oversized sections (30–50 cadets) and appearing artificially under-loaded in raw section counts, the Workbench models a 3-way balance:
* **Staffing Capacity ($S_{\text{capacity}}$)**: What authorized faculty *should* teach based on assigned Role Tiers:
  $$S_{\text{capacity}} = \sum_{f \in \text{Faculty}(D)} \text{TargetSections}(f.\text{role})$$
* **Actual Scheduled ($S_{\text{actual}}$)**: What is currently scheduled in the timetable (accounting for co-teaching and course duration weights):
  $$S_{\text{actual}} = \sum_{s \in \text{Sections}(D)} \text{SectionWeight}(s)$$
* **Right-Sized Standard Demand ($S_{\text{standard}}$)**: Number of sections required if cohort sizes are right-sized to the policy benchmark cap ($C = 24$, configurable):
  $$S_{\text{standard}} = \sum_{c \in \text{Courses}(D)} \left\lceil \frac{\text{Cadets}(c)}{C} \right\rceil \times \text{CourseWeight}(c)$$
  *(Synchronized with active Capstone and 499 toggle buttons to eliminate curricular distortion).*
* **Classroom Compression Pressure ($\Delta_{\text{sizing}} = S_{\text{standard}} - S_{\text{actual}}$)**:
  * $\Delta_{\text{sizing}} > 0$: Department absorbs burden via oversized classes.
  * $\Delta_{\text{sizing}} < 0$: Potential for section consolidation.
* **True Faculty Staffing Balance ($\Delta_{\text{staffing}} = S_{\text{capacity}} - S_{\text{standard}}$)**:
  * $\Delta_{\text{staffing}} < 0$: Structural faculty deficit (authorizations cannot cover right-sized sections).
  * $\Delta_{\text{staffing}} \ge 0$: Sufficient authorization capacity.

---

## 3. Interactive Workbench Architecture (6 Modules)

The client-side dashboard (`dashboard/index.html`) operates entirely in modern web browsers without backend server requirements:

### Tab 1: Executive Overview
* **KPI Metric Banners**: Total Cadets, Physical Faculty Headcount, Average Cadets/Instructor, Average Sections/Instructor, Average Section Size.
* **2×2 Resourcing Quadrant Matrix (Bubble Chart)**:
  * **X-Axis**: Course Prep Load (Weighted Sections / Faculty).
  * **Y-Axis**: Student Contact Burden (Cadets / Faculty).
  * **Bubble Radius**: Total Cadet Enrollments.
  * **Color Palette**: Continuous vertical contact burden gradient (Green $\rightarrow$ Amber $\rightarrow$ Red).
* **Institutional SCH Rankings**: Department-by-department Student Credit Hour generation and relative burden ranking.

### Tab 2: Drilldown (School Overviews & Department Workbenches)
* **School Drilldown View**:
  * Activated when selecting an Academic School (e.g., `SINE`, `SIBS`, `HASS`).
  * Features the **Dean Badge**, School-wide KPI rollups, cross-department comparison tables, and section size distribution histograms.
  * Comparative department table includes: Courses, Target Secs ($S_{\text{capacity}}$), Actual Secs ($S_{\text{actual}}$), Cap Demand ($S_{\text{standard}}$), and Sizing Pressure ($\Delta_{\text{sizing}}$).
  * Lists constituent departments in clean alphabetical order.
* **Department Drilldown View**:
  * Activated when selecting an individual Academic Department.
  * Displays departmental KPI metrics, average section size, and student distribution.
  * **⚖️ Instructional Capacity & Section Sizing Balance Card**: 3-metric visual comparison with Dean's analytical insight narrative and dynamic status pills.
  * **Live Faculty Roster Editor**: Allows real-time modification of Role Tiers, Billet Types (Mil/Civ), and Billet Occupancy (Occupied/Vacant) with immediate KPI recalculation.
  * **Interactive Course Section Audit**: Detailed breakdown of every section, instructor allocation, and enrollment count.
  * **Excel Starter Spreadsheet Generation**: Export customized roster templates directly for department heads.

### Tab 3: Curriculum & Capstones
* **Section Sizing Audit**: Institutional distribution of section enrollments.
* **Low-Enrolled Section Audit**: Immediate visibility into small sections ($\le 10$ cadets) to identify consolidation opportunities.
* **Senior Capstone Analysis**: Specialized tracking of senior design and multidisciplinary capstones.
* **Independent Study (499) Monitor**: Comprehensive audit of 1-on-1 mentorship contact loads.

### Tab 4: Faculty Directory
* **Deduplicated Institutional Roster**: Complete, searchable directory of every faculty member.
* **Filter Controls**: Instant filtering between all authorized billets vs. active teaching billets.
* **Detailed Workload Modal**: Drill into any faculty member to inspect their complete course schedule, co-instructors, and calculated burden.

### Tab 5: What-If Scenario Sandbox
* **Interactive Scenario Planning**: Simulate organizational reassignments, course shifts, and staffing changes in browser memory.
* **Impact Visualizer**: Compare baseline vs. simulated section loads and contact burdens side-by-side prior to policy implementation.

### Tab 6: Admin & Policy Configuration
* **Academic Subject Manager**: Enable or disable specific academic subjects and disciplines.
* **Faculty Tier Calibrator**: Create, update, or remove role tiers, adjusting section targets and effort breakdowns.
* **Standard Section Target Cap**: Configure benchmark classroom capacity (default: 24, range 15–35) governing right-sized demand modeling.
* **Partial-Credit Course Lists**: Configure 1/2-credit and 1/4-credit course patterns (e.g., `LDRSHP`, `SPACE`).
* **Capstone Catalog**: Define capstone course rules.
* **Policy Import / Export**: Export full policy configurations to JSON and restore across sessions.

---

## 4. Codebase Structure & File Directory

```
├── analyzer/                        # Modular Python analytical engine
│   ├── config.py                   # Canonical subject mappings, course weights, and tier definitions
│   ├── export_engine.py            # CSV and JSON report generation
│   ├── metrics.py                  # Statistical calculations and weighted burden aggregations
│   ├── models.py                   # Data schemas (Course, Section, Faculty, Department, School)
│   ├── name_resolver.py            # Instructor name normalization and multi-instructor parsing
│   ├── parser.py                   # Enrollment CSV ingestion and validation
│   ├── roster_generator.py         # Starter roster generation and policy template synthesis
│   └── roster_manager.py           # Departmental faculty roster tracking
├── dashboard/                       # Client-side web workbench (GitHub Pages deployed)
│   ├── index.html                  # Single-page application entry point (6 tabs)
│   ├── css/
│   │   └── styles.css              # Modern responsive UI design and quadrant styling
│   ├── js/
│   │   ├── app.js                  # Application controller, tab routing, file upload handling
│   │   ├── workbench_engine.js     # In-memory analytical engine and reactive state management
│   │   ├── executive_view.js       # Executive tab charts and KPI cards
│   │   ├── department_view.js      # School & Department drilldown views and live roster editor
│   │   ├── curriculum_view.js      # Curriculum audits, small section monitor, capstones
│   │   ├── faculty_view.js         # Searchable deduplicated faculty directory
│   │   ├── whatif_sandbox.js       # What-If simulation engine
│   │   ├── admin_view.js           # Policy editor and tier configurator
│   │   ├── charts.js               # Plotly and Chart.js visualization wrappers
│   │   └── xlsx.full.min.js        # Client-side Excel export library
│   └── data/
│       └── template_schema.json    # Public schema template (no PII)
├── tests/                          # Automated Python test suite
│   ├── test_metrics.py             # Attribution and statistical verification
│   ├── test_name_parser.py         # Multi-instructor and name parsing tests
│   └── test_roster.py              # Billet and roster management tests
├── project description.md          # Comprehensive architecture and operational guide
└── NEXT_STEPS_CAPACITY_MODELING.md # Technical implementation blueprint for 3-way capacity modeling
```

---

## 5. Security & Privacy Model (Option A)

To ensure zero risk of exposing Personally Identifiable Information (PII) or institutional personnel records:
1. **Static Hosting Only**: GitHub Pages serves only static HTML, JavaScript, and CSS.
2. **Zero PII in Git**: Neither `workload_data.json` nor raw enrollment CSVs are committed to version control.
3. **Local Client-Side Ingestion**: When users open the dashboard, they upload their local `workload_data.json` file. The file is parsed directly by `workbench_engine.js` in browser RAM and is never transmitted across the network.
