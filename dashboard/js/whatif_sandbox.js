/**
 * "What-If" Scenario Sandbox Controller
 * Enables live adjustments of course weights, faculty allocations, tier calibration, and scenario export.
 */

let scenarioModifiedData = null;
let hasWhatIfCustomEdits = false;

function initWhatIfSandbox(force = false) {
    const data = (typeof getActiveWorkloadData === 'function') ? getActiveWorkloadData() : window.currentWorkloadData;
    if (!data) return;

    if (!hasWhatIfCustomEdits || force) {
        scenarioModifiedData = JSON.parse(JSON.stringify(data));
        if (force) hasWhatIfCustomEdits = false;
        renderWhatIfFacultyTable();
    }
}

function resetWhatIfSandbox() {
    initWhatIfSandbox(true);
}

function onWhatIfSchoolFilterChange() {
    const school = (document.getElementById('whatifSchoolFilter') ? document.getElementById('whatifSchoolFilter').value : 'ALL');
    const deptSel = document.getElementById('whatifDeptFilter');
    const data = scenarioModifiedData || ((typeof getActiveWorkloadData === 'function') ? getActiveWorkloadData() : window.currentWorkloadData);
    if (deptSel && data && data.departments) {
        const currentDept = deptSel.value;
        deptSel.innerHTML = '<option value="ALL">All Departments</option>';
        const filteredDepts = school === 'ALL' 
            ? data.departments 
            : data.departments.filter(d => (d.school_code || 'OTHER') === school);
        filteredDepts.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.dept_code;
            opt.textContent = `${d.dept_code} — ${d.dept_name}`;
            deptSel.appendChild(opt);
        });
        if (filteredDepts.some(d => d.dept_code === currentDept)) {
            deptSel.value = currentDept;
        } else {
            deptSel.value = 'ALL';
        }
    }
    renderWhatIfFacultyTable();
}

function renderWhatIfFacultyTable() {
    const tbody = document.getElementById('whatifFacultyTbody');
    if (!tbody) return;
    if (!scenarioModifiedData) {
        initWhatIfSandbox();
        if (!scenarioModifiedData) return;
    }
    tbody.innerHTML = '';

    const depts = (scenarioModifiedData.departments || []).map(d => d.dept_code);
    let faculty = scenarioModifiedData.faculty_directory || [];

    const q = (document.getElementById('whatifSearch') ? document.getElementById('whatifSearch').value : '').toLowerCase();
    const schoolFilter = (document.getElementById('whatifSchoolFilter') ? document.getElementById('whatifSchoolFilter').value : 'ALL');
    const deptFilter = (document.getElementById('whatifDeptFilter') ? document.getElementById('whatifDeptFilter').value : 'ALL');

    if (schoolFilter !== 'ALL') {
        faculty = faculty.filter(f => (f.school_code || 'OTHER') === schoolFilter);
    }
    if (deptFilter !== 'ALL') {
        faculty = faculty.filter(f => f.primary_dept === deptFilter);
    }
    if (q) {
        faculty = faculty.filter(f =>
            (f.instructor && f.instructor.toLowerCase().includes(q)) ||
            (f.primary_dept && f.primary_dept.toLowerCase().includes(q)) ||
            (f.courses_taught && f.courses_taught.some(c => c.toLowerCase().includes(q)))
        );
    }

    if (faculty.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#64748b; padding:16px;">No faculty matching scenario filter criteria.</td></tr>';
        return;
    }

    faculty.forEach((f, idx) => {
        const displayName = window.maskFacultyNames ? `Faculty ${String(idx + 1).padStart(2, '0')}` : f.instructor;
        const tr = document.createElement('tr');

        // Department Options
        let deptOpts = '';
        depts.forEach(d => {
            deptOpts += `<option value="${d}" ${d === f.primary_dept ? 'selected' : ''}>${d}</option>`;
        });

        // Determine current normalized tier
        const tStr = (f.expected_tier || '').toLowerCase();
        let selectedTier = 'Line_Faculty';
        if (tStr.includes('lab') && tStr.includes('staff')) selectedTier = 'Lab_Staff';
        else if (tStr.includes('course') || tStr.includes('dir')) selectedTier = 'Course_Director';
        else if (tStr.includes('head') || tStr.includes('dh')) selectedTier = 'Dept_Head';
        else if (tStr.includes('adjunct') || tStr.includes('chair')) selectedTier = 'Adjunct_Chair';
        else if (tStr.includes('moa') || tStr.includes('cour')) selectedTier = 'MOA_Courtesy';
        else if (tStr.includes('lab')) selectedTier = 'Lab_Staff';

        tr.innerHTML = `
            <td><strong>${displayName}</strong></td>
            <td>
                <select onchange="updateWhatIfFacultyDepartment('${f.instructor.replace(/'/g, "\\'")}', this.value)" style="padding:4px 8px; font-size:12px; border-radius:4px; border:1px solid var(--border);">
                    ${deptOpts}
                </select>
            </td>
            <td>
                <select onchange="updateWhatIfFacultyTier('${f.instructor.replace(/'/g, "\\'")}', this.value)" style="padding:4px 8px; font-size:12px; border-radius:4px; border:1px solid var(--border); font-weight:600;">
                    <option value="Line_Faculty" ${selectedTier === 'Line_Faculty' ? 'selected' : ''}>Line Faculty (3.0 secs)</option>
                    <option value="Course_Director" ${selectedTier === 'Course_Director' ? 'selected' : ''}>Course Director (2.0 secs)</option>
                    <option value="Dept_Head" ${selectedTier === 'Dept_Head' ? 'selected' : ''}>Dept Head / Lab Dir (1.0 sec)</option>
                    <option value="Adjunct_Chair" ${selectedTier === 'Adjunct_Chair' ? 'selected' : ''}>Adjunct / Chair (0.5 secs)</option>
                    <option value="MOA_Courtesy" ${selectedTier === 'MOA_Courtesy' ? 'selected' : ''}>MOA / Courtesy (0.0 secs)</option>
                    <option value="Lab_Staff" ${selectedTier === 'Lab_Staff' ? 'selected' : ''}>Lab Staff (0.0 secs)</option>
                </select>
            </td>
            <td class="num"><strong>${f.weighted_sections}</strong></td>
            <td class="num"><strong>${f.cadet_load_allocated}</strong></td>
            <td style="font-size:11px; color:#64748b;">${(f.courses_taught || []).join(', ')}</td>
        `;
        tbody.appendChild(tr);
    });
}

function updateWhatIfFacultyDepartment(instName, newDept) {
    if (!scenarioModifiedData) return;
    const f = scenarioModifiedData.faculty_directory.find(x => x.instructor === instName);
    if (f) {
        f.primary_dept = newDept;
        hasWhatIfCustomEdits = true;
    }
}

function updateWhatIfFacultyTier(instName, newTierKey) {
    if (!scenarioModifiedData) return;
    const f = scenarioModifiedData.faculty_directory.find(x => x.instructor === instName);
    if (f) {
        const tierMap = {
            'Line_Faculty': { name: 'Line_Faculty (3 secs)', secs: 3.0 },
            'Course_Director': { name: 'Course_Director (2 secs)', secs: 2.0 },
            'Dept_Head': { name: 'Dept_Head / Lab_Dir (1 sec)', secs: 1.0 },
            'Adjunct_Chair': { name: 'Adjunct / Chair (0.5 secs)', secs: 0.5 },
            'MOA_Courtesy': { name: 'MOA / Courtesy (0.0 secs)', secs: 0.0 },
            'Lab_Staff': { name: 'Lab Staff (0.0 secs)', secs: 0.0 }
        };
        const tierInfo = tierMap[newTierKey] || tierMap['Line_Faculty'];
        f.expected_tier = tierInfo.name;
        f.expected_sections = tierInfo.secs;
        f.section_delta = Math.round((f.weighted_sections - f.expected_sections) * 100) / 100;
        hasWhatIfCustomEdits = true;
    }
}

function applyWhatIfRecalculation() {
    if (!scenarioModifiedData) return;

    // Recalculate department averages based on updated faculty assignments
    const deptFacultyMap = {};
    scenarioModifiedData.departments.forEach(d => {
        deptFacultyMap[d.dept_code] = [];
    });

    scenarioModifiedData.faculty_directory.forEach(f => {
        if (deptFacultyMap[f.primary_dept]) {
            deptFacultyMap[f.primary_dept].push(f);
        }
    });

    scenarioModifiedData.departments.forEach(d => {
        const facList = deptFacultyMap[d.dept_code] || [];
        const teachingFacList = facList.filter(f => f.weighted_sections > 0);
        d.all_billets_count = facList.length;
        d.teaching_faculty_count = teachingFacList.length;
        d.faculty_count = teachingFacList.length > 0 ? teachingFacList.length : facList.length;

        if (teachingFacList.length > 0) {
            const totSecs = teachingFacList.reduce((acc, f) => acc + f.weighted_sections, 0);
            const totStus = teachingFacList.reduce((acc, f) => acc + f.cadet_load_allocated, 0);
            d.sections_per_inst_mean = Math.round((totSecs / teachingFacList.length) * 100) / 100;
            d.students_per_inst_mean = Math.round((totStus / teachingFacList.length) * 100) / 100;
        } else {
            d.sections_per_inst_mean = 0.0;
            d.students_per_inst_mean = 0.0;
        }

        if (facList.length > 0) {
            const totAllSecs = facList.reduce((acc, f) => acc + f.weighted_sections, 0);
            const totAllStus = facList.reduce((acc, f) => acc + f.cadet_load_allocated, 0);
            d.sections_per_all_inst_mean = Math.round((totAllSecs / facList.length) * 100) / 100;
            d.students_per_all_inst_mean = Math.round((totAllStus / facList.length) * 100) / 100;
        } else {
            d.sections_per_all_inst_mean = 0.0;
            d.students_per_all_inst_mean = 0.0;
        }
    });

    // Update global active dataset
    window.currentWorkloadData = scenarioModifiedData;
    if (typeof refreshAllViews === 'function') {
        refreshAllViews();
    }

    alert("What-If scenario applied! The Executive Overview, Quadrant Bubble Chart, Department Drilldowns, and KPI cards have been updated live.");
}

function exportCalibratedJSON() {
    exportScenarioJSON();
}

function exportScenarioJSON() {
    if (!scenarioModifiedData) return;
    const exportPayload = {
        ...scenarioModifiedData,
        scenario_metadata: {
            calibrated_at: new Date().toISOString(),
            description: "Calibrated staffing scenario generated from USAFA Academic Workload Platform"
        }
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workload_data_calibrated_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function exportScenarioCSV() {
    if (!scenarioModifiedData) return;
    let csv = "Dept_Code,Department_Name,Teaching_Faculty,All_Billets,Total_Sections,Total_SCH,Sec_Per_Teaching_Inst,Sec_Per_All_Billet,Stu_Per_Inst,Sub10_Pct\n";
    scenarioModifiedData.departments.forEach(d => {
        csv += `${d.dept_code},"${d.dept_name}",${d.teaching_faculty_count || d.faculty_count},${d.all_billets_count || d.faculty_count},${d.total_sections},${d.total_sch},${d.sections_per_inst_mean},${d.sections_per_all_inst_mean || d.sections_per_inst_mean},${d.students_per_inst_mean},${d.sub10_percentage}%\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `whatif_department_summary_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}
