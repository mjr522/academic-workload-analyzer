/**
 * Academic Workload & Resourcing Dashboard - Main Application Controller
 * Handles local JSON file loading, tab routing, state management, and privacy masking.
 */

window.currentWorkloadData = null;
window.maskFacultyNames = false;
let currentActiveTab = 'tab-executive';

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    setupFilePicker();
    setupPrivacyToggle();

    // Try loading default workload_data.json if present
    fetch('./data/workload_data.json')
        .then(response => {
            if (response.ok) return response.json();
            throw new Error('Default JSON not found');
        })
        .then(data => {
            loadDataset(data);
        })
        .catch(() => {
            console.log("No default workload_data.json loaded. Waiting for user upload.");
        });
}

function setupFilePicker() {
    const fileInput = document.getElementById('jsonFileInput');
    if (!fileInput) return;

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const parsed = JSON.parse(event.target.result);
                loadDataset(parsed);
                alert(`Successfully loaded: ${file.name}`);
            } catch (err) {
                alert("Error parsing JSON file. Please ensure it is a valid workload_data.json export.");
            }
        };
        reader.readAsText(file);
    });
}

function setupPrivacyToggle() {
    const btn = document.getElementById('privacyToggleBtn');
    if (!btn) return;

    btn.addEventListener('click', () => {
        window.maskFacultyNames = !window.maskFacultyNames;
        if (window.maskFacultyNames) {
            btn.classList.add('active');
            btn.textContent = '🔒 Names Masked (Public View)';
        } else {
            btn.classList.remove('active');
            btn.textContent = '👁️ Names Visible (Internal View)';
        }

        // Refresh faculty views
        if (window.currentWorkloadData) {
            renderDepartmentFacultyTable(document.getElementById('deptSelect').value);
            renderFacultyDirectory();
            renderWhatIfFacultyTable();
        }
    });
}

function loadDataset(data) {
    window.currentWorkloadData = data;

    // Update KPIs
    updateExecutiveKPIs(data);

    // Render Charts
    renderQuadrantChart(data.departments, data.school_kpis.overall_avg_stu_per_inst);
    renderRankingChart(data.departments, data.school_kpis.overall_avg_sec_per_inst);

    // Initialize views
    initDepartmentDropdown(data.departments);
    renderCurriculumView();
    renderFacultyDirectory();
    initWhatIfSandbox();

    // Show data loaded notification
    const banner = document.getElementById('dataLoadedBadge');
    if (banner) {
        banner.style.display = 'inline-flex';
        banner.textContent = `Data Loaded: ${data.school_kpis.total_sections.toLocaleString()} Sections (${data.meta.terms.join(', ') || 'Term 2268'})`;
    }
}

function updateExecutiveKPIs(data) {
    const kpis = data.school_kpis;
    document.getElementById('kpiTotalCadets').textContent = kpis.total_cadet_seats.toLocaleString();
    document.getElementById('kpiFacultyCount').textContent = kpis.unique_faculty_count;
    document.getElementById('kpiTotalSections').textContent = kpis.total_sections.toLocaleString();
    document.getElementById('kpiTotalSCH').textContent = Math.round(kpis.total_sch).toLocaleString();
    document.getElementById('kpiAvgSecSize').textContent = kpis.overall_avg_section_size;
    document.getElementById('kpiSub10Secs').textContent = `${kpis.overall_sub10_count} (${kpis.overall_sub10_pct}%)`;
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
        renderQuadrantChart(window.currentWorkloadData.departments, window.currentWorkloadData.school_kpis.overall_avg_stu_per_inst);
        renderRankingChart(window.currentWorkloadData.departments, window.currentWorkloadData.school_kpis.overall_avg_sec_per_inst);
    } else if (tabId === 'tab-curriculum') {
        renderCurriculumView();
    } else if (tabId === 'tab-faculty') {
        renderFacultyDirectory();
    }
}
