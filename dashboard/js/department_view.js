/**
 * Department Drilldown View Controller
 */

function initDepartmentDropdown(departments) {
    const select = document.getElementById('deptSelect');
    if (!select) return;
    select.innerHTML = '';

    const schoolGroups = [
        { code: 'SINE', label: '⚙️ SINE — School of Integrated Engineering Sciences' },
        { code: 'SIBS', label: '🔬 SIBS — School of Integrated Basic Sciences' },
        { code: 'HASS', label: '📚 HASS — School of Integrated Humanities, Arts, & Social Sciences' },
        { code: 'OTHER', label: 'Other Academic Units' }
    ];

    schoolGroups.forEach(grp => {
        const groupDepts = (departments || []).filter(d => (d.school_code || 'OTHER') === grp.code);
        if (groupDepts.length > 0) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = grp.label;
            groupDepts.forEach(d => {
                const opt = document.createElement('option');
                opt.value = d.dept_code;
                opt.textContent = `${d.dept_code} — ${d.dept_name}`;
                optgroup.appendChild(opt);
            });
            select.appendChild(optgroup);
        }
    });

    select.onchange = () => {
        const selectedCode = select.value;
        renderDepartmentDetails(selectedCode);
    };

    if (select.value) {
        renderDepartmentDetails(select.value);
    } else if (departments && departments.length > 0) {
        renderDepartmentDetails(departments[0].dept_code);
    }
}

function setTextSafe(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = (val !== null && val !== undefined) ? val : '-';
}

function renderDepartmentDetails(deptCode) {
    const data = window.currentWorkloadData;
    if (!data) return;

    const dept = data.departments.find(d => d.dept_code === deptCode);
    if (!dept) return;

    // Vitals
    setTextSafe('deptTitle', `${dept.dept_code} — ${dept.dept_name}`);
    setTextSafe('deptSubjs', `Academic Programs: ${(dept.subjects_included || []).join(', ')}`);
    setTextSafe('deptMetricCourses', dept.total_courses || 0);
    setTextSafe('deptMetricSections', dept.total_sections || 0);
    setTextSafe('deptMetricSeats', (dept.total_cadet_seats || 0).toLocaleString());
    setTextSafe('deptMetricSCH', Math.round(dept.total_sch || 0).toLocaleString());
    setTextSafe('deptMetricMajors', (dept.declared_majors_total || 0).toLocaleString());
    setTextSafe('deptMetricSub10', `${dept.sub10_sections_count || 0} (${dept.sub10_percentage || 0}%)`);

    // Major Breakdown Tags
    const majorsContainer = document.getElementById('deptMajorsList');
    if (majorsContainer) {
        majorsContainer.innerHTML = '';
        if (dept.declared_majors && Object.keys(dept.declared_majors).length > 0) {
            for (const [m, cnt] of Object.entries(dept.declared_majors)) {
                const span = document.createElement('span');
                span.className = 'badge badge-dept';
                span.style.padding = '5px 10px';
                span.style.fontSize = '12px';
                span.innerHTML = `<strong>${m}:</strong> ${cnt} cadets`;
                majorsContainer.appendChild(span);
            }
        } else {
            majorsContainer.innerHTML = '<span style="color:#64748b; font-size:12px;">No declared majors mapped.</span>';
        }
    }

    // Advising Panel
    const adv = dept.advising_stats || {};
    setTextSafe('deptAdvTotal', adv.total_advisees || 0);
    setTextSafe('deptAdvActive', adv.active_advisors_count || 0);
    setTextSafe('deptAdvAvg', adv.mean_advisees_per_advisor || 0);

    // Course Levels
    const lvl = dept.course_levels || {};
    setTextSafe('deptLvl100', lvl['100'] || 0);
    setTextSafe('deptLvl200', lvl['200'] || 0);
    setTextSafe('deptLvl300', lvl['300'] || 0);
    setTextSafe('deptLvl400', lvl['400'] || 0);

    // Billet & Staffing Status
    const b = dept.billet_summary || {};
    setTextSafe('deptBilletAuth', b.authorized !== undefined ? b.authorized : (dept.faculty_count || 0));
    setTextSafe('deptBilletVac', b.vacant || 0);
    setTextSafe('deptBilletMil', b.filled_military !== undefined ? b.filled_military : (dept.faculty_count || 0));
    setTextSafe('deptBilletCiv', b.filled_civilian || 0);
    setTextSafe('deptBilletMoa', b.moa_adjunct || 0);

    // Render Major Pipeline Chart
    try {
        renderPipelineChart(dept.class_pipeline || {});
    } catch (e) {
        console.warn("Pipeline chart error:", e);
    }

    // Render Section Size Distribution Chart
    try {
        renderDeptSizeDistChart(dept.section_size_distribution || {});
    } catch (e) {
        console.warn("Section size distribution chart error:", e);
    }

    // Department Faculty Table
    try {
        renderDepartmentFacultyTable(dept.dept_code);
    } catch (e) {
        console.warn("Department faculty table error:", e);
    }
}

let currentDeptFacultySort = { col: null, dir: 'desc' };
let currentDeptFacultyCode = null;

function sortDeptFacultyTable(colKey) {
    if (currentDeptFacultySort.col === colKey) {
        currentDeptFacultySort.dir = currentDeptFacultySort.dir === 'desc' ? 'asc' : 'desc';
    } else {
        currentDeptFacultySort.col = colKey;
        currentDeptFacultySort.dir = 'desc'; // Highest to lowest on first click
    }
    if (currentDeptFacultyCode) {
        renderDepartmentFacultyTable(currentDeptFacultyCode);
    }
}

function updateSortIcons() {
    const cols = ['instructor', 'primary_dept', 'weighted_sections', 'cadet_load_allocated', 'advisees_count', 'total_cadet_seats', 'avg_section_size'];
    cols.forEach(c => {
        const el = document.getElementById(`th-sort-${c}`);
        const th = el ? el.closest('th') : null;
        if (el) {
            if (currentDeptFacultySort.col === c) {
                el.textContent = currentDeptFacultySort.dir === 'desc' ? '▼' : '▲';
                if (th) {
                    th.classList.remove('sorted-desc', 'sorted-asc');
                    th.classList.add(currentDeptFacultySort.dir === 'desc' ? 'sorted-desc' : 'sorted-asc');
                }
            } else {
                el.textContent = '↕';
                if (th) {
                    th.classList.remove('sorted-desc', 'sorted-asc');
                }
            }
        }
    });
}

function renderDepartmentFacultyTable(deptCode) {
    currentDeptFacultyCode = deptCode;
    const data = window.currentWorkloadData;
    const tbody = document.getElementById('deptFacultyTbody');
    if (!tbody || !data) return;
    tbody.innerHTML = '';

    updateSortIcons();

    // Department Assigned Faculty strictly filters to faculty whose primary home is this department
    let faculty = (data.faculty_directory || []).filter(f => f.primary_dept === deptCode);

    if (faculty.length === 0) {
        if (deptCode === 'ESIS') {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#64748b; padding:20px;">' +
                '<strong style="color:var(--primary);">No faculty lines organically assigned to ESIS (SINE Core Engineering).</strong><br>' +
                '<span style="font-size:12px;">All core engineering courses (ENGR) are taught by instructors assigned to other academic departments.</span>' +
                '</td></tr>';
        } else {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#64748b; padding:16px;">No faculty currently assigned to this department.</td></tr>';
        }
        return;
    }

    // Apply sorting
    if (currentDeptFacultySort.col) {
        const col = currentDeptFacultySort.col;
        const dir = currentDeptFacultySort.dir;
        faculty.sort((a, b) => {
            let valA = a[col];
            let valB = b[col];

            // If numeric comparison
            if (typeof valA === 'number' || typeof valB === 'number' || ['weighted_sections', 'cadet_load_allocated', 'advisees_count', 'total_cadet_seats', 'avg_section_size'].includes(col)) {
                valA = Number(valA) || 0;
                valB = Number(valB) || 0;
                return dir === 'desc' ? (valB - valA) : (valA - valB);
            }

            // String comparison
            valA = String(valA || '').toLowerCase();
            valB = String(valB || '').toLowerCase();
            return dir === 'desc' ? valB.localeCompare(valA) : valA.localeCompare(valB);
        });
    }

    faculty.forEach((f, idx) => {
        const displayName = window.maskFacultyNames ? `Faculty ${String(idx + 1).padStart(2, '0')}` : f.instructor;
        const isPrimary = f.primary_dept === deptCode;
        const deptBadge = isPrimary 
            ? `<span class="badge badge-dept">${f.primary_dept}</span>`
            : `<span class="badge badge-sub10" title="Primary Home: ${f.primary_dept}">${f.primary_dept} (Cross)</span>`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong style="color:var(--primary); cursor:pointer;" onclick="openFacultyModal('${f.instructor.replace(/'/g, "\\'")}')">${displayName}</strong></td>
            <td>${deptBadge}</td>
            <td class="num"><strong>${f.weighted_sections}</strong></td>
            <td class="num"><strong>${f.cadet_load_allocated}</strong></td>
            <td class="num" style="font-weight:700; color:#0369a1;">${f.advisees_count !== undefined ? f.advisees_count : 0}</td>
            <td class="num">${f.total_cadet_seats}</td>
            <td class="num">${f.avg_section_size}</td>
            <td style="font-size: 11px; color:#64748b;">${(f.courses_taught || []).join(', ')}</td>
        `;
        tbody.appendChild(tr);
    });
}
