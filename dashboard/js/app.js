/**
 * Academic Workload & Resourcing Dashboard
 * Application State & Tab Controller
 */

let currentActiveTab = 'tab-executive';
let currentSchoolScope = 'ALL_DEPTS';
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
 * If root.modes is present (pre-baked by python engine), uses high-performance pre-calculated snapshot.
 * If root.modes is missing (older or third-party JSON), dynamically recalculates all metrics on the fly!
 */
function getActiveWorkloadData() {
    if (!window.currentWorkloadData) return null;
    const root = window.currentWorkloadData;

    // Ensure globals on window
    window.excludeCapstones = excludeCapstones;
    window.exclude499s = exclude499s;
    window.currentFacultyScope = currentFacultyScope;

    // 1. Reactive Workbench Engine (Primary reactive source of truth)
    if (window.workbenchState && window.workbenchState.activeCalculatedData) {
        return window.workbenchState.activeCalculatedData;
    }

    let modeKey = 'core';
    if (excludeCapstones && exclude499s) modeKey = 'core';
    else if (excludeCapstones && !exclude499s) modeKey = 'no_capstones';
    else if (!excludeCapstones && exclude499s) modeKey = 'no_499s';
    else modeKey = 'all';

    if (root.modes && root.modes[modeKey]) {
        const modeData = root.modes[modeKey];
        return {
            ...root,
            ...modeData,
            activeMode: modeKey,
            sections_audit: root.sections_audit || []
        };
    }

    // Dynamic client-side fallback if modes dictionary is missing
    return computeDynamicClientWorkloadData(root, excludeCapstones, exclude499s);
}

/**
 * Dynamic client-side metrics recalculation engine
 */
function computeDynamicClientWorkloadData(root, exCap, ex499) {
    const allSecs = root.sections_audit || [];
    const activeSecs = allSecs.filter(s => (!exCap || !s.is_capstone) && (!ex499 || !s.is_499));

    const total_sections = activeSecs.length;
    const total_cadet_seats = activeSecs.reduce((acc, s) => acc + (s.cadets !== undefined ? s.cadets : (s.cadet_count !== undefined ? s.cadet_count : 0)), 0);
    const total_sch = activeSecs.reduce((acc, s) => {
        const cadets = s.cadets !== undefined ? s.cadets : (s.cadet_count !== undefined ? s.cadet_count : 0);
        const credits = s.credits !== undefined ? s.credits : (s.credit_units !== undefined ? s.credit_units : 3.0);
        return acc + (cadets * credits);
    }, 0);
    const overall_avg_section_size = total_sections > 0 ? Math.round((total_cadet_seats / total_sections) * 100) / 100 : 0;
    const sub10Secs = activeSecs.filter(s => s.is_sub10);
    const overall_sub10_count = sub10Secs.length;
    const overall_sub10_pct = total_sections > 0 ? Math.round((overall_sub10_count / total_sections) * 1000) / 10 : 0;

    const instSecMap = {};
    activeSecs.forEach(s => {
        (s.instructors || []).forEach(inst => {
            if (!instSecMap[inst]) instSecMap[inst] = [];
            instSecMap[inst].push(s);
        });
    });

    const faculty_directory = (root.faculty_directory || []).map(f => {
        const mySecs = instSecMap[f.instructor] || [];
        const nSecs = mySecs.length;
        let weighted_sections = 0;
        let cadet_load_allocated = 0;
        let total_seats = 0;
        const coursesTaughtSet = new Set();
        const assignments = [];

        mySecs.forEach(s => {
            const coCount = Math.max(1, (s.instructors || []).length);
            const w = Math.round((1.0 / coCount) * 100) / 100;
            const cCount = s.cadets !== undefined ? s.cadets : (s.cadet_count !== undefined ? s.cadet_count : 0);
            const allocCadets = Math.round(cCount / coCount);
            weighted_sections += w;
            cadet_load_allocated += allocCadets;
            total_seats += cCount;
            const courseStr = `${s.subject || ''} ${s.course_nbr || ''}`.trim();
            if (courseStr) coursesTaughtSet.add(courseStr);

            assignments.push({
                course: courseStr,
                title: s.title || '',
                section: s.section || '',
                term: s.term || '',
                cadets: cCount,
                sec_weight: w,
                weight_type: coCount > 1 ? 'Co-Taught' : 'Solo',
                co_instructors: (s.instructors || []).filter(i => i !== f.instructor)
            });
        });

        weighted_sections = Math.round(weighted_sections * 100) / 100;
        const avg_size = nSecs > 0 ? Math.round((total_seats / nSecs) * 10) / 10 : 0;
        const expSec = f.expected_sections !== undefined ? f.expected_sections : 3.0;
        const delta = Math.round((weighted_sections - expSec) * 100) / 100;

        return {
            ...f,
            weighted_sections: weighted_sections,
            cadet_load_allocated: cadet_load_allocated,
            total_cadet_seats: total_seats,
            avg_section_size: avg_size,
            courses_taught: Array.from(coursesTaughtSet),
            course_assignments: assignments,
            section_delta: delta
        };
    });

    const departments = (root.departments || []).map(dept => {
        const subjs = dept.subjects_included || [];
        const deptSecs = activeSecs.filter(s =>
            s.department === dept.dept_code ||
            (dept.dept_code === 'ESECE' && s.department === 'ESEC') ||
            (subjs && subjs.includes(s.subject))
        );

        const d_sections = deptSecs.length;
        const d_seats = deptSecs.reduce((acc, s) => acc + (s.cadets !== undefined ? s.cadets : (s.cadet_count !== undefined ? s.cadet_count : 0)), 0);
        const d_sch = deptSecs.reduce((acc, s) => {
            const cadets = s.cadets !== undefined ? s.cadets : (s.cadet_count !== undefined ? s.cadet_count : 0);
            const credits = s.credits !== undefined ? s.credits : (s.credit_units !== undefined ? s.credit_units : 3.0);
            return acc + (cadets * credits);
        }, 0);
        const d_courses = new Set(deptSecs.map(s => `${s.subject} ${s.course_nbr}`)).size;
        const d_sub10 = deptSecs.filter(s => s.is_sub10).length;
        const d_sub10_pct = d_sections > 0 ? Math.round((d_sub10 / d_sections) * 1000) / 10 : 0;

        const dist = {'<=10': 0, '11-15': 0, '16-20': 0, '21-25': 0, '26+': 0};
        deptSecs.forEach(s => {
            const sz = s.cadets !== undefined ? s.cadets : (s.cadet_count !== undefined ? s.cadet_count : 0);
            if (sz <= 10) dist['<=10']++;
            else if (sz <= 15) dist['11-15']++;
            else if (sz <= 20) dist['16-20']++;
            else if (sz <= 25) dist['21-25']++;
            else dist['26+']++;
        });

        const lvls = {'100': 0, '200': 0, '300': 0, '400': 0, 'Other': 0};
        deptSecs.forEach(s => {
            const nbr = String(s.course_nbr || '').replace(/\D/g, '');
            if (nbr.startsWith('1')) lvls['100']++;
            else if (nbr.startsWith('2')) lvls['200']++;
            else if (nbr.startsWith('3')) lvls['300']++;
            else if (nbr.startsWith('4')) lvls['400']++;
            else lvls['Other']++;
        });

        const deptFac = faculty_directory.filter(f => f.primary_dept === dept.dept_code);
        const teachingFac = deptFac.filter(f => f.weighted_sections > 0);
        const facCount = teachingFac.length > 0 ? teachingFac.length : deptFac.length;
        const totWeighted = teachingFac.reduce((acc, f) => acc + f.weighted_sections, 0);
        const totCadets = teachingFac.reduce((acc, f) => acc + f.cadet_load_allocated, 0);
        const secPerInst = teachingFac.length > 0 ? Math.round((totWeighted / teachingFac.length) * 100) / 100 : 0;
        const stuPerInst = teachingFac.length > 0 ? Math.round((totCadets / teachingFac.length) * 100) / 100 : 0;

        return {
            ...dept,
            total_sections: d_sections,
            total_courses: d_courses,
            total_cadet_seats: d_seats,
            total_sch: d_sch,
            sub10_sections_count: d_sub10,
            sub10_percentage: d_sub10_pct,
            section_size_distribution: dist,
            course_levels: lvls,
            faculty_count: facCount,
            teaching_faculty_count: teachingFac.length,
            sections_per_inst_mean: secPerInst,
            students_per_inst_mean: stuPerInst
        };
    });

    const schools = (root.schools || []).map(sch => {
        const schDepts = departments.filter(d => (d.school_code || 'OTHER') === sch.school_code);
        const schSecs = schDepts.reduce((acc, d) => acc + d.total_sections, 0);
        const schSeats = schDepts.reduce((acc, d) => acc + d.total_cadet_seats, 0);
        const schSCH = schDepts.reduce((acc, d) => acc + d.total_sch, 0);
        const schSub10 = schDepts.reduce((acc, d) => acc + d.sub10_sections_count, 0);
        const schSub10Pct = schSecs > 0 ? Math.round((schSub10 / schSecs) * 1000) / 10 : 0;
        const schFac = schDepts.reduce((acc, d) => acc + (d.teaching_faculty_count || 0), 0);
        const schWeighted = schDepts.reduce((acc, d) => acc + ((d.sections_per_inst_mean || 0) * (d.teaching_faculty_count || 0)), 0);
        const schCadets = schDepts.reduce((acc, d) => acc + ((d.students_per_inst_mean || 0) * (d.teaching_faculty_count || 0)), 0);
        const secPerInst = schFac > 0 ? Math.round((schWeighted / schFac) * 100) / 100 : 0;
        const stuPerInst = schFac > 0 ? Math.round((schCadets / schFac) * 100) / 100 : 0;

        return {
            ...sch,
            total_sections: schSecs,
            total_cadet_seats: schSeats,
            total_sch: schSCH,
            sub10_sections_count: schSub10,
            sub10_percentage: schSub10Pct,
            teaching_faculty_count: schFac,
            sections_per_inst_mean: secPerInst,
            students_per_inst_mean: stuPerInst
        };
    });

    const instKPIs = {
        total_sections,
        total_cadet_seats,
        total_sch,
        overall_avg_section_size,
        overall_sub10_count,
        overall_sub10_pct,
        unique_faculty_count: faculty_directory.filter(f => f.weighted_sections > 0).length,
        teaching_faculty_count: faculty_directory.filter(f => f.weighted_sections > 0).length,
        all_billets_count: faculty_directory.length
    };

    return {
        ...root,
        institution_kpis: instKPIs,
        school_kpis: instKPIs,
        schools,
        departments,
        faculty_directory,
        sections_audit: allSecs,
        activeMode: `client_${exCap ? 'no_cap' : 'with_cap'}_${ex499 ? 'no_499' : 'with_499'}`
    };
}

function updateToggleButtonsUI() {
    window.excludeCapstones = excludeCapstones;
    window.exclude499s = exclude499s;
    window.currentFacultyScope = currentFacultyScope;

    const root = window.currentWorkloadData;
    const allSecs = root ? (root.sections_audit || []) : [];
    const totalCapstones = allSecs.filter(s => s.is_capstone).length;
    const total499s = allSecs.filter(s => s.is_499).length;

    // 1. Capstone button
    const capBtn = document.getElementById('toggleCapstonesBtn');
    const capIcon = document.getElementById('capstoneIcon');
    const capLabel = document.getElementById('capstoneLabel');
    if (capBtn) {
        capBtn.className = `filter-toggle-btn ${excludeCapstones ? 'excluded' : 'included'}`;
        const capCountStr = totalCapstones > 0 ? (excludeCapstones ? ` (-${totalCapstones})` : ` (+${totalCapstones})`) : '';
        if (capIcon) capIcon.textContent = excludeCapstones ? '🚫' : '⚠️';
        if (capLabel) capLabel.textContent = `Capstones: ${excludeCapstones ? 'Excluded' : 'Included'}${capCountStr}`;
        capBtn.title = excludeCapstones 
            ? `Senior Design Capstones are currently EXCLUDED from section counts and faculty loads (${totalCapstones} sections hidden). Click to include.`
            : `Senior Design Capstones are currently INCLUDED in section counts (${totalCapstones} sections active). Click to exclude.`;
    }

    // 2. 499s button
    const studyBtn = document.getElementById('toggle499sBtn');
    const studyIcon = document.getElementById('study499Icon');
    const studyLabel = document.getElementById('study499Label');
    if (studyBtn) {
        studyBtn.className = `filter-toggle-btn ${exclude499s ? 'excluded' : 'included'}`;
        const studyCountStr = total499s > 0 ? (exclude499s ? ` (-${total499s})` : ` (+${total499s})`) : '';
        if (studyIcon) studyIcon.textContent = exclude499s ? '🚫' : '⚠️';
        if (studyLabel) studyLabel.textContent = `499s: ${exclude499s ? 'Excluded' : 'Included'}${studyCountStr}`;
        studyBtn.title = exclude499s
            ? `Independent Study 499s are currently EXCLUDED from section counts and faculty loads (${total499s} sections hidden). Click to include.`
            : `Independent Study 499s are currently INCLUDED in section counts (${total499s} sections active). Click to exclude.`;
    }

    // 3. Live Baseline Status Pill in Filter Toolbar
    const badge = document.getElementById('filterImpactBadge');
    if (badge) {
        if (excludeCapstones && exclude499s) {
            badge.style.background = '#eff6ff';
            badge.style.color = '#1d4ed8';
            badge.style.border = '1px solid #bfdbfe';
            badge.innerHTML = `🛡️ <strong>Core Clean View:</strong> Capstones Excluded (-${totalCapstones}) | 499s Excluded (-${total499s})`;
        } else if (!excludeCapstones && !exclude499s) {
            badge.style.background = '#fef3c7';
            badge.style.color = '#92400e';
            badge.style.border = '1px solid #fde68a';
            badge.innerHTML = `⚠️ <strong>All Offerings View:</strong> Capstones Included (+${totalCapstones}) | 499s Included (+${total499s})`;
        } else if (!excludeCapstones && exclude499s) {
            badge.style.background = '#f5f3ff';
            badge.style.color = '#6b21a8';
            badge.style.border = '1px solid #ddd6fe';
            badge.innerHTML = `📐 <strong>Capstones Included (+${totalCapstones})</strong> | 499s Excluded (-${total499s})`;
        } else {
            badge.style.background = '#f0fdf4';
            badge.style.color = '#15803d';
            badge.style.border = '1px solid #bbf7d0';
            badge.innerHTML = `🔬 <strong>499s Included (+${total499s})</strong> | Capstones Excluded (-${totalCapstones})`;
        }
    }
}

function toggleCapstonesFilter() {
    excludeCapstones = !excludeCapstones;
    if (window.workbenchState && window.workbenchState.policy) {
        window.workbenchState.policy.excludeCapstones = excludeCapstones;
        recomputeWorkbenchMetrics();
    }
    updateToggleButtonsUI();
    refreshAllViews();
}

function toggle499sFilter() {
    exclude499s = !exclude499s;
    if (window.workbenchState && window.workbenchState.policy) {
        window.workbenchState.policy.exclude499s = exclude499s;
        recomputeWorkbenchMetrics();
    }
    updateToggleButtonsUI();
    refreshAllViews();
}

function setFacultyScope(scope) {
    currentFacultyScope = scope;
    window.currentFacultyScope = scope;
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

    // Initialize Reactive Workbench State Engine
    if (typeof initWorkbenchState === 'function') {
        initWorkbenchState(data);
    }

    updateToggleButtonsUI();

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
        if (sel && sel.value) {
            if (typeof renderDrilldown === 'function') {
                renderDrilldown(sel.value);
            } else {
                renderDepartmentDetails(sel.value);
            }
        }
    } else if (currentActiveTab === 'tab-curriculum') {
        renderCurriculumView();
    } else if (currentActiveTab === 'tab-faculty') {
        renderFacultyDirectory();
    } else if (currentActiveTab === 'tab-whatif') {
        renderWhatIfFacultyTable();
    } else if (currentActiveTab === 'tab-admin') {
        if (typeof renderAdminPolicyTab === 'function') renderAdminPolicyTab();
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
    if (scope === 'ALL_DEPTS') {
        const numActiveDepts = (data.departments || []).filter(d => (d.total_sections > 0 || d.faculty_count > 0)).length;
        badge.innerHTML = `USAFA Academic Division (${schools.length || 3} Schools | ${numActiveDepts} Active Departments)`;
    } else if (scope === 'ALL') {
        const numActiveDepts = (data.departments || []).filter(d => (d.total_sections > 0 || d.faculty_count > 0)).length;
        badge.innerHTML = `USAFA Academic Division (${schools.length || 3} Schools Aggregated | ${numActiveDepts} Active Departments)`;
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
    if (scope === 'ALL' || scope === 'ALL_DEPTS') {
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
        if (sel && sel.value) {
            if (typeof renderDrilldown === 'function') {
                renderDrilldown(sel.value);
            } else {
                renderDepartmentDetails(sel.value);
            }
        }
    } else if (tabId === 'tab-curriculum') {
        renderCurriculumView();
    } else if (tabId === 'tab-faculty') {
        renderFacultyDirectory();
    } else if (tabId === 'tab-whatif') {
        renderWhatIfFacultyTable();
    } else if (tabId === 'tab-admin') {
        if (typeof renderAdminPolicyTab === 'function') renderAdminPolicyTab();
    }
}
