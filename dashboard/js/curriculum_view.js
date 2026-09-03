/**
 * Curriculum & Capstone Health View Controller
 */

let curriculumFilterMode = 'all';

function renderCurriculumView() {
    const data = window.currentWorkloadData;
    if (!data) return;

    const sections = data.sections_audit || [];
    const sub10 = sections.filter(s => s.is_sub10);
    const capstones = sections.filter(s => s.is_capstone);

    document.getElementById('curricTotalSecs').textContent = sections.length.toLocaleString();
    document.getElementById('curricSub10Secs').textContent = `${sub10.length.toLocaleString()} (${Math.round(sub10.length / sections.length * 100 || 0)}%)`;
    document.getElementById('curricCapstoneSecs').textContent = capstones.length.toLocaleString();

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
    let list = data.sections_audit || [];

    if (curriculumFilterMode === 'sub10') {
        list = list.filter(s => s.is_sub10);
    } else if (curriculumFilterMode === 'capstone') {
        list = list.filter(s => s.is_capstone);
    }

    if (q) {
        list = list.filter(s =>
            s.course_nbr.toLowerCase().includes(q) ||
            s.title.toLowerCase().includes(q) ||
            s.department.toLowerCase().includes(q) ||
            s.subject.toLowerCase().includes(q) ||
            s.section.toLowerCase().includes(q)
        );
    }

    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#64748b; padding:16px;">No matching sections found.</td></tr>';
        return;
    }

    list.slice(0, 300).forEach(s => {
        const tr = document.createElement('tr');
        let badges = '';
        if (s.is_sub10) badges += '<span class="badge badge-sub10">≤ 10 Cadets</span> ';
        if (s.is_capstone) badges += '<span class="badge badge-capstone">Capstone</span>';

        tr.innerHTML = `
            <td><strong>${s.term || '2268'}</strong></td>
            <td><span class="badge badge-dept">${s.department}</span></td>
            <td><strong>${s.subject} ${s.course_nbr}</strong></td>
            <td>${s.title}</td>
            <td>${s.section}</td>
            <td class="num"><strong>${s.cadet_count}</strong></td>
            <td class="num">${s.credit_units}</td>
            <td>${badges || '<span style="color:#94a3b8; font-size:11px;">Standard</span>'}</td>
        `;
        tbody.appendChild(tr);
    });
}
