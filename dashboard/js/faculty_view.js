/**
 * Faculty Workload Directory Controller
 */

function renderFacultyDirectory() {
    const data = window.currentWorkloadData;
    if (!data) return;

    const tbody = document.getElementById('facultyTbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const q = (document.getElementById('facultySearch') ? document.getElementById('facultySearch').value : '').toLowerCase();
    const schoolFilter = (document.getElementById('facultySchoolFilter') ? document.getElementById('facultySchoolFilter').value : 'ALL');

    let list = data.faculty_directory || [];

    if (schoolFilter !== 'ALL') {
        list = list.filter(f => (f.school_code || 'OTHER') === schoolFilter);
    }

    if (q) {
        list = list.filter(f =>
            (f.instructor && f.instructor.toLowerCase().includes(q)) ||
            (f.primary_dept && f.primary_dept.toLowerCase().includes(q)) ||
            (f.courses_taught && f.courses_taught.some(c => c.toLowerCase().includes(q)))
        );
    }

    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" style="text-align:center; color:#64748b; padding:16px;">No matching faculty found.</td></tr>';
        return;
    }

    list.forEach((f, idx) => {
        const displayName = window.maskFacultyNames ? `Faculty ${String(idx + 1).padStart(2, '0')}` : f.instructor;
        const delta = f.section_delta !== undefined ? f.section_delta : 0;
        const isOver = delta > 0.05;
        const isUnder = delta < -0.05;
        const deltaBadge = isOver 
            ? `<span class="badge" style="background:#fee2e2; color:#b91c1c; font-weight:700;">+${delta}</span>`
            : (isUnder 
                ? `<span class="badge" style="background:#fef3c7; color:#92400e; font-weight:700;">${delta}</span>`
                : `<span class="badge" style="background:#f1f5f9; color:#64748b;">0.0</span>`);

        const billetStr = f.billet_status || 'Filled';
        const billetBadge = `<span class="badge" style="background:#f1f5f9; color:#334155; font-size:11px;">${billetStr.split(' ')[0]}</span>`;
        const tierStr = f.expected_tier || 'Line_Faculty';
        const tierBadge = `<span class="badge" style="background:#e0f2fe; color:#0369a1; font-size:11px;" title="${tierStr}">${tierStr.split(' ')[0]}</span>`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong style="color:var(--primary); cursor:pointer;" onclick="openFacultyModal('${f.instructor.replace(/'/g, "\\'")}')">${displayName}</strong></td>
            <td><span class="badge" style="background:#e2e8f0; color:#1e293b; font-weight:600;">${f.school_code || 'OTHER'}</span></td>
            <td><span class="badge badge-dept">${f.primary_dept}</span></td>
            <td>${billetBadge}</td>
            <td>${tierBadge}</td>
            <td class="num"><strong>${f.weighted_sections}</strong></td>
            <td class="num">${deltaBadge}</td>
            <td class="num"><strong>${f.cadet_load_allocated}</strong></td>
            <td class="num">${f.total_cadet_seats}</td>
            <td class="num">${f.avg_section_size}</td>
            <td style="font-size:11px; color:#64748b;">${(f.courses_taught || []).join(', ')}</td>
        `;
        tbody.appendChild(tr);
    });
}

function openFacultyModal(instName) {
    const data = window.currentWorkloadData;
    if (!data) return;

    const f = data.faculty_directory.find(x => x.instructor === instName);
    if (!f) return;

    const modalName = window.maskFacultyNames ? 'Faculty Member (Masked)' : f.instructor;
    document.getElementById('modalInstName').textContent = modalName;
    document.getElementById('modalInstMeta').innerHTML = `
        <strong>Primary Dept:</strong> <span class="badge badge-dept">${f.primary_dept}</span> &nbsp;|&nbsp;
        <strong>Billet:</strong> <span class="badge" style="background:#f1f5f9; color:#334155;">${f.billet_status || 'Filled'}</span> &nbsp;|&nbsp;
        <strong>Tier:</strong> <span class="badge" style="background:#e0f2fe; color:#0369a1;">${f.expected_tier || 'Line_Faculty'}</span> &nbsp;|&nbsp;
        <strong>Actual Secs:</strong> ${f.weighted_sections} (Expected: ${f.expected_sections || 3.0}) &nbsp;|&nbsp;
        <strong>Cadet Load:</strong> ${f.cadet_load_allocated} &nbsp;|&nbsp;
        <strong>Advisees:</strong> ${f.advisees_count !== undefined ? f.advisees_count : 0} &nbsp;|&nbsp;
        <strong>Avg Class Size:</strong> ${f.avg_section_size}
    `;

    const tbody = document.getElementById('modalCourseTbody');
    tbody.innerHTML = '';
    (f.course_assignments || []).forEach(a => {
        const tr = document.createElement('tr');
        const coInsts = a.co_instructors && a.co_instructors.length > 0 ? a.co_instructors.join(', ') : '<em>Solo</em>';
        tr.innerHTML = `
            <td>${a.term || '2268'}</td>
            <td><strong>${a.course}</strong></td>
            <td>${a.title}</td>
            <td>${a.section}</td>
            <td class="num"><strong>${a.cadets}</strong></td>
            <td>${a.weight_type} (${a.sec_weight} sec)</td>
            <td>${coInsts}</td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('instModal').style.display = 'flex';
}

function closeFacultyModal(e) {
    if (!e || e.target === document.getElementById('instModal') || e.target.classList.contains('modal-close')) {
        document.getElementById('instModal').style.display = 'none';
    }
}
