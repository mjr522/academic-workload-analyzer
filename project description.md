# Academic Teaching Load & Department Resourcing Analyzer
## Project Description, Methodology, & Architecture Guide

---

## 1. Executive Overview & Purpose

The **Academic Teaching Load & Department Resourcing Analyzer** is an analytical suite designed to evaluate, compare, and visualize faculty teaching workloads and departmental resourcing across higher education institutions.

### Core Objectives:
1. **Differentiate Preparation vs. Student Contact Burden**: Separate course preparation requirements (lecture prep, syllabus design, lab setups) from direct student contact burden (grading, office hours, mentoring).
2. **Prevent Skew from Outlier & Modular Courses**: Properly account for 1-on-1 independent studies, half-semester courses, quarter-semester modular blocks, and non-academic activities (`PHYED`, `ARMNSHP`, `AVIATION`).
3. **Solve Multi-Department Cross-Teaching Double Counting**: Accurately attribute faculty teaching across multiple academic disciplines to their primary home department so that institution-wide headcounts remain 100% deduplicated and authentic.
4. **Deliver Executive-Ready Interactive Visualization**: Provide decision-makers with a self-contained, interactive HTML dashboard featuring a **2×2 Resourcing Quadrant Matrix**, workload ranking benchmarks, longitudinal trend tracking, and real-time client-side configuration.

---

## 2. Analytical Methodology & Mathematical Formulas

### 2.1 Course Duration & Section Weighting Model
Standard raw section counts distort teaching load by treating an independent study or a 10-lesson modular block identically to a 40-lesson laboratory lecture course. The system applies the following semester-equivalent weighting:

| Course Format / Identifier | Section Preparation Weight | Cadet Contact Weight (Semester-Equivalent) | Practical Rationale |
| :--- | :---: | :---: | :--- |
| **Standard Full-Semester** | **`1.00` sec** | **`1.00` stu** | Regular 40-lesson semester course (e.g. `MATH 141`, `MECHENGR 330`). |
| **Half-Semester Courses** | **`0.50` sec** | **`0.50` stu** | 20-lesson courses (e.g. `COMMSTRT 101`, `COMMSTRT 101X`). Teaching two half-semester sections of 20 cadets equals 20.0 full-semester student load and 1.0 section prep. |
| **Quarter-Semester Blocks** | **`0.25` sec** | **`0.25` stu** | 10-lesson modular blocks (sections ending in `A`, `B`, `C`, `D` in modular subjects). Teaching four 10-lesson blocks equals 1.0 section prep. |
| **Independent Study (`499`)** | **`0.00` sec** | **`1.00` stu** | 1-on-1 directed research. Carries **0.0 section prep load** (no classroom lectures), but awards full student contact credit per cadet mentored. |
| **Full-Semester Experimental (`'X'`)**| **`1.00` sec** | **`1.00` stu** | Full 40-lesson experimental courses (e.g. `AEROENGR 206X`, `CIVENGR 486X`). |

---

### 2.2 Co-Teaching Attribution Model
When a section has $k$ co-instructors:
* **Preparation Burden per Instructor**:
  $$\text{Allocated Sections} = \frac{\text{Section Weight}}{k}$$
* **Student Contact Burden per Instructor**:
  $$\text{Allocated Students} = \frac{\text{Cadet Count} \times \text{Cadet Weight}}{k}$$
* **Headcount Metrics**: Total enrolled cadet seats (`cadet_seats`) and unique individual cadet IDs (`unique_cadets`) are also preserved.

---

### 2.3 Cross-Teaching Faculty Deduplication (Primary Home Department Rollup)
* **The Problem**: Instructors frequently teach interdisciplinary service courses (e.g., an instructor teaching Mechanical Engineering courses plus general Engineering or Systems Engineering courses). Without adjustment, that person is counted as a separate faculty member in every department, artificially inflating institutional headcount and diluting department averages.
* **The Solution**: The engine identifies each instructor's **Primary Home Department** (the subject with their highest section load, with student load as tie-breaker). All teaching contributions—including cross-department service courses—roll up into their primary department.
* **Result**: Total faculty across all departments equals the exact count of unique physical instructors ($N = 48$).

---

### 2.4 Statistical Measures
For each department and cohort, the engine computes:
* **Count ($N$)** of faculty and sections
* **Min, Max, Mean, Median**
* **Sample Standard Deviation ($s$)**:
  $$s = \sqrt{\frac{1}{N-1} \sum_{i=1}^N (x_i - \bar{x})^2}$$
* **Total Sum ($\sum x$)**

---

## 3. Project Tooling & File Architecture

```
├── teaching_load_analyzer.py        # Core analytical engine, CLI, & self-contained HTML dashboard generator
├── generate_multi_semester_data.py  # Synthetic multi-semester dataset generator for longitudinal modeling
├── verify_statistics.py             # Deterministic unit test suite for statistical & attribution verification
├── test_name_parser.py              # Unit tests for instructor name parsing and suffix handling
├── project description.md           # This comprehensive project documentation guide
└── output_multi_semester/           # Default output directory containing generated reports & dashboards
    ├── teaching_load_dashboard.html # Standalone interactive HTML Executive Dashboard
    ├── subject_summary.csv          # Institutional & departmental resourcing summary spreadsheet
    ├── instructor_summary.csv       # Individual faculty workload & primary department spreadsheet
    ├── subject_trends_by_semester.csv # Longitudinal trends by department across terms
    ├── instructor_trends_by_semester.csv # Longitudinal trends by instructor across terms
    ├── section_details.csv          # Comprehensive audit log of every course section and weighting
    └── by_semester/                 # Isolated per-term CSV exports
```

### Detailed Tool Descriptions:

#### 1. `teaching_load_analyzer.py`
The primary production CLI and engine.
* **Input**: One or more enrollment CSV files (supports wildcards/globs).
* **Processing**: Normalizes instructor names, determines course weights, deduplicates faculty cross-assignments, calculates exact statistics, and compiles multi-semester trends.
* **Output**: Generates full CSV reports and builds a self-contained HTML dashboard with embedded JSON data.

#### 2. `generate_multi_semester_data.py`
Generates realistic multi-semester synthetic datasets (`Fall 2024`, `Spring 2025`, `Fall 2025`, `Spring 2026`) modeled after real enrollment templates to facilitate longitudinal trend analysis and visualization prototyping.

#### 3. `verify_statistics.py`
A testing script with hand-calculated ground-truth assertions verifying:
* Calculation of `mean`, `median`, `min`, `max`, and `stddev` across odd, even, and single-element distributions.
* Mathematical correctness of Split Attribution ($1/k$) and Independent Study ($0.0$ sec / $1.0$ stu) formulas.

#### 4. `test_name_parser.py`
Validates regex parsing of instructor strings, ensuring robust handling of:
* Multiple instructors separated by semicolons or commas (`"Doe, Jane; Smith, John"`).
* Generational and academic suffixes (`"Smith Jr., John"`, `"Brown III, David"`, `"White Ph.D., Walter"`).
* Null/unassigned tokens (`"TBD"`, `"STAFF"`, `"UNKNOWN"`).

---

## 4. Interactive Executive Dashboard Guide (`teaching_load_dashboard.html`)

The dashboard is completely **standalone and self-contained** (runs directly in any web browser without requiring a backend server or database):

### Visual Features:
1. **Summary KPI Cards**: Live metrics for Total Cadets, Deduplicated Faculty Count, Average Cadets/Instructor, Average Sections/Instructor, and Average Class Size.
2. **2×2 Resourcing Quadrant Matrix (Bubble Chart)**:
   * **X-Axis**: Weighted Sections / Instructor (Course Prep Load).
   * **Y-Axis**: Cadets / Instructor (Student Contact Load).
   * **Bubble Size**: Total Cadets Enrolled in the Department.
   * **Dynamic Y-Axis Color Gradient**:
     * 🔴 **Top (High Contact Burden)**: Red
     * 🟡 **Middle (Moderate Contact Burden)**: Amber / Yellow
     * 🟢 **Bottom (Lower Contact Burden)**: Green
     * **X-Axis Modulation**: High section loads are shaded slightly darker/richer; low section loads are shaded lighter/softer.
3. **Department Workload Ranking Bar Chart**: Compares department student contact loads against the overall institutional benchmark.
4. **Multi-Semester Longitudinal Trend Line Chart**: Automatically activates when multiple terms are loaded to track department workload trajectories over time.
5. **Interactive Instructor Detail Modal**: Clicking any instructor reveals their complete teaching history, section sizes, weights, and co-teaching partners.

### ⚙️ Administrator Options & Live Recalculation Engine (Settings Tab):
* **Subject Inclusion Presets**:
  * **Engineering Division (Default)**: Focuses exclusively on the 10 Engineering & Computing disciplines (`AEROENGR`, `ASTRENGR`, `CIVENGR`, `COMPSCI`, `CYBERSCI`, `DATASCI`, `ECE`, `ENGR`, `MECHENGR`, `SYSENGR`).
  * **All Academic**: Includes all academic departments while filtering non-academic outliers (`PHYED`, `ARMNSHP`, `AVIATION`).
  * **Select All / Clear**: Custom selection controls.
* **Faculty Attribution Toggle**:
  * **Primary Home Dept (Default)**: Deduplicates cross-teaching faculty and rolls up full workloads.
  * **Course Subject (Unconsolidated)**: Raw course-level subject rosters.
* **Live Weight Customizers**: Direct numeric inputs for Independent Study, Half-Semester, Quarter-Semester, and Full-Semester weights that recalculate every chart, table, and metric in real time in the browser.

---

## 5. Input Data Schema Requirements

The analyzer expects enrollment CSV files containing the following column headers:

| Column Header | Type | Description |
| :--- | :--- | :--- |
| `Term` | String / Integer | Semester code (e.g. `2251`, `2258`, `Fall 2024`). |
| `Class Nbr` | String / Integer | Unique section identifier. |
| `Subject` | String | Academic subject code (e.g. `MECHENGR`, `COMPSCI`, `MATH`). |
| `Course Number`| String | Course catalog number (e.g. `101`, `206X`, `499`). |
| `Course Title` | String | Official course name (e.g. `"INDEPENDENT STUDY"`, `"THERMODYNAMICS"`). |
| `Section` | String | Section identifier (e.g. `"M1"`, `"T2A"`, `"M3B"`). |
| `Cadet EMPLID` | String | Unique cadet/student identifier (each row represents 1 enrollment). |
| `Instructor Name(s)` / `Corrected Names` | String | Instructor name string (supports multiple names and suffixes). |

---

## 6. Execution & CLI Command Reference

### Basic Run (Default Engineering Focus):
```powershell
python teaching_load_analyzer.py "Teaching_Load_*.csv" --output-dir "./output_multi_semester"
```

### Run with All Academic Departments (Excluding Non-Academic Outliers):
```powershell
python teaching_load_analyzer.py "Teaching_Load_*.csv" --include-academic --output-dir "./output_all_academic"
```

### Run with Full Institutional Scope (Include All Subjects):
```powershell
python teaching_load_analyzer.py "Teaching_Load_*.csv" --include-all --output-dir "./output_all_subjects"
```

### Run for Specific Custom Programs:
```powershell
python teaching_load_analyzer.py "Teaching_Load_*.csv" --include-only MECHENGR AEROENGR CIVENGR --output-dir "./output_custom"
```

### Run Unit Tests:
```powershell
python verify_statistics.py
python test_name_parser.py
```
