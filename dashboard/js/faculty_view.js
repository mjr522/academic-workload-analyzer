/**
 * Faculty Workload Directory Controller
 */

let currentFacultySort = { col: 'instructor', dir: 'asc' };

function sortFacultyDirectory(colKey) {
    if (currentFacultySort.col === colKey) {
        currentFacultySort.dir = currentFacultySort.dir === 'desc' ? 'asc' : 'desc';
    } else {
        currentFacultySort.col = colKey;
        // Default descending for numeric columns
        currentFacultySort.dir = ['weighted_sections', 'section_delta', 'cadet_load_allocated', 'total_cadet_seats', 'avg_section_size'].includes(colKey) ? 'desc' : 'asc';
    }
    renderFacultyDirectory();
}

function updateFacultySortIcons() {
    const cols = ['instructor', 'school_code', 'primary_dept', 'billet_status', 'expected_tier', 'weighted_sections', 'section_delta', 'cadet_load_allocated', 'total_cadet_seats', 'avg_section_size'];
    cols.forEach(c => {
        const el = document.getElementById(`th-facsort-${c}`);
        const th = el ? el.closest('th') : null;
        if (el) {
            if (currentFacultySort.col === c) {
                el.textContent = currentFacultySort.dir === 'desc' ? '▼' : '▲';
                if (th) {
                    th.classList.remove('sorted-desc', 'sorted-asc');
                    th.classList.add(currentFacultySort.dir === 'desc' ? 'sorted-desc' : 'sorted-asc');
                }
            } else {
                el.textContent = '↕';
                if (th) th.classList.remove('sorted-desc', 'sorted-asc');
            }
        }
    });
}

function onFacultySchoolFilterChange() {
    const school = (document.getElementById('facultySchoolFilter') ? document.getElementById('facultySchoolFilter').value : 'ALL');
    const deptSel = document.getElementById('facultyDeptFilter');
    const data = (typeof getActiveWorkloadData === 'function') ? getActiveWorkloadData() : window.currentWorkloadData;
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
    renderFacultyDirectory();
}

function renderFacultyDirectory() {
    const data = (typeof getActiveWorkloadData === 'function') ? getActiveWorkloadData() : window.currentWorkloadData;
    if (!data) return;

    const tbody = document.getElementById('facultyTbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    updateFacultySortIcons();

    const q = (document.getElementById('facultySearch') ? document.getElementById('facultySearch').value : '').toLowerCase();
    const schoolFilter = (document.getElementById('facultySchoolFilter') ? document.getElementById('facultySchoolFilter').value : 'ALL');
    const deptFilter = (document.getElementById('facultyDeptFilter') ? document.getElementById('facultyDeptFilter').value : 'ALL');

    let list = data.faculty_directory || [];

    // Scope filter (Teaching Only vs All Billets)
    if (typeof currentFacultyScope !== 'undefined' && currentFacultyScope === 'TEACHING') {
        list = list.filter(f => f.weighted_sections > 0);
    }

    if (schoolFilter !== 'ALL') {
        list = list.filter(f => (f.school_code || 'OTHER') === schoolFilter);
    }

    if (deptFilter !== 'ALL') {
        list = list.filter(f => f.primary_dept === deptFilter);
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

    // Sort list
    list.sort((a, b) => {
        let valA, valB;
        const col = currentFacultySort.col;
        if (['weighted_sections', 'section_delta', 'cadet_load_allocated', 'total_cadet_seats', 'avg_section_size'].includes(col)) {
            valA = Number(a[col] !== undefined ? a[col] : 0);
            valB = Number(b[col] !== undefined ? b[col] : 0);
        } else {
            valA = String(a[col] || '').toLowerCase();
            valB = String(b[col] || '').toLowerCase();
        }
        if (valA < valB) return currentFacultySort.dir === 'asc' ? -1 : 1;
        if (valA > valB) return currentFacultySort.dir === 'asc' ? 1 : -1;
        return 0;
    });

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
    const data = (typeof getActiveWorkloadData === 'function') ? getActiveWorkloadData() : window.currentWorkloadData;
    if (!data) return;

    const f = data.faculty_directory.find(x => x.instructor === instName);
    if (!f) return;

    const modalName = window.maskFacultyNames ? 'Faculty Member (Masked)' : f.instructor;
    document.getElementById('modalInstName').textContent = modalName;
    let ntwHtml = '';
    if (f.section_equivalents && (f.section_equivalents.admin > 0 || f.section_equivalents.research > 0 || f.section_equivalents.labops > 0)) {
        ntwHtml = `
            <div style="margin-top: 8px; padding: 6px 10px; background: #f8fafc; border: 1px solid var(--border); border-radius: 6px; font-size: 12px;">
                <strong>Non-Teaching Section Equivalents:</strong> 
                Admin: <strong style="color:var(--primary);">+${Number(f.section_equivalents.admin).toFixed(1)}</strong> | 
                Research: <strong style="color:var(--primary);">+${Number(f.section_equivalents.research).toFixed(1)}</strong> | 
                Lab Ops: <strong style="color:var(--primary);">+${Number(f.section_equivalents.labops).toFixed(1)}</strong> &nbsp;→&nbsp;
                <strong>Gross Burden:</strong> <span class="badge badge-dept" style="font-size:11.5px;">${Number(f.section_equivalents.gross_burden).toFixed(1)} secs</span>
            </div>
        `;
    }

    document.getElementById('modalInstMeta').innerHTML = `
        <div style="line-height: 1.8;">
            <strong>Primary Dept:</strong> <span class="badge badge-dept">${f.primary_dept}</span> &nbsp;|&nbsp;
            <strong>Billet:</strong> <span class="badge" style="background:#f1f5f9; color:#334155;">${f.billet_status || 'Filled'}</span> &nbsp;|&nbsp;
            <strong>Tier:</strong> <span class="badge" style="background:#e0f2fe; color:#0369a1;">${f.expected_tier || 'Line_Faculty'}</span> &nbsp;|&nbsp;
            <strong>Actual Secs:</strong> ${f.weighted_sections} (Expected: ${f.expected_sections || 3.0}) &nbsp;|&nbsp;
            <strong>Cadet Load:</strong> ${f.cadet_load_allocated} &nbsp;|&nbsp;
            <strong>Advisees:</strong> ${f.advisees_count !== undefined ? f.advisees_count : 0} &nbsp;|&nbsp;
            <strong>Avg Class Size:</strong> ${f.avg_section_size}
        </div>
        ${ntwHtml}
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
