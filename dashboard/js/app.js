/**
 * Academic Workload & Resourcing Dashboard
 * Application State & Tab Controller
 */

let currentActiveTab = 'tab-executive';
let currentSchoolScope = 'ALL';

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    // 1. Setup file drop zone
    setupFileDropZone();

    // 2. Setup JSON file input handler
    const fileInput = document.getElementById('jsonFileInput');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }

    // 3. Attempt to auto-fetch pre-baked workload_data.json
    tryAutoLoadData();
}

function tryAutoLoadData() {
    fetch('data/workload_data.json')
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error ${response.status}`);
            return response.json();
        })
        .then(data => {
            loadDataset(data);
        })
        .catch(err => {
            console.log("No auto-load data found or failed to fetch:", err.message);
        });
}

function setupFileDropZone() {
    const dropZone = document.getElementById('dropZone');
    if (!dropZone) return;

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('dragover');
        }, false);
    });

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            processJsonFile(files[0]);
        }
    }, false);
}

function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        processJsonFile(files[0]);
    }
}

function processJsonFile(file) {
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target.result);
            if (!data.school_kpis && !data.institution_kpis) {
                alert("Error parsing JSON file. Please ensure it is a valid workload_data.json export.");
                return;
            }
            loadDataset(data);
        } catch (err) {
            alert(`Error reading JSON file: ${err.message}`);
        }
    };
    reader.readAsText(file);
}

function loadDataset(data) {
    window.currentWorkloadData = data;

    // Determine active school scope from selector
    const scopeSelect = document.getElementById('schoolScopeSelect');
    if (scopeSelect) {
        currentSchoolScope = scopeSelect.value || 'ALL';
    }

    // Update Executive KPIs & Dean Badge
    updateExecutiveKPIs(data, currentSchoolScope);
    updateSchoolDeanBadge(data, currentSchoolScope);

    // Render Executive Charts
    renderExecutiveCharts(data, currentSchoolScope);

    // Initialize View Controllers
    initDepartmentDropdown(data.departments);
    renderCurriculumView();
    renderFacultyDirectory();
    initWhatIfSandbox();

    // Show data loaded banner
    const banner = document.getElementById('dataLoadedBadge');
    if (banner) {
        const kpis = data.institution_kpis || data.school_kpis;
        const termStr = (data.meta && data.meta.terms) ? data.meta.terms.join(', ') : 'Active';
        banner.style.display = 'inline-flex';
        banner.textContent = `Data Loaded: ${(kpis.total_sections || 0).toLocaleString()} Sections (${termStr})`;
    }
}

function changeSchoolScope(scope) {
    currentSchoolScope = scope;
    if (!window.currentWorkloadData) return;

    updateExecutiveKPIs(window.currentWorkloadData, currentSchoolScope);
    updateSchoolDeanBadge(window.currentWorkloadData, currentSchoolScope);
    renderExecutiveCharts(window.currentWorkloadData, currentSchoolScope);
}

function updateSchoolDeanBadge(data, scope) {
    const badge = document.getElementById('schoolDeanBadge');
    if (!badge || !data) return;

    const schools = data.schools || [];
    if (scope === 'ALL') {
        const numActiveDepts = (data.departments || []).filter(d => d.total_sections > 0).length;
        badge.innerHTML = `USAFA Academic Division (${schools.length || 3} Schools | ${numActiveDepts} Active Departments)`;
    } else {
        const s = schools.find(item => item.school_code === scope);
        if (s) {
            badge.innerHTML = `<strong>${s.dean}</strong> | ${s.departments_count} Departments | ${s.faculty_count} Faculty`;
        } else {
            badge.innerHTML = `School Scope: ${scope}`;
        }
    }
}

function updateExecutiveKPIs(data, scope) {
    if (!data) return;

    let kpis;
    if (scope === 'ALL') {
        kpis = data.institution_kpis || data.school_kpis;
    } else {
        const s = (data.schools || []).find(item => item.school_code === scope);
        if (s) {
            kpis = {
                total_cadet_seats: s.total_cadet_seats,
                unique_faculty_count: s.faculty_count,
                total_sections: s.total_sections,
                total_sch: s.total_sch,
                overall_avg_section_size: s.overall_avg_section_size,
                overall_sub10_count: s.sub10_sections_count,
                overall_sub10_pct: s.sub10_percentage
            };
        } else {
            kpis = data.institution_kpis || data.school_kpis;
        }
    }

    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = (val !== null && val !== undefined) ? val : '-';
    };

    setVal('kpiTotalCadets', (kpis.total_cadet_seats || 0).toLocaleString());
    setVal('kpiFacultyCount', kpis.unique_faculty_count !== undefined ? kpis.unique_faculty_count : (kpis.faculty_count || 0));
    setVal('kpiTotalSections', (kpis.total_sections || 0).toLocaleString());
    setVal('kpiTotalSCH', Math.round(kpis.total_sch || 0).toLocaleString());
    setVal('kpiAvgSecSize', kpis.overall_avg_section_size || 0);
    setVal('kpiSub10Secs', `${(kpis.overall_sub10_count || 0).toLocaleString()} (${kpis.overall_sub10_pct || 0}%)`);
}

function switchTab(tabId) {
    currentActiveTab = tabId;

    // Hide all tab panes
    document.querySelectorAll('.tab-pane').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.nav-tab-btn').forEach(btn => btn.classList.remove('active'));

    // Show target tab pane
    const targetPane = document.getElementById(tabId);
    if (targetPane) targetPane.style.display = 'block';

    const targetBtn = document.getElementById(`btn-${tabId}`);
    if (targetBtn) targetBtn.classList.add('active');

    // Tab-specific refreshes
    if (tabId === 'tab-executive' && window.currentWorkloadData) {
        renderExecutiveCharts(window.currentWorkloadData, currentSchoolScope);
    } else if (tabId === 'tab-department' && window.currentWorkloadData) {
        const sel = document.getElementById('deptSelect');
        if (sel && sel.value) renderDepartmentDetails(sel.value);
    } else if (tabId === 'tab-curriculum') {
        renderCurriculumView();
    } else if (tabId === 'tab-faculty') {
        renderFacultyDirectory();
    } else if (tabId === 'tab-whatif') {
        renderWhatIfFacultyTable();
    }
}\n