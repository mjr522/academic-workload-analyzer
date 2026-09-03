/**
 * Curriculum & Capstone Health View Controller
 */

let curriculumFilterMode = 'all';

function renderCurriculumView() {
    const data = window.currentWorkloadData;
    if (!data) return;

    filterAndRenderCurriculumTable();
}

function setCurriculumFilter(mode) {
    curriculumFilterMode = mode;
    document.querySelectorAll('.curric-filter-btn').forEach(btn => btn.classList.remove('btn-primary'));
    const activeBtn = document.getElementById(`btn-curric-${mode}`);
    if (activeBtn) activeBtn.classList.add('btn-primary');
    filterAndRenderCurriculumTable();
}

function filterAndRenderCurriculumTable() {
    const data = window.currentWorkloadData;
    if (!data) return;

    const tbody = document.getElementById('curricTbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const q = (document.getElementById('curricSearch') ? document.getElementById('curricSearch').value : '').toLowerCase();
    const schoolFilter = (document.getElementById('curricSchoolFilter') ? document.getElementById('curricSchoolFilter').value : 'ALL');

    let allScopeList = data.sections_audit || [];
    if (schoolFilter !== 'ALL') {
        allScopeList = allScopeList.filter(s => (s.school_code || 'OTHER') === schoolFilter);
    }

    // Update KPI counters for this school scope
    const sub10Scope = allScopeList.filter(s => s.is_sub10);
    const capstoneScope = allScopeList.filter(s => s.is_capstone);

    const totalEl = document.getElementById('curricTotalSecs');
    if (totalEl) totalEl.textContent = allScopeList.length.toLocaleString();

    const sub10El = document.getElementById('curricSub10Secs');
    if (sub10El) {
        const pct = allScopeList.length > 0 ? Math.round(sub10Scope.length / allScopeList.length * 100) : 0;
        sub10El.textContent = `${sub10Scope.length.toLocaleString()} (${pct}%)`;
    }

    const capstoneEl = document.getElementById('curricCapstoneSecs');
    if (capstoneEl) capstoneEl.textContent = capstoneScope.length.toLocaleString();

    let list = allScopeList;

    if (curriculumFilterMode === 'sub10') {
        list = list.filter(s => s.is_sub10);
    } else if (curriculumFilterMode === 'capstone') {
        list = list.filter(s => s.is_capstone);
    }

    if (q) {
        list = list.filter(s =>
            (s.course_nbr && s.course_nbr.toLowerCase().includes(q)) ||
            (s.title && s.title.toLowerCase().includes(q)) ||
            (s.department && s.department.toLowerCase().includes(q)) ||
            (s.subject && s.subject.toLowerCase().includes(q)) ||
            (s.section && s.section.toLowerCase().includes(q))
        );
    }

    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; color:#64748b; padding:16px;">No matching sections found.</td></tr>';
        return;
    }

    list.slice(0, 300).forEach(s => {
        const tr = document.createElement('tr');
        let badges = '';
        if (s.is_sub10) badges += '<span class="badge badge-sub10">≤ 10 Cadets</span> ';
        if (s.is_capstone) badges += '<span class="badge badge-capstone">Capstone</span>';

        tr.innerHTML = `
            <td><strong>${s.term || '2268'}</strong></td>
            <td><span class="badge" style="background:#e2e8f0; color:#1e293b; font-weight:600;">${s.school_code || 'OTHER'}</span></td>
            <td><span class="badge badge-dept">${s.department}</span></td>
            <td><strong>${s.subject} ${s.course_nbr}</strong></td>
            <td>${s.title}</td>
            <td>${s.section}</td>
            <td class="num"><strong>${s.cadets !== undefined ? s.cadets : (s.cadet_count !== undefined ? s.cadet_count : 0)}</strong></td>
            <td class="num">${s.credits !== undefined ? s.credits : (s.credit_units !== undefined ? s.credit_units : 3.0)}</td>
            <td>${badges || '<span style="color:#94a3b8; font-size:11px;">Standard</span>'}</td>
        `;
        tbody.appendChild(tr);
    });
}
