/**
 * Department Drilldown View Controller
 */

function initDepartmentDropdown(departments) {
    const select = document.getElementById('deptSelect');
    if (!select) return;
    select.innerHTML = '';

    departments.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.dept_code;
        opt.textContent = `${d.dept_code} - ${d.dept_name}`;
        select.appendChild(opt);
    });

    select.onchange = () => {
        const selectedCode = select.value;
        renderDepartmentDetails(selectedCode);
    };

    if (departments.length > 0) {
        renderDepartmentDetails(departments[0].dept_code);
    }
}

function renderDepartmentDetails(deptCode) {
    const data = window.currentWorkloadData;
    if (!data) return;

    const dept = data.departments.find(d => d.dept_code === deptCode);
    if (!dept) return;

    // Vitals
    document.getElementById('deptTitle').textContent = `${dept.dept_code} — ${dept.dept_name}`;
    document.getElementById('deptSubjs').textContent = `Academic Programs: ${dept.subjects_included.join(', ')}`;
    document.getElementById('deptMetricCourses').textContent = dept.total_courses;
    document.getElementById('deptMetricSections').textContent = dept.total_sections;
    document.getElementById('deptMetricSeats').textContent = dept.total_cadet_seats.toLocaleString();
    document.getElementById('deptMetricSCH').textContent = Math.round(dept.total_sch).toLocaleString();
    document.getElementById('deptMetricMajors').textContent = dept.declared_majors_total.toLocaleString();
    document.getElementById('deptMetricSub10').textContent = `${dept.sub10_sections_count} (${dept.sub10_percentage}%)`;

    // Major Breakdown Tags
    const majorsContainer = document.getElementById('deptMajorsList');
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

    // Advising Panel
    const adv = dept.advising_stats;
    document.getElementById('deptAdvTotal').textContent = adv.total_advisees || 0;
    document.getElementById('deptAdvActive').textContent = adv.active_advisors_count || 0;
    document.getElementById('deptAdvAvg').textContent = adv.mean_advisees_per_advisor || 0;

    // Course Levels
    const lvl = dept.course_levels || {};
    document.getElementById('deptLvl100').textContent = lvl['100'] || 0;
    document.getElementById('deptLvl200').textContent = lvl['200'] || 0;
    document.getElementById('deptLvl300').textContent = lvl['300'] || 0;
    document.getElementById('deptLvl400').textContent = lvl['400'] || 0;

    // Render Major Pipeline Chart
    renderPipelineChart(dept.class_pipeline || {});

    // Department Faculty Table
    renderDepartmentFacultyTable(dept.dept_code);
}

function renderDepartmentFacultyTable(deptCode) {
    const data = window.currentWorkloadData;
    const tbody = document.getElementById('deptFacultyTbody');
    if (!tbody || !data) return;
    tbody.innerHTML = '';

    const faculty = data.faculty_directory.filter(f => f.primary_dept === deptCode);
    if (faculty.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#64748b; padding:16px;">No faculty currently mapped directly to this department.</td></tr>';
        return;
    }

    faculty.forEach((f, idx) => {
        const displayName = window.maskFacultyNames ? `Faculty ${String(idx + 1).padStart(2, '0')}` : f.instructor;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${displayName}</strong></td>
            <td><span class="badge badge-dept">${f.primary_dept}</span></td>
            <td class="num"><strong>${f.weighted_sections}</strong></td>
            <td class="num"><strong>${f.cadet_load_allocated}</strong></td>
            <td class="num">${f.total_cadet_seats}</td>
            <td class="num">${f.avg_section_size}</td>
            <td style="font-size: 11px; color:#64748b;">${f.courses_taught.join(', ')}</td>
        `;
        tbody.appendChild(tr);
    });
}
