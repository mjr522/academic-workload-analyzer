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
    let list = data.faculty_directory || [];

    if (q) {
        list = list.filter(f =>
            f.instructor.toLowerCase().includes(q) ||
            f.primary_dept.toLowerCase().includes(q) ||
            f.courses_taught.some(c => c.toLowerCase().includes(q))
        );
    }

    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#64748b; padding:16px;">No matching faculty found.</td></tr>';
        return;
    }

    list.forEach((f, idx) => {
        const displayName = window.maskFacultyNames ? `Faculty ${String(idx + 1).padStart(2, '0')}` : f.instructor;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong style="color:var(--primary); cursor:pointer;" onclick="openFacultyModal('${f.instructor.replace(/'/g, "\\'")}')">${displayName}</strong></td>
            <td><span class="badge badge-dept">${f.primary_dept}</span></td>
            <td class="num"><strong>${f.weighted_sections}</strong></td>
            <td class="num"><strong>${f.cadet_load_allocated}</strong></td>
            <td class="num">${f.total_cadet_seats}</td>
            <td class="num">${f.unique_cadets}</td>
            <td class="num">${f.avg_section_size}</td>
            <td style="font-size:11px; color:#64748b;">${f.courses_taught.join(', ')}</td>
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
        <strong>Weighted Sections:</strong> ${f.weighted_sections} &nbsp;|&nbsp;
        <strong>Cadet Contact Load:</strong> ${f.cadet_load_allocated} &nbsp;|&nbsp;
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
