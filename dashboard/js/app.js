/**
 * Academic Workload & Resourcing Dashboard
 * Application State & Tab Controller
 */

let currentActiveTab = 'tab-executive';
let currentSchoolScope = 'ALL';
let excludeCapstones = true;
let exclude499s = true;
let currentFacultyScope = 'TEACHING'; // 'TEACHING' | 'ALL'

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    // 1. Setup file drop zone
    setupFileDropZone();

    // 2. Setup JSON file input handler
    const fileInput = document.getElementById('jsonFileInput');
    if (fileInput) {
        fileInput.addEventListener('click', () => { fileInput.value = ''; });
        fileInput.addEventListener('change', handleFileSelect);
    }

    // 3. Setup privacy masking button
    const privBtn = document.getElementById('privacyToggleBtn');
    if (privBtn) {
        privBtn.addEventListener('click', () => {
            window.maskFacultyNames = !window.maskFacultyNames;
            privBtn.classList.toggle('active', window.maskFacultyNames);
            privBtn.innerHTML = window.maskFacultyNames 
                ? '🔒 Names Masked (Public Presentation View)' 
                : '👁️ Names Visible (Internal View)';
            refreshAllViews();
        });
    }

    // 4. Attempt to auto-fetch pre-baked workload_data.json
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
            const alertEl = document.getElementById('noDataAlert');
            if (alertEl) alertEl.style.display = 'block';
        });
}

function setupFileDropZone() {
    ['dragenter', 'dragover'].forEach(eventName => {
        window.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            document.body.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        window.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            document.body.classList.remove('dragover');
        }, false);
    });

    window.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt ? dt.files : null;
        if (files && files.length > 0) {
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
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target.result);
            if (!data.school_kpis && !data.institution_kpis && !data.modes) {
                alert("Error: The selected JSON file does not appear to be a valid workload_data.json export.");
                return;
            }
            loadDataset(data);
            console.log("Successfully loaded workload dataset:", data);
        } catch (err) {
            alert(`Error reading JSON file: ${err.message}`);
            console.error(err);
        }
    };
    reader.onerror = (e) => {
        alert("Failed to read file from disk.");
        console.error(e);
    };
    reader.readAsText(file);
}

/**
 * Returns the currently active data snapshot based on Capstone and 499 exclusion toggles.
 */
function getActiveWorkloadData() {
    if (!window.currentWorkloadData) return null;
    const root = window.currentWorkloadData;
    if (!root.modes) {
        return root;
    }

    let modeKey = 'core';
    if (excludeCapstones && exclude499s) modeKey = 'core';
    else if (excludeCapstones && !exclude499s) modeKey = 'no_capstones';
    else if (!excludeCapstones && exclude499s) modeKey = 'no_499s';
    else modeKey = 'all';

    const modeData = root.modes[modeKey] || root.modes['core'] || root;
    return {
        ...root,
        ...modeData,
        activeMode: modeKey,
        sections_audit: root.sections_audit || []
    };
}

function toggleCapstonesFilter() {
    excludeCapstones = !excludeCapstones;
    const btn = document.getElementById('toggleCapstonesBtn');
    const icon = document.getElementById('capstoneIcon');
    const label = document.getElementById('capstoneLabel');
    if (btn) {
        btn.className = `filter-toggle-btn ${excludeCapstones ? 'excluded' : 'included'}`;
    }
    if (icon) icon.textContent = excludeCapstones ? '🚫' : '⚠️';
    if (label) label.textContent = excludeCapstones ? 'Capstones: Excluded' : 'Capstones: Included';
    refreshAllViews();
}

function toggle499sFilter() {
    exclude499s = !exclude499s;
    const btn = document.getElementById('toggle499sBtn');
    const icon = document.getElementById('study499Icon');
    const label = document.getElementById('study499Label');
    if (btn) {
        btn.className = `filter-toggle-btn ${exclude499s ? 'excluded' : 'included'}`;
    }
    if (icon) icon.textContent = exclude499s ? '🚫' : '⚠️';
    if (label) label.textContent = exclude499s ? '499s: Excluded' : '499s: Included';
    refreshAllViews();
}

function setFacultyScope(scope) {
    currentFacultyScope = scope;
    const btnTeaching = document.getElementById('btnScopeTeaching');
    const btnAll = document.getElementById('btnScopeAll');
    if (btnTeaching && btnAll) {
        if (scope === 'TEACHING') {
            btnTeaching.classList.add('active');
            btnAll.classList.remove('active');
        } else {
            btnAll.classList.add('active');
            btnTeaching.classList.remove('active');
        }
    }
    refreshAllViews();
}

function loadDataset(data) {
    window.currentWorkloadData = data;

    const alertEl = document.getElementById('noDataAlert');
    if (alertEl) alertEl.style.display = 'none';

    // Determine active school scope from selector
    const scopeSelect = document.getElementById('schoolScopeSelect');
    if (scopeSelect) {
        currentSchoolScope = scopeSelect.value || 'ALL';
    }

    // Populate department filters in department, faculty, and what-if tabs
    const initialSnapshot = getActiveWorkloadData();
    populateDeptDropdowns(initialSnapshot.departments);

    try {
        if (typeof initWhatIfSandbox === 'function') {
            initWhatIfSandbox();
        }
    } catch (e) {
        console.error("Error initializing whatif sandbox:", e);
    }

    refreshAllViews();

    // Show data loaded banner
    const banner = document.getElementById('dataLoadedBadge');
    if (banner) {
        const kpis = initialSnapshot.institution_kpis || initialSnapshot.school_kpis || {};
        const termStr = (initialSnapshot.meta && initialSnapshot.meta.terms && initialSnapshot.meta.terms.length > 0) ? initialSnapshot.meta.terms.join(', ') : 'Active';
        banner.style.display = 'inline-flex';
        banner.textContent = `Data Loaded: ${(kpis.total_sections || 0).toLocaleString()} Sections (${termStr})`;
    }
}

function populateDeptDropdowns(departments) {
    if (!departments) return;
    try { initDepartmentDropdown(departments); } catch (e) { console.error("Error in initDepartmentDropdown:", e); }

    // Populate faculty tab dept filter
    const fDeptSel = document.getElementById('facultyDeptFilter');
    if (fDeptSel) {
        const currentVal = fDeptSel.value || 'ALL';
        fDeptSel.innerHTML = '<option value="ALL">All Departments</option>';
        departments.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.dept_code;
            opt.textContent = `${d.dept_code} — ${d.dept_name}`;
            fDeptSel.appendChild(opt);
        });
        fDeptSel.value = currentVal;
    }

    // Populate what-if tab dept filter
    const wDeptSel = document.getElementById('whatifDeptFilter');
    if (wDeptSel) {
        const currentVal = wDeptSel.value || 'ALL';
        wDeptSel.innerHTML = '<option value="ALL">All Departments</option>';
        departments.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.dept_code;
            opt.textContent = `${d.dept_code} — ${d.dept_name}`;
            wDeptSel.appendChild(opt);
        });
        wDeptSel.value = currentVal;
    }
}

function refreshAllViews() {
    const data = getActiveWorkloadData();
    if (!data) return;

    try {
        updateExecutiveKPIs(data, currentSchoolScope);
        updateSchoolDeanBadge(data, currentSchoolScope);
        renderExecutiveCharts(data, currentSchoolScope);
    } catch (e) {
        console.error("Error updating executive views:", e);
    }

    if (currentActiveTab === 'tab-department') {
        const sel = document.getElementById('deptSelect');
        if (sel && sel.value) renderDepartmentDetails(sel.value);
    } else if (currentActiveTab === 'tab-curriculum') {
        renderCurriculumView();
    } else if (currentActiveTab === 'tab-faculty') {
        renderFacultyDirectory();
    } else if (currentActiveTab === 'tab-whatif') {
        renderWhatIfFacultyTable();
    }
}

function changeSchoolScope(scope) {
    currentSchoolScope = scope;
    const data = getActiveWorkloadData();
    if (!data) return;

    updateExecutiveKPIs(data, currentSchoolScope);
    updateSchoolDeanBadge(data, currentSchoolScope);
    renderExecutiveCharts(data, currentSchoolScope);
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
            const facDisplay = currentFacultyScope === 'ALL'
                ? `${s.all_billets_count || s.faculty_count} Total Billets`
                : `${s.teaching_faculty_count || s.faculty_count} Teaching Faculty`;
            badge.innerHTML = `<strong>${s.school_name || s.short_name}</strong> | ${s.departments_count} Departments | ${facDisplay}`;
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
                unique_faculty_count: currentFacultyScope === 'ALL' ? (s.all_billets_count || s.faculty_count) : (s.teaching_faculty_count || s.faculty_count),
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

    const facCount = currentFacultyScope === 'ALL'
        ? (kpis.all_billets_count !== undefined ? kpis.all_billets_count : (kpis.unique_faculty_count || kpis.faculty_count || 0))
        : (kpis.teaching_faculty_count !== undefined ? kpis.teaching_faculty_count : (kpis.unique_faculty_count || kpis.faculty_count || 0));

    setVal('kpiTotalCadets', (kpis.total_cadet_seats || 0).toLocaleString());
    setVal('kpiFacultyCount', facCount);
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

    const data = getActiveWorkloadData();

    // Tab-specific refreshes
    if (tabId === 'tab-executive' && data) {
        renderExecutiveCharts(data, currentSchoolScope);
    } else if (tabId === 'tab-department' && data) {
        const sel = document.getElementById('deptSelect');
        if (sel && sel.value) renderDepartmentDetails(sel.value);
    } else if (tabId === 'tab-curriculum') {
        renderCurriculumView();
    } else if (tabId === 'tab-faculty') {
        renderFacultyDirectory();
    } else if (tabId === 'tab-whatif') {
        renderWhatIfFacultyTable();
    }
}
