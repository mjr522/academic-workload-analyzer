/**
 * "What-If" Scenario Sandbox Controller
 * Enables live adjustments of course weights, faculty allocations, and scenario export.
 */

let scenarioModifiedData = null;

function initWhatIfSandbox() {
    const data = window.currentWorkloadData;
    if (!data) return;

    // Clone clean state
    scenarioModifiedData = JSON.parse(JSON.stringify(data));
    renderWhatIfFacultyTable();
}

function renderWhatIfFacultyTable() {
    const tbody = document.getElementById('whatifFacultyTbody');
    if (!tbody || !scenarioModifiedData) return;
    tbody.innerHTML = '';

    const depts = scenarioModifiedData.departments.map(d => d.dept_code);
    const faculty = scenarioModifiedData.faculty_directory || [];

    faculty.slice(0, 50).forEach((f, idx) => {
        const displayName = window.maskFacultyNames ? `Faculty ${String(idx + 1).padStart(2, '0')}` : f.instructor;
        const tr = document.createElement('tr');

        // Department Options
        let deptOpts = '';
        depts.forEach(d => {
            deptOpts += `<option value="${d}" ${d === f.primary_dept ? 'selected' : ''}>${d}</option>`;
        });

        tr.innerHTML = `
            <td><strong>${displayName}</strong></td>
            <td>
                <select onchange="updateFacultyDepartment('${f.instructor.replace(/'/g, "\\'")}', this.value)" style="padding:4px 8px; font-size:12px;">
                    ${deptOpts}
                </select>
            </td>
            <td>
                <select onchange="updateFacultyTier('${f.instructor.replace(/'/g, "\\'")}', this.value)" style="padding:4px 8px; font-size:12px;">
                    <option value="line" selected>Line Faculty (3 secs)</option>
                    <option value="course_dir">Course Director (2 secs)</option>
                    <option value="dh">Dept Head / Lab Dir (1 sec)</option>
                    <option value="courtesy">MOA Courtesy (1 sec)</option>
                </select>
            </td>
            <td class="num"><strong>${f.weighted_sections}</strong></td>
            <td class="num"><strong>${f.cadet_load_allocated}</strong></td>
            <td style="font-size:11px; color:#64748b;">${f.courses_taught.join(', ')}</td>
        `;
        tbody.appendChild(tr);
    });
}

function updateFacultyDepartment(instName, newDept) {
    if (!scenarioModifiedData) return;
    const f = scenarioModifiedData.faculty_directory.find(x => x.instructor === instName);
    if (f) {
        f.primary_dept = newDept;
    }
}

function updateFacultyTier(instName, newTier) {
    if (!scenarioModifiedData) return;
    const f = scenarioModifiedData.faculty_directory.find(x => x.instructor === instName);
    if (f) {
        f.tier = newTier;
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
        d.faculty_count = facList.length;
        if (facList.length > 0) {
            const totSecs = facList.reduce((acc, f) => acc + f.weighted_sections, 0);
            const totStus = facList.reduce((acc, f) => acc + f.cadet_load_allocated, 0);
            d.sections_per_inst_mean = Math.round((totSecs / facList.length) * 100) / 100;
            d.students_per_inst_mean = Math.round((totStus / facList.length) * 100) / 100;
        } else {
            d.sections_per_inst_mean = 0.0;
            d.students_per_inst_mean = 0.0;
        }
    });

    // Update global active dataset
    window.currentWorkloadData = scenarioModifiedData;

    // Refresh views
    updateExecutiveKPIs(scenarioModifiedData);
    renderQuadrantChart(scenarioModifiedData.departments, scenarioModifiedData.school_kpis.overall_avg_stu_per_inst);
    renderRankingChart(scenarioModifiedData.departments, scenarioModifiedData.school_kpis.overall_avg_sec_per_inst);
    initDepartmentDropdown(scenarioModifiedData.departments);

    alert("What-If scenario applied! The 2x2 Matrix, Department Drilldowns, and KPI cards have been updated live.");
}

function exportScenarioJSON() {
    if (!scenarioModifiedData) return;
    const blob = new Blob([JSON.stringify(scenarioModifiedData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `whatif_workload_scenario_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function exportScenarioCSV() {
    if (!scenarioModifiedData) return;
    let csv = "Dept_Code,Department_Name,Faculty_Count,Total_Sections,Total_SCH,Sec_Per_Inst,Stu_Per_Inst,Sub10_Pct\n";
    scenarioModifiedData.departments.forEach(d => {
        csv += `${d.dept_code},"${d.dept_name}",${d.faculty_count},${d.total_sections},${d.total_sch},${d.sections_per_inst_mean},${d.students_per_inst_mean},${d.sub10_percentage}%\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `whatif_department_summary_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}
