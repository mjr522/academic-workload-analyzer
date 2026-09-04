# USAFA Academic Workload & Department Resourcing Platform

A decoupled, local-first analytics and visual intelligence platform designed for the **United States Air Force Academy (USAFA) Academic Division**, covering all three academic schools: **SINE** (School of Integrated Engineering Sciences), **SIBS** (School of Integrated Basic Sciences), and **HASS** (School of Integrated Humanities, Arts, & Social Sciences).

This platform empowers Academy senior leadership, school directors, and department heads to objectively evaluate instructional workloads, student contact burdens, academic advising distributions, small section proliferation, and curriculum capacity—supported by interactive **"What-If" staffing simulation** and pre-populated **Department Starter Rosters**.

---

## 🌐 Live Web Dashboard

The web dashboard is hosted live on GitHub Pages with zero installation required:

👉 **[https://mjr522.github.io/academic-workload-analyzer/](https://mjr522.github.io/academic-workload-analyzer/)**

* **No GitHub account or login required.**
* Works in all modern browsers (Microsoft Edge, Google Chrome, Safari, Firefox).
* Double-clicking `dashboard/index.html` locally also works 100% offline.

---

## 🛡️ Privacy-First & Air-Gapped Architecture

Educational and personnel data at USAFA are subject to strict privacy guardrails (FERPA / CUI). This platform was deliberately engineered with an **air-gapped, zero-trust privacy model**:

1. **Client-Side Only Execution**:
   * The web application runs entirely in local browser memory using the HTML5 `FileReader` API.
   * **No personnel data, instructor names, or cadet records are ever uploaded to any web server or cloud storage.**
2. **Strict Git Safeguards**:
   * All raw enrollment spreadsheets (`*.csv`), local data exports (`*data*.json`), and department rosters (`rosters/*.csv`) are blocked by `.gitignore`.
   * Only open-source code and an anonymized synthetic data template (`template_schema.json`) reside in GitHub.
3. **Seamless Sharing with Leadership**:
   * You can simply email the generated `workload_data.json` file to your boss or colleagues.
   * Recipients visit the public dashboard URL and load the file locally—all data processing, charting, and calculations take place exclusively on their local computer.

---

## 🚀 Leadership Quick-Start Guide

### Step 1: Open the Dashboard
Navigate to **`https://mjr522.github.io/academic-workload-analyzer/`** in your browser.

### Step 2: Load Your Workload Dataset
* **Option A**: Drag and drop the `workload_data.json` file anywhere onto the browser window.
* **Option B**: Click **"📁 Load Local Data JSON"** in the top header and select the file.
* Once loaded, the green confirmation badge will appear and all views will immediately populate.

### Step 3: Explore the Analytical Panes

#### 📊 1. Executive Overview
* **Academic School Scope Selector**: Filter metrics for **All Schools (USAFA Division)** or drill into **SINE**, **SIBS**, or **HASS**.
* **2×2 Resourcing Matrix (Quadrant Scatter Plot)**:
  * **X-Axis**: Course Prep Load (Weighted Sections per Instructor).
  * **Y-Axis**: Student Contact Load (Cadet seats per Instructor).
  * **Bubble Size**: Total cadet enrollment volume.
  * *Note*: Core Engineering (`ESIS`) is excluded from the scatter plot to prevent skewing benchmark averages.
* **Student Credit Hours (SCH) Ranking**: Comparative bar chart of credit hours delivered across schools and departments against institutional benchmarks.
* **Faculty & Majors Distribution**: Donut charts showing instructional lines and declared cadet majors.
* **Small Section Audit**: Tracking sections with $\le 10$ cadets across departments.

#### 🏢 2. Department Drilldown
* **Department Selector**: Dropdown organized by School (`SINE`, `SIBS`, `HASS`) to inspect any of the 21 academic departments.
* **Department Vitals**: Unique courses, active sections, enrolled cadet seats, Student Credit Hours, declared majors, and sub-10 section counts.
* **Major Pipeline by Class Year**: Stacked charts tracking declared cadet majors from Fourth-Class (Freshman) through First-Class (Senior) years.
* **Section Size Distribution**: Histogram showing class enrollment distribution.
* **Billet Status & Staffing Health**: Authorized vs. vacant billets, military vs. civilian filled lines, and MOA courtesy adjuncts.
* **Advising & Course Levels**: Total advisees, active advisors, average advisees per advisor, and seat distribution across 100-, 200-, 300-, and 400-level courses.
* **Department Assigned Faculty Table**:
  * Lists instructors assigned to the department with weighted sections, contact load, total seats, average class size, and courses taught.
  * **# of Advisees Column**: Shows official cadet advising assignments for each faculty member.
  * **Two-Way Column Sorting**: Click any header once to sort highest-to-lowest (descending); click again to reverse (ascending).
* **Department Course Offerings & Sections Table**:
  * Displays every active course offering, section code (e.g. `M1A`, `T2B`), term, enrolled section size, credit units, and assigned instructors.
  * **Interactive Search**: Filter sections in real time by course code, title, section, term, or instructor name.
  * **Clickable Faculty Profiles**: Clicking any instructor name opens their complete Workload Profile modal.
  * **Enrollment Badges**: Highlights low-enrollment sections (`≤ 10 Cadets`) in amber and senior capstone courses (`Capstone`).

#### 📚 3. Curriculum & Capstones
* Comprehensive audit of small section proliferation ($\le 10$ cadets) and multi-section senior design capstone fragmentation across academic departments.

#### 👥 4. Faculty Directory
* Master institutional roster of deduplicated instructors with school, primary department, billet tier, actual vs. expected sections, delta indicators, contact load, and advisee counts.
* Click any instructor to view their individual **Teaching Assignment Breakdown**.

#### ⚙️ 5. "What-If" Scenario Sandbox
* Live staffing simulator enabling leadership to model billet changes, faculty promotions, role adjustments, and department transfers.
* Click **"⚡ Recalculate Scenario Live"** to instantly project the impact on department teaching ratios.
* Click **"💾 Export Scenario JSON"** to save proposal data packages.

#### 👁️ Privacy Name Masking
* Click **"👁️ Names Visible / 🔒 Names Masked"** in the top header to instantly replace instructor names with anonymous tokens (`Faculty 01`, `Faculty 02`) for broad briefings and presentations.

---

## 🏛️ USAFA Institutional Structure & Mappings

The platform maps all academic subjects and majors across USAFA's three academic schools and 21 departments:

| School | Dept Code | Department Name | Included Disciplines & Subjects |
| :--- | :--- | :--- | :--- |
| **SINE** | `ESME` | Mechanical Engineering | `MECHENGR`, `SYSENGR` |
| **SINE** | `ESCS` | Computer Science | `COMPSCI`, `CYBERSCI` |
| **SINE** | `ESAN` | Aeronautics | `AEROENGR` |
| **SINE** | `ESCE` | Civil & Environmental Engineering | `CIVENGR`, `CIVENG` |
| **SINE** | `ESECE` | Electrical & Computer Engineering | `ECE` |
| **SINE** | `ESAS` | Astronautics | `ASTRENGR`, `SPACE` |
| **SINE** | `ESIS` | SINE Core Engineering *(Interdisciplinary)* | `ENGR` *(Taught by cross-department faculty)* |
| **SIBS** | `BSBI` | Biology | `BIOLOGY` |
| **SIBS** | `BSCH` | Chemistry | `CHEM` |
| **SIBS** | `BSMS` | Mathematical Sciences | `MATH`, `DATASCI`, `OPSRSCH` |
| **SIBS** | `BSPM` | Physics & Meteorology | `PHYSICS`, `METEOR` |
| **HASS** | `HSBL` | Behavioral Sciences & Leadership | `BEHSCI`, `LDRSHP` |
| **HASS** | `HSEG` | Economics & Geosciences | `ECON`, `GEO` |
| **HASS** | `HSEN` | English & Fine Arts | `ENGLISH`, `CREATART`, `EAP`, `COMMSTRT`, `LRNSTRT` |
| **HASS** | `HSHI` | History | `HISTORY` |
| **HASS** | `HSLA` | Law | `LAW` |
| **HASS** | `HSLC` | Foreign Languages & Cultures | `ARABIC`, `CHINESE`, `FRENCH`, `GERMAN`, `JAPANESE`, `PORTUGSE`, `RUSSIAN`, `SPANISH`, `FORARSTU` |
| **HASS** | `HSMA` | Management | `MGT` |
| **HASS** | `HSMI` | Military & Strategic Studies | `MSS` |
| **HASS** | `HSPS` | Political Science | `POLSCI`, `SOCSCI` |
| **HASS** | `HSPY` | Philosophy | `PHILOS` |

> **Note on Commissioning Education (CE)**: Non-academic commissioning courses (`CE`) are automatically excluded as they are not administered by the Academic Division.

---

## ⚙️ Analytical Methodology & Attribution Formulas

1. **Faculty Name Resolution & Deduplication**:
   * Uses regex normalization to strip suffixes (`Jr.`, `Sr.`, `II`, `III`), remove middle names/initials, and match names against the official Faculty Directory to resolve disparate campus records to single canonical instructors.
2. **Co-Teaching Split ($1/k$ Attribution)**:
   * When a course section is team-taught by $k$ co-instructors, credit and contact load are divided equally:
     * Section Share = $(1 / k) 	imes 	ext{Duration Weight}$
     * Cadet Contact Share = $(	ext{Enrolled Cadets} / k) 	imes 	ext{Duration Weight}$
3. **Course Duration Weighting**:
   * Full semester courses: weight = $1.0$
   * Quarter / half-semester courses: weight = $0.5$
4. **Student Credit Hours (SCH)**:
   * $	ext{SCH} = 	ext{Enrolled Cadets} 	imes 	ext{Credit Units}$
5. **Academic Advising Load**:
   * Aggregates cadet advisor assignments, resolves co-advisors, and pairs advisee counts directly with teaching profiles.

---

## 💻 Python CLI Usage (Data Generation)

To process registrar enrollment files and generate the web dashboard JSON and department rosters:

```bash
# Process enrollment files across semesters
python main.py "Teaching_Load_*.csv"

# Process without generating starter rosters
python main.py "Teaching_Load_*.csv" --no-rosters
```

### Outputs Generated:
* `dashboard/data/workload_data.json`: Comprehensive data contract powering the web dashboard.
* `rosters/starter_roster_[DEPT].csv`: 21 pre-populated roster CSV templates for Department Heads containing assigned instructors, actual teaching sections, contact loads, and cadet advisees.

---

## 🧪 Verification & Test Suite

Run the automated regression test suite:

```bash
python -m unittest discover -s tests
```

*All 10 unit tests verify school metadata, department aliasing, name resolution, advisee attribution, duration weighting, and mathematical metrics aggregation.*

---

## 📁 Repository Structure

```
├── .github/workflows/deploy-pages.yml  # Automated GitHub Actions Pages deployment
├── index.html                         # Root redirect to dashboard/
├── analyzer/                          # Python Analytical Engine
│   ├── config.py                      # School & Department metadata, rules, and mappings
│   ├── parser.py                      # CSV ingestion, name cleaning, duration weights
│   ├── metrics.py                     # SCH, 1/k attribution, pipeline, advising metrics
│   ├── name_resolver.py               # Canonical instructor deduplication engine
│   ├── roster_manager.py              # Department starter roster reconciliation
│   ├── roster_generator.py            # Department starter roster CSV exporter
│   └── export_engine.py               # Standardized JSON data contract exporter
├── dashboard/                         # Web Application (Client-Side HTML/JS/CSS)
│   ├── index.html                     # Tabbed analytical executive dashboard
│   ├── css/styles.css                 # USAFA executive design stylesheet
│   ├── js/
│   │   ├── app.js                     # State controller, file loader, drag-and-drop
│   │   ├── charts.js                  # 2x2 Matrix, SCH ranking, and distribution charts
│   │   ├── department_view.js         # Department drilldown, vitals, faculty & course tables
│   │   ├── curriculum_view.js         # Small section and capstone audit controller
│   │   ├── faculty_view.js            # Faculty directory and workload modal controller
│   │   └── whatif_sandbox.js          # Live staffing simulation recalculator
│   └── data/
│       └── template_schema.json       # Anonymized synthetic sample data schema
├── rosters/                           # Generated Department Starter Roster CSVs
├── tests/                             # Automated regression unit tests
├── main.py                            # CLI entry point
└── build_presentation.py              # Executive PowerPoint deck generator
```
