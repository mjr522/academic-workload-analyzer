# Academic Workload & Department Resourcing Architecture

A decoupled, local-first analytics and visualization platform built for the **School of Integrated Engineering**. 

This platform empowers school leadership and department heads to analyze course preparation burdens, student contact hours, elective fragmentation, and academic advising loads—while enabling interactive **"What-If" staffing simulation** and pre-populated **Department Starter Rosters**.

---

## Key Architecture & Privacy Guardrails

1. **100% Local / Air-Gapped Privacy**:
   * The web dashboard runs entirely in client browser memory via the HTML5 `FileReader` API.
   * **No personnel data, names, or cadet records are ever uploaded to any cloud server.**
   * Can be hosted on GitHub Pages as static files (`index.html`, `styles.css`, `app.js`) while all institutional data stays strictly local.
2. **Decoupled Architecture**:
   * **Python Engine (`analyzer/`)**: Ingests raw registrar CSVs, executes $1/k$ co-teaching splits, applies duration weights, rolls programs into official departments (`DFEM`, `DFCS`, `DFAN`, `DFCE`, `DFEC`, `DFAS`), and outputs standard JSON.
   * **Web Dashboard (`dashboard/`)**: A modern, tabbed browser interface (zero Python dependencies) that renders executive quadrant matrices, department drilldowns, and what-if sandboxes.
3. **Multi-Facet Extensibility (The "Boulder" Model)**:
   * Structured to measure all facets of faculty load: **Teaching**, **Administration**, **Research**, **Lab Operations**, and **Cadet Service**.

---

## Directory Structure

```
├── analyzer/                      # Python Analytical Engine
│   ├── config.py                  # Department mappings & course weighting rules
│   ├── parser.py                  # Ingestion, regex name normalization, duration weights
│   ├── metrics.py                 # SCH, 1/k attribution, class pipeline, sub-10 tracking
│   ├── roster_generator.py        # Generates pre-populated Department Starter Rosters
│   └── export_engine.py           # Standardized JSON data contract exporter
│
├── dashboard/                     # Static Web Application
│   ├── index.html                 # Modern tabbed dashboard
│   ├── css/styles.css             # Executive stylesheet
│   ├── js/
│   │   ├── app.js                 # State, local file loader, privacy toggle, tab router
│   │   ├── charts.js              # 2x2 Matrix & SCH ranking visualizations
│   │   ├── department_view.js     # Department drilldowns & majors pipeline
│   │   ├── curriculum_view.js     # Sub-10 section audit & capstone fragmentation
│   │   ├── faculty_view.js        # Faculty directory & drilldown modal
│   │   └── whatif_sandbox.js      # Live staffing recalculation & scenario export
│   └── data/
│       └── template_schema.json   # Anonymized sample data template
│
├── rosters/                       # Generated Department Starter Rosters
├── tests/                         # Verification & Math Unit Tests
├── main.py                        # CLI Entry Point
└── build_presentation.py          # Executive PowerPoint Deck Generator
```

---

## Quick Start Guide

### 1. Ingest Enrollment Data & Compute Metrics
Run the Python engine on your enrollment CSVs:

```bash
# Ingest single or multiple semester files
python main.py "Teaching_Load_*.csv"

# Ingest without generating starter rosters
python main.py "Teaching Load over Time no names.csv" --no-rosters
```

This will:
* Clean instructor names and apply $1/k$ co-teaching splits.
* Combine academic disciplines into official departments (`DFEM` = Mech + Systems; `DFCS` = CS + Cyber).
* Compute Student Credit Hours (SCH), section size distributions, and flag sections $\le 10$ cadets.
* Export `dashboard/data/workload_data.json`.
* Generate pre-populated Starter Rosters in `rosters/` for each Department Head.

### 2. Launch the Interactive Dashboard
Double-click [`dashboard/index.html`](dashboard/index.html) to open it in any web browser (Chrome, Edge, Firefox, Safari).
* **Load Local Data**: Click **"📁 Load Local Data JSON"** and select any `workload_data.json` file.
* **Privacy Toggle**: Click **"👁️ Names Visible / 🔒 Names Masked"** to instantly sanitize instructor names for wider leadership briefings.
* **"What-If" Sandbox**: Simulate faculty role promotions or department transfers, click **"⚡ Recalculate Scenario Live"**, and click **"💾 Export Scenario JSON"** to save your proposal.

---

## Department Structure Mapping

| Department Code | Department Name | Included Subjects / Programs |
| :--- | :--- | :--- |
| **`DFEM`** | Mechanical Engineering | `MECHENGR`, `SYSENGR` |
| **`DFCS`** | Computer Science | `COMPSCI`, `CYBERSCI` |
| **`DFAN`** | Aeronautics | `AEROENGR` |
| **`DFCE`** | Civil & Environmental Engineering | `CIVENGR` |
| **`DFEC`** | Electrical & Computer Engineering | `ECE` |
| **`DFAS`** | Astronautics | `ASTRENGR` |
| **`INTERDIS`**| Interdisciplinary Programs | `ENGR`, `DATASCI` |

---

## Running Verification Tests

Run the test suite to verify mathematical attribution and parser integrity:

```bash
python tests/test_parser.py
python tests/test_statistics.py
```
