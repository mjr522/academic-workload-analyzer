/**
 * Curriculum & Capstone Health View Controller
 */

let curriculumFilterMode = 'all';

function renderCurriculumView() {
    const data = (typeof getActiveWorkloadData === 'function') ? getActiveWorkloadData() : window.currentWorkloadData;
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
    const data = (typeof getActiveWorkloadData === 'function') ? getActiveWorkloadData() : window.currentWorkloadData;
    if (!data) return;

    const tbody = document.getElementById('curricTbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const q = (document.getElementById('curricSearch') ? document.getElementById('curricSearch').value : '').toLowerCase();
    const schoolFilter = (document.getElementById('curricSchoolFilter') ? document.getElementById('curricSchoolFilter').value : 'ALL');

    const isExCap = (typeof window.excludeCapstones !== 'undefined') ? window.excludeCapstones : ((typeof excludeCapstones !== 'undefined') ? excludeCapstones : true);
    const isEx499 = (typeof window.exclude499s !== 'undefined') ? window.exclude499s : ((typeof exclude499s !== 'undefined') ? exclude499s : true);

    const masterSections = data.sections_audit || [];
    const masterScopeList = (schoolFilter === 'ALL') 
        ? masterSections 
        : masterSections.filter(s => (s.school_code || 'OTHER') === schoolFilter);

    // Active baseline list (respecting global exclusions)
    let activeScopeList = masterScopeList;
    if (isExCap && curriculumFilterMode !== 'capstone') {
        activeScopeList = activeScopeList.filter(s => !s.is_capstone);
    }
    if (isEx499 && curriculumFilterMode !== '499') {
        activeScopeList = activeScopeList.filter(s => !s.is_499);
    }

    // Master counts in scope (for status reporting)
    const masterCapsCount = masterScopeList.filter(s => s.is_capstone).length;
    const master499Count = masterScopeList.filter(s => s.is_499).length;

    // Active KPI calculations
    const sub10Scope = activeScopeList.filter(s => s.is_sub10);

    const totalEl = document.getElementById('curricTotalSecs');
    if (totalEl) totalEl.textContent = activeScopeList.length.toLocaleString();

    const sub10El = document.getElementById('curricSub10Secs');
    if (sub10El) {
        const pct = activeScopeList.length > 0 ? Math.round(sub10Scope.length / activeScopeList.length * 100) : 0;
        sub10El.textContent = `${sub10Scope.length.toLocaleString()} (${pct}%)`;
    }

    const capstoneEl = document.getElementById('curricCapstoneSecs');
    if (capstoneEl) {
        if (isExCap) {
            capstoneEl.innerHTML = `<span style="color:#64748b;">0</span> <span style="font-size:12px; color:#b91c1c; font-weight:700;">(${masterCapsCount} Excluded)</span>`;
        } else {
            capstoneEl.innerHTML = `<strong style="color:#6b21a8;">${masterCapsCount}</strong> <span style="font-size:12px; color:#15803d; font-weight:700;">(Active)</span>`;
        }
    }

    const study499El = document.getElementById('curric499Secs');
    if (study499El) {
        if (isEx499) {
            study499El.innerHTML = `<span style="color:#64748b;">0</span> <span style="font-size:12px; color:#b91c1c; font-weight:700;">(${master499Count} Excluded)</span>`;
        } else {
            study499El.innerHTML = `<strong style="color:#0369a1;">${master499Count}</strong> <span style="font-size:12px; color:#15803d; font-weight:700;">(Active)</span>`;
        }
    }

    // Determine table rows based on filter mode
    let list = activeScopeList;
    if (curriculumFilterMode === 'sub10') {
        list = list.filter(s => s.is_sub10);
    } else if (curriculumFilterMode === 'capstone') {
        // Show master capstones in this school scope so user can inspect them
        list = masterScopeList.filter(s => s.is_capstone);
    } else if (curriculumFilterMode === '499') {
        // Show master 499s in this school scope so user can inspect them
        list = masterScopeList.filter(s => s.is_499);
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
        if (s.is_capstone) badges += '<span class="badge badge-capstone">Capstone</span> ';
        if (s.is_499) badges += '<span class="badge" style="background:#e0f2fe; color:#0369a1; font-weight:700;">499 Ind Study</span> ';
        if (s.credit_type === 'Half Credit' || s.section_weight === 0.5) badges += '<span class="badge" style="background:#fef3c7; color:#b45309; font-weight:700;">½ Credit</span> ';
        if (s.credit_type === 'Quarter Credit' || s.section_weight === 0.25) badges += '<span class="badge" style="background:#f3e8ff; color:#7e22ce; font-weight:700;">¼ Credit</span> ';

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
