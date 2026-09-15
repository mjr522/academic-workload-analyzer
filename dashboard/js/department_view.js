/**
 * USAFA Academic Workload Workbench — Department Drilldown Controller
 * -------------------------------------------------------------------
 * Manages department vitals, orthogonal military/civilian billet accounting,
 * in-place faculty workbench editing, starter template generation, and
 * department roster upload/export using SheetJS.
 */

let currentDeptFacultySort = { col: 'weighted_sections', dir: 'desc' };
let currentDeptFacultyCode = null;
let currentDeptCoursesSort = { col: 'course', dir: 'asc' };
let currentDeptCoursesCode = null;

let currentSchoolDrilldownCode = null;
let currentSchoolDeptsSort = { col: 'dept_code', dir: 'asc' };
let currentSchoolFacultySort = { col: 'instructor', dir: 'asc' };
let currentSchoolCoursesSort = { col: 'course', dir: 'asc' };

function initDepartmentDropdown(departments) {
    const select = document.getElementById('deptSelect');
    if (!select) return;
    select.innerHTML = '';

    const schoolGroups = [
        { code: 'SINE', label: '⚙️ SINE — School of Integrated Engineering' },
        { code: 'SIBS', label: '🔬 SIBS — School of Integrated Basic Sciences' },
        { code: 'HASS', label: '📚 HASS — School of Integrated Humanities, Arts, & Social Sciences' },
        { code: 'OTHER', label: 'Other Academic Units' }
    ];

    schoolGroups.forEach(grp => {
        const groupDepts = (departments || []).filter(d => (d.school_code || 'OTHER') === grp.code);
        if (groupDepts.length > 0) {
            // Sort departments alphabetically by dept_code
            groupDepts.sort((a, b) => (a.dept_code || '').localeCompare(b.dept_code || ''));

            const optgroup = document.createElement('optgroup');
            optgroup.label = grp.label;

            // Make School selectable at top of optgroup
            if (grp.code !== 'OTHER') {
                const schoolOpt = document.createElement('option');
                schoolOpt.value = `SCHOOL:${grp.code}`;
                schoolOpt.textContent = `🏛️ ${grp.code} — School Overview & Department Comparison`;
                schoolOpt.style.fontWeight = 'bold';
                optgroup.appendChild(schoolOpt);
            }

            groupDepts.forEach(d => {
                const opt = document.createElement('option');
                opt.value = d.dept_code;
                opt.innerHTML = `&nbsp;&nbsp;&nbsp;&nbsp;${d.dept_code} — ${d.dept_name}`;
                optgroup.appendChild(opt);
            });
            select.appendChild(optgroup);
        }
    });

    select.onchange = () => {
        renderDrilldown(select.value);
    };

    if (select.value) {
        renderDrilldown(select.value);
    } else if (departments && departments.length > 0) {
        renderDrilldown(departments[0].dept_code);
    }
}

function renderDrilldown(unitCode) {
    if (!unitCode) {
        const sel = document.getElementById('deptSelect');
        unitCode = sel ? sel.value : null;
    }
    if (!unitCode) return;
    if (unitCode.startsWith('SCHOOL:')) {
        renderSchoolDetails(unitCode.replace('SCHOOL:', ''));
    } else {
        renderDepartmentDetails(unitCode);
    }
}

function setTextSafe(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = (val !== null && val !== undefined) ? val : '-';
}

function renderDepartmentDetails(deptCode) {
    currentDeptFacultyCode = deptCode;
    const deptCont = document.getElementById('deptDrilldownContainer');
    const schoolCont = document.getElementById('schoolDrilldownContainer');
    if (deptCont) deptCont.style.display = 'block';
    if (schoolCont) schoolCont.style.display = 'none';

    const data = (typeof getActiveWorkloadData === 'function') ? getActiveWorkloadData() : window.currentWorkloadData;
    if (!data) return;

    const dept = data.departments.find(d => d.dept_code === deptCode);
    if (!dept) return;

    const deptAvgSize = dept.total_sections > 0
        ? (dept.total_cadet_seats / dept.total_sections).toFixed(1)
        : (dept.overall_avg_section_size !== undefined ? Number(dept.overall_avg_section_size).toFixed(1) : '0.0');

    // Vitals
    setTextSafe('deptTitle', `${dept.dept_code} — ${dept.dept_name}`);
    setTextSafe('deptSubjs', `Academic Programs: ${(dept.subjects_included || []).join(', ')}`);
    setTextSafe('deptMetricCourses', dept.total_courses || 0);
    setTextSafe('deptMetricSections', dept.total_sections || 0);
    setTextSafe('deptMetricSectionsSub', `Classroom & labs (Avg: ${deptAvgSize})`);
    setTextSafe('deptMetricAvgSize', deptAvgSize);
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

    // Orthogonal Billet & Staffing Status (Military vs Civilian non-fungible separation)
    const b = dept.billet_summary || {};
    setTextSafe('deptBilletAuth', b.authorized !== undefined ? b.authorized : (dept.faculty_count || 0));
    setTextSafe('deptBilletVac', b.vacant || 0);
    setTextSafe('deptBilletTotalRate', `${b.vacancy_rate !== undefined ? b.vacancy_rate : 0.0}% Vac`);
    setTextSafe('deptBilletMilAuth', b.military_authorized !== undefined ? b.military_authorized : (b.filled_military || 0));
    setTextSafe('deptBilletMil', b.filled_military || 0);
    setTextSafe('deptBilletMilVac', b.military_vacant || 0);
    setTextSafe('deptBilletMilRate', `${b.military_vacancy_rate !== undefined ? b.military_vacancy_rate : 0.0}% Vac`);
    setTextSafe('deptBilletCivAuth', b.civilian_authorized !== undefined ? b.civilian_authorized : (b.filled_civilian || 0));
    setTextSafe('deptBilletCiv', b.filled_civilian || 0);
    setTextSafe('deptBilletCivVac', b.civilian_vacant || 0);
    setTextSafe('deptBilletCivRate', `${b.civilian_vacancy_rate !== undefined ? b.civilian_vacancy_rate : 0.0}% Vac`);
    setTextSafe('deptBilletMoa', b.moa_adjunct || 0);

    // Non-Teaching Workload (Dual-Rule Section Equivalents)
    const ntw = dept.non_teaching_workload || {};
    const isCalibrated = Boolean(ntw.is_calibrated);

    const statusBadge = document.getElementById('deptNonTeachingStatus');
    if (statusBadge) {
        if (isCalibrated) {
            statusBadge.textContent = 'Live Workbench Calibrated';
            statusBadge.style.background = '#dcfce7';
            statusBadge.style.color = '#15803d';
        } else {
            statusBadge.textContent = 'Baseline (Awaiting Roster)';
            statusBadge.style.background = '#e0f2fe';
            statusBadge.style.color = '#0369a1';
        }
    }

    const adminSec = ntw.admin_sections !== undefined ? Number(ntw.admin_sections).toFixed(1) : '0.0';
    const resSec = ntw.research_sections !== undefined ? Number(ntw.research_sections).toFixed(1) : '0.0';
    const labSec = ntw.labops_sections !== undefined ? Number(ntw.labops_sections).toFixed(1) : '0.0';
    const grossSec = ntw.gross_burden_sections !== undefined ? Number(ntw.gross_burden_sections).toFixed(1) : (dept.total_sections || 0).toFixed(1);

    setTextSafe('deptSecEquivAdmin', `+${adminSec} secs`);
    setTextSafe('deptSecEquivResearch', `+${resSec} secs`);
    setTextSafe('deptSecEquivLabOps', `+${labSec} secs`);
    setTextSafe('deptGrossBurden', `${grossSec} gross secs`);

    // 3-Way Instructional Capacity & Section Sizing Balance
    try {
        renderDepartmentCapacityBalance(dept);
    } catch (e) {
        console.warn("Capacity balance rendering error:", e);
    }

    // Render Charts
    try {
        renderPipelineChart(dept.class_pipeline || {});
    } catch (e) {
        console.warn("Pipeline chart error:", e);
    }

    try {
        renderDeptSizeDistChart(dept.section_size_distribution || {});
    } catch (e) {
        console.warn("Section size distribution chart error:", e);
    }

    // Render Tables
    try {
        renderDepartmentFacultyTable(dept.dept_code);
    } catch (e) {
        console.warn("Department faculty table error:", e);
    }

    try {
        renderDepartmentCoursesTable(dept.dept_code);
    } catch (e) {
        console.warn("Department courses table error:", e);
    }
}

/**
 * Render 3-Way Capacity & Section Sizing Balance Card & Dean's Narrative
 */
function renderDepartmentCapacityBalance(dept) {
    if (!dept) return;

    const capBal = dept.capacity_balance || {};
    const targetCap = capBal.standard_cap || (window.workbenchState?.policy?.standardSectionCap) || 24;
    const targetSecs = (capBal.target_sections !== undefined ? Number(capBal.target_sections) : Number(dept.target_sections || 0));
    const actualSecs = (capBal.actual_sections !== undefined ? Number(capBal.actual_sections) : Number(dept.total_sections || 0));
    const standardSecs = (capBal.standard_sections !== undefined ? Number(capBal.standard_sections) : Number(dept.standard_sections || 0));
    const compressionDelta = (capBal.compression_delta !== undefined ? Number(capBal.compression_delta) : Math.round((standardSecs - actualSecs) * 10) / 10);
    const staffingDelta = (capBal.staffing_delta !== undefined ? Number(capBal.staffing_delta) : Math.round((targetSecs - standardSecs) * 10) / 10);

    // Update Header Badge and Box Labels
    const badge = document.getElementById('deptCapBalanceBadge');
    if (badge) badge.textContent = `Cap ${targetCap} Standard`;

    const labelCap = document.getElementById('deptCapLabelCap');
    if (labelCap) labelCap.textContent = `Cap ${targetCap}`;

    setTextSafe('deptCapTargetSecs', `${targetSecs.toFixed(1)} secs`);
    setTextSafe('deptCapActualSecs', `${actualSecs.toFixed(1)} secs`);
    setTextSafe('deptCapStandardSecs', `${standardSecs.toFixed(1)} secs`);

    // Dynamic Status Pill
    const pill = document.getElementById('deptCapStatusPill');
    if (pill) {
        if (staffingDelta < -1.0) {
            pill.className = 'badge';
            pill.style.background = '#fee2e2';
            pill.style.color = '#b91c1c';
            pill.style.border = '1px solid #fca5a5';
            pill.style.fontSize = '12px';
            pill.style.padding = '6px 12px';
            pill.innerHTML = `🚨 <strong>Structural Faculty Deficit:</strong> ${staffingDelta.toFixed(1)} secs`;
        } else if (compressionDelta > 2.0) {
            pill.className = 'badge';
            pill.style.background = '#fffbeb';
            pill.style.color = '#b45309';
            pill.style.border = '1px solid #fde68a';
            pill.style.fontSize = '12px';
            pill.style.padding = '6px 12px';
            pill.innerHTML = `⚠️ <strong>High Classroom Compression:</strong> +${compressionDelta.toFixed(1)} secs`;
        } else if (compressionDelta < -2.0) {
            pill.className = 'badge';
            pill.style.background = '#e0f2fe';
            pill.style.color = '#0369a1';
            pill.style.border = '1px solid #bae6fd';
            pill.style.fontSize = '12px';
            pill.style.padding = '6px 12px';
            pill.innerHTML = `ℹ️ <strong>Section Consolidation Potential:</strong> ${compressionDelta.toFixed(1)} secs`;
        } else {
            pill.className = 'badge';
            pill.style.background = '#dcfce7';
            pill.style.color = '#15803d';
            pill.style.border = '1px solid #bbf7d0';
            pill.style.fontSize = '12px';
            pill.style.padding = '6px 12px';
            pill.innerHTML = `✅ <strong>Balanced Capacity &amp; Sizing</strong>`;
        }
    }

    // Dynamic Dean's Insight Narrative
    const iconEl = document.getElementById('deptCapNarrativeIcon');
    const headlineEl = document.getElementById('deptCapNarrativeHeadline');
    const textEl = document.getElementById('deptCapNarrativeText');
    const compBadge = document.getElementById('deptCapCompressionBadge');
    const staffBadge = document.getElementById('deptCapStaffingBadge');

    let icon = '💡';
    let headline = "Dean's Capacity &amp; Resourcing Analysis";
    let narratives = [];

    // Narrative A: Classroom Compression
    if (compressionDelta > 2.0) {
        icon = '⚠️';
        headline = "Classroom Compression Warning: Timetable Masks Resourcing Strain";
        narratives.push(`<strong>Classroom Sizing:</strong> The department absorbs <strong>+${compressionDelta.toFixed(1)} sections</strong> via oversized sections. Right-sizing curriculum to policy benchmark (&le; ${targetCap} cadets/section) requires <strong>${standardSecs.toFixed(1)} sections</strong> (currently scheduling ${actualSecs.toFixed(1)}).`);
    } else if (compressionDelta < -2.0) {
        icon = 'ℹ️';
        headline = "Classroom Consolidation Opportunity: Small Section Footprint";
        narratives.push(`<strong>Classroom Sizing:</strong> Current sections average well below policy cap (<strong>${compressionDelta.toFixed(1)} sections</strong> vs. right-sized benchmark). Leadership can explore combining boutique sections without exceeding the ${targetCap}-cadet ceiling.`);
    } else {
        narratives.push(`<strong>Classroom Sizing:</strong> Course sections are well-calibrated to institutional policy standards (<strong>${actualSecs.toFixed(1)} actual</strong> vs. <strong>${standardSecs.toFixed(1)} right-sized demand</strong>, delta: ${compressionDelta >= 0 ? '+' : ''}${compressionDelta.toFixed(1)} secs).`);
    }

    // Narrative B: Staffing Balance
    if (staffingDelta < -1.0) {
        if (icon !== '🚨') icon = '🚨';
        headline = "Structural Faculty Deficit: Authorizations Cannot Support Right-Sized Curriculum";
        narratives.push(`<strong>Staffing Balance:</strong> Department authorized staffing capacity (<strong>${targetSecs.toFixed(1)} secs</strong>) is structurally deficient by <strong>${Math.abs(staffingDelta).toFixed(1)} sections</strong> compared to right-sized demand (<strong>${standardSecs.toFixed(1)} secs</strong>). The department relies on class compression or faculty over-teaching to deliver its mission.`);
    } else if (staffingDelta > 2.0) {
        narratives.push(`<strong>Staffing Balance:</strong> Authorized faculty capacity (<strong>${targetSecs.toFixed(1)} secs</strong>) comfortably covers right-sized demand (<strong>${standardSecs.toFixed(1)} secs</strong>) with a reserve capacity of <strong>+${staffingDelta.toFixed(1)} sections</strong>.`);
    } else {
        narratives.push(`<strong>Staffing Balance:</strong> Faculty staffing capacity (<strong>${targetSecs.toFixed(1)} secs</strong>) closely matches right-sized curricular demand (<strong>${standardSecs.toFixed(1)} secs</strong>, delta: ${staffingDelta >= 0 ? '+' : ''}${staffingDelta.toFixed(1)} secs).`);
    }

    if (iconEl) iconEl.innerHTML = icon;
    if (headlineEl) headlineEl.innerHTML = headline;
    if (textEl) textEl.innerHTML = narratives.map(n => `<div style="margin-bottom:6px;">${n}</div>`).join('');

    if (compBadge) {
        const compColor = compressionDelta > 2 ? '#b45309' : (compressionDelta < -2 ? '#0369a1' : '#15803d');
        const compBg = compressionDelta > 2 ? '#fffbeb' : (compressionDelta < -2 ? '#eff6ff' : '#f0fdf4');
        compBadge.innerHTML = `<span class="badge" style="background:${compBg}; color:${compColor}; border:1px solid currentColor;">Classroom Compression: <strong>${compressionDelta >= 0 ? '+' : ''}${compressionDelta.toFixed(1)} secs</strong></span>`;
    }

    if (staffBadge) {
        const staffColor = staffingDelta < -1 ? '#b91c1c' : (staffingDelta > 2 ? '#15803d' : '#475569');
        const staffBg = staffingDelta < -1 ? '#fef2f2' : (staffingDelta > 2 ? '#f0fdf4' : '#f8fafc');
        staffBadge.innerHTML = `<span class="badge" style="background:${staffBg}; color:${staffColor}; border:1px solid currentColor;">Staffing Balance: <strong>${staffingDelta >= 0 ? '+' : ''}${staffingDelta.toFixed(1)} secs</strong></span>`;
    }
}

/**
 * Department Faculty Table Sorting
 */
function sortDeptFacultyTable(colKey) {
    if (currentDeptFacultySort.col === colKey) {
        currentDeptFacultySort.dir = currentDeptFacultySort.dir === 'desc' ? 'asc' : 'desc';
    } else {
        currentDeptFacultySort.col = colKey;
        currentDeptFacultySort.dir = 'desc';
    }
    if (currentDeptFacultyCode) {
        renderDepartmentFacultyTable(currentDeptFacultyCode);
    }
}

function updateSortIcons() {
    const cols = ['instructor', 'billet_type', 'occupancy_status', 'expected_tier', 'weighted_sections', 'cadet_load_allocated', 'gross_burden', 'section_delta'];
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
                if (th) th.classList.remove('sorted-desc', 'sorted-asc');
            }
        }
    });
}

/**
 * Render Interactive Department Assigned Faculty Table
 */
function renderDepartmentFacultyTable(deptCode) {
    currentDeptFacultyCode = deptCode;
    const data = (typeof getActiveWorkloadData === 'function') ? getActiveWorkloadData() : window.currentWorkloadData;
    const tbody = document.getElementById('deptFacultyTbody');
    if (!tbody || !data) return;
    tbody.innerHTML = '';

    updateSortIcons();

    // Department Assigned Faculty strictly filters to faculty whose primary home is this department
    let faculty = (data.faculty_directory || []).filter(f => f.primary_dept === deptCode);

    if (faculty.length === 0) {
        if (deptCode === 'ESIS') {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; color:#64748b; padding:20px;">' +
                '<strong style="color:var(--primary);">No faculty lines organically assigned to ESIS (SINE Core Engineering).</strong><br>' +
                '<span style="font-size:12px;">All core engineering courses (ENGR) are taught by instructors assigned to other academic departments.</span>' +
                '</td></tr>';
        } else {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; color:#64748b; padding:16px;">' +
                'No faculty currently assigned to this department. Click <strong>+ Add Billet / Faculty</strong> or <strong>📁 Upload Department Roster</strong> above to add personnel.</td></tr>';
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

            if (col === 'gross_burden') {
                valA = (a.section_equivalents && a.section_equivalents.gross_burden !== undefined) ? a.section_equivalents.gross_burden : a.weighted_sections;
                valB = (b.section_equivalents && b.section_equivalents.gross_burden !== undefined) ? b.section_equivalents.gross_burden : b.weighted_sections;
            }

            if (typeof valA === 'number' || typeof valB === 'number' || ['weighted_sections', 'cadet_load_allocated', 'section_delta', 'total_cadet_seats'].includes(col)) {
                valA = Number(valA) || 0;
                valB = Number(valB) || 0;
                return dir === 'desc' ? (valB - valA) : (valA - valB);
            }

            valA = String(valA || '').toLowerCase();
            valB = String(valB || '').toLowerCase();
            return dir === 'desc' ? valB.localeCompare(valA) : valA.localeCompare(valB);
        });
    }

    const allTiers = (window.workbenchState && window.workbenchState.policy && window.workbenchState.policy.tiers) || {};

    faculty.forEach((f, idx) => {
        const rawName = f.instructor;
        const displayName = window.maskFacultyNames ? `Faculty ${String(idx + 1).padStart(2, '0')}` : rawName;
        const fIdx = f.f_idx !== undefined ? f.f_idx : idx;

        // Billet type options
        const bType = f.billet_type || 'Military';
        const bTypeSelect = `
            <select style="padding:4px 6px; font-size:11.5px; border-radius:4px; border:1px solid var(--border); background:#fff; font-weight:600; cursor:pointer;"
                onchange="updateFacultyBilletType('${deptCode}', ${fIdx}, this.value)">
                <option value="Military" ${bType === 'Military' ? 'selected' : ''}>🎖️ Military</option>
                <option value="Civilian" ${bType === 'Civilian' ? 'selected' : ''}>🏛️ Civilian</option>
                <option value="MOA_Adjunct" ${bType === 'MOA_Adjunct' ? 'selected' : ''}>🤝 MOA/Adjunct</option>
            </select>
        `;

        // Occupancy options
        const occ = f.occupancy_status || 'Filled';
        const occSelect = `
            <select style="padding:4px 6px; font-size:11.5px; border-radius:4px; border:1px solid ${occ === 'Vacant' ? '#f59e0b' : 'var(--border)'}; background:${occ === 'Vacant' ? '#fffbeb' : '#fff'}; color:${occ === 'Vacant' ? '#b45309' : 'var(--text-main)'}; font-weight:700; cursor:pointer;"
                onchange="updateFacultyOccupancy('${deptCode}', ${fIdx}, this.value)">
                <option value="Filled" ${occ === 'Filled' ? 'selected' : ''}>Filled</option>
                <option value="Vacant" ${occ === 'Vacant' ? 'selected' : ''}>⚠️ Vacant</option>
            </select>
        `;

        // Dynamic tier options (includes custom tiers!)
        let tierOptions = '';
        Object.entries(allTiers).forEach(([tKey, tObj]) => {
            const isSel = f.tier_key ? (f.tier_key === tKey) : (f.expected_tier === tObj.name);
            tierOptions += `<option value="${tKey}" ${isSel ? 'selected' : ''}>${tObj.name} (${tObj.expected_sections}s)</option>`;
        });
        const tierSelect = `
            <select style="padding:4px 6px; font-size:11.5px; border-radius:4px; border:1px solid var(--border); background:#fff; font-weight:600; cursor:pointer; max-width:160px;"
                onchange="updateFacultyTier('${deptCode}', ${fIdx}, this.value)">
                ${tierOptions}
            </select>
        `;

        // Non-teaching relief section equivalents
        const reliefSec = (f.section_equivalents ? (f.section_equivalents.admin + f.section_equivalents.research + f.section_equivalents.labops) : 0).toFixed(1);
        const grossBurden = (f.section_equivalents ? f.section_equivalents.gross_burden : f.weighted_sections).toFixed(1);

        // Section Delta Badge
        const delta = f.section_delta !== undefined ? f.section_delta : 0;
        let deltaBadge = '';
        if (delta > 0) {
            deltaBadge = `<span class="badge" style="background:#eff6ff; color:#1d4ed8; font-size:11px;">+${delta.toFixed(1)}</span>`;
        } else if (delta < 0) {
            deltaBadge = `<span class="badge" style="background:#fef3c7; color:#b45309; font-size:11px;">${delta.toFixed(1)}</span>`;
        } else {
            deltaBadge = `<span class="badge" style="background:#dcfce7; color:#15803d; font-size:11px;">0.0 (Target)</span>`;
        }

        const isVacant = (occ === 'Vacant');
        const nameDisplay = isVacant
            ? `<span style="color:#b45309; font-weight:700;">${displayName} <span class="badge" style="background:#fee2e2; color:#b91c1c; font-size:10px;">VACANT BILLET</span></span>`
            : `<strong style="color:var(--primary); cursor:pointer;" onclick="openFacultyModal('${rawName.replace(/'/g, "\\'")}')" title="Click to view detailed teaching assignments">${displayName}</strong>`;

        const tr = document.createElement('tr');
        if (isVacant) {
            tr.style.background = '#fffdf7';
        }

        tr.innerHTML = `
            <td>${nameDisplay}</td>
            <td>${bTypeSelect}</td>
            <td>${occSelect}</td>
            <td>${tierSelect}</td>
            <td class="num"><strong>${f.weighted_sections}</strong></td>
            <td class="num"><strong>${f.cadet_load_allocated}</strong></td>
            <td style="font-size:11.5px; white-space:nowrap;">
                <span title="Non-Teaching Section Equivalents (Dean's Dual-Rule):&#10;• Admin / Governance: +${(f.section_equivalents?.admin || 0).toFixed(1)} secs (${f.admin_pct || 0}%)&#10;• Sponsored Research: +${(f.section_equivalents?.research || 0).toFixed(1)} secs (${f.research_pct || 0}%)&#10;• Lab Ops / Safety: +${(f.section_equivalents?.labops || 0).toFixed(1)} secs (${f.labops_pct || 0}%)&#10;Total Non-Teaching Relief: +${reliefSec} secs&#10;Gross Burden = Teaching (${f.weighted_sections}) + Relief (+${reliefSec}) = ${grossBurden} secs" style="cursor:help; border-bottom:1px dotted var(--text-muted);">
                    +${reliefSec} secs
                </span>
                <button type="button" onclick="openEditFteModal('${deptCode}', ${fIdx})" style="background:none; border:none; cursor:pointer; color:var(--primary-light); font-size:12px; margin-left:4px;" title="Fine-tune FTE % allocations">✏️</button>
            </td>
            <td class="num"><strong style="color:var(--accent); font-size:13px;">${grossBurden}</strong></td>
            <td style="text-align:center;">${deltaBadge}</td>
            <td style="text-align:center;">
                <button type="button" class="btn" style="padding:2px 6px; font-size:11px; color:#b91c1c; border-color:#fca5a5;" onclick="deleteDepartmentBillet('${deptCode}', ${fIdx})" title="Delete billet from department">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

/**
 * Live Updates for Faculty Billet Attributes
 */
function updateFacultyBilletType(deptCode, fIdx, val) {
    const roster = window.workbenchState.departmentRosters[deptCode];
    if (roster && roster[fIdx]) {
        roster[fIdx].billet_type = val;
        recomputeWorkbenchMetrics();
        renderDepartmentDetails(deptCode);
    }
}

function updateFacultyOccupancy(deptCode, fIdx, val) {
    const roster = window.workbenchState.departmentRosters[deptCode];
    if (roster && roster[fIdx]) {
        roster[fIdx].occupancy_status = val;
        recomputeWorkbenchMetrics();
        renderDepartmentDetails(deptCode);
    }
}

function updateFacultyTier(deptCode, fIdx, tierKey) {
    const roster = window.workbenchState.departmentRosters[deptCode];
    if (roster && roster[fIdx]) {
        const f = roster[fIdx];
        f.tier_key = tierKey;
        const tier = window.workbenchState.policy.tiers[tierKey];
        if (tier) {
            f.expected_tier = tier.name;
            f.expected_sections = tier.expected_sections;
            f.teaching_pct = tier.teaching_pct;
            f.admin_pct = tier.admin_pct;
            f.research_pct = tier.research_pct;
            f.labops_pct = tier.labops_pct;
        }
        recomputeWorkbenchMetrics();
        renderDepartmentDetails(deptCode);
    }
}

function deleteDepartmentBillet(deptCode, fIdx) {
    const roster = window.workbenchState.departmentRosters[deptCode];
    if (!roster || !roster[fIdx]) return;
    const name = roster[fIdx].instructor || 'Billet';
    if (!confirm(`Are you sure you want to remove "${name}" from ${deptCode}'s roster?`)) return;

    roster.splice(fIdx, 1);
    recomputeWorkbenchMetrics();
    renderDepartmentDetails(deptCode);
}

/**
 * In-place FTE Fine-Tuning Modal
 */
let activeFteEdit = { deptCode: null, fIdx: null };

function openEditFteModal(deptCode, fIdx) {
    const roster = window.workbenchState.departmentRosters[deptCode];
    if (!roster || !roster[fIdx]) return;
    const f = roster[fIdx];

    activeFteEdit = { deptCode, fIdx };

    document.getElementById('modalFteName').textContent = `${f.instructor} (${deptCode})`;
    document.getElementById('modalFteTier').textContent = `Role Tier: ${f.expected_tier || f.tier_key}`;
    document.getElementById('modalFteTeach').value = f.teaching_pct !== undefined ? f.teaching_pct : 75;
    document.getElementById('modalFteAdmin').value = f.admin_pct !== undefined ? f.admin_pct : 10;
    document.getElementById('modalFteRes').value = f.research_pct !== undefined ? f.research_pct : 10;
    document.getElementById('modalFteLab').value = f.labops_pct !== undefined ? f.labops_pct : 5;

    const modal = document.getElementById('editFteModal');
    if (modal) modal.style.display = 'flex';
}

function closeEditFteModal() {
    const modal = document.getElementById('editFteModal');
    if (modal) modal.style.display = 'none';
}

function saveFacultyFte() {
    const { deptCode, fIdx } = activeFteEdit;
    if (!deptCode || fIdx === null) return;

    const roster = window.workbenchState.departmentRosters[deptCode];
    if (!roster || !roster[fIdx]) return;
    const f = roster[fIdx];

    f.teaching_pct = Number(document.getElementById('modalFteTeach').value) || 0;
    f.admin_pct = Number(document.getElementById('modalFteAdmin').value) || 0;
    f.research_pct = Number(document.getElementById('modalFteRes').value) || 0;
    f.labops_pct = Number(document.getElementById('modalFteLab').value) || 0;

    closeEditFteModal();
    recomputeWorkbenchMetrics();
    renderDepartmentDetails(deptCode);
}

/**
 * Add Billet Modal
 */
function openAddBilletModal() {
    const deptCode = currentDeptFacultyCode || (document.getElementById('deptSelect')?.value);
    if (!deptCode) {
        alert("Please select a department first.");
        return;
    }

    document.getElementById('addBilletDeptCode').textContent = deptCode;
    document.getElementById('addBilletName').value = '';

    // Populate tier dropdown
    const tierSelect = document.getElementById('addBilletTier');
    if (tierSelect) {
        tierSelect.innerHTML = '';
        const tiers = (window.workbenchState && window.workbenchState.policy && window.workbenchState.policy.tiers) || {};
        Object.entries(tiers).forEach(([k, t]) => {
            const opt = document.createElement('option');
            opt.value = k;
            opt.textContent = `${t.name} (${t.expected_sections} secs)`;
            tierSelect.appendChild(opt);
        });
        tierSelect.value = 'Line_Faculty';
    }

    const modal = document.getElementById('addBilletModal');
    if (modal) modal.style.display = 'flex';
}

function closeAddBilletModal() {
    const modal = document.getElementById('addBilletModal');
    if (modal) modal.style.display = 'none';
}

function submitAddBillet() {
    const deptCode = currentDeptFacultyCode;
    if (!deptCode) return;

    const name = document.getElementById('addBilletName')?.value.trim();
    const bType = document.getElementById('addBilletType')?.value || 'Military';
    const occ = document.getElementById('addBilletOccupancy')?.value || 'Filled';
    const tierKey = document.getElementById('addBilletTier')?.value || 'Line_Faculty';

    if (!name) {
        alert("Please enter an instructor name or billet identifier.");
        return;
    }

    const tiers = window.workbenchState.policy.tiers || {};
    const tier = tiers[tierKey] || tiers['Line_Faculty'] || { expected_sections: 3.0, teaching_pct: 75, admin_pct: 10, research_pct: 10, labops_pct: 5 };

    if (!window.workbenchState.departmentRosters[deptCode]) {
        window.workbenchState.departmentRosters[deptCode] = [];
    }

    window.workbenchState.departmentRosters[deptCode].push({
        instructor: name,
        primary_dept: deptCode,
        school_code: 'OTHER',
        billet_type: bType,
        occupancy_status: occ,
        tier_key: tierKey,
        expected_tier: tier.name,
        expected_sections: tier.expected_sections,
        teaching_pct: tier.teaching_pct,
        admin_pct: tier.admin_pct,
        research_pct: tier.research_pct,
        labops_pct: tier.labops_pct,
        advisees_count: 0,
        notes: 'Manually added in workbench',
        is_manual: true
    });

    closeAddBilletModal();
    recomputeWorkbenchMetrics();
    renderDepartmentDetails(deptCode);
    alert(`Billet "${name}" added to ${deptCode} roster!`);
}

/**
 * Upload Department Roster Modal & Handlers
 */
function openUploadRosterModal() {
    const deptCode = currentDeptFacultyCode || (document.getElementById('deptSelect')?.value);
    if (!deptCode) {
        alert("Please select a department first.");
        return;
    }

    document.getElementById('uploadRosterDeptCode').textContent = deptCode;
    const fileInput = document.getElementById('deptRosterFileInput');
    if (fileInput) fileInput.value = '';

    const modal = document.getElementById('uploadRosterModal');
    if (modal) modal.style.display = 'flex';
}

function closeUploadRosterModal() {
    const modal = document.getElementById('uploadRosterModal');
    if (modal) modal.style.display = 'none';
}

/**
 * Dynamic Department Starter Template Generator (.xlsx)
 * Addresses User Request C1: Generates a pre-populated Excel workbook with that department's
 * active instructors, billet types, occupancy statuses, and tier dropdown validation references.
 */
function downloadDeptStarterTemplate(deptCode) {
    if (!deptCode) {
        deptCode = currentDeptFacultyCode || 'DFEM';
    }
    if (typeof XLSX === 'undefined') {
        alert("SheetJS library not loaded. Unable to generate Excel file.");
        return;
    }

    const data = (typeof getActiveWorkloadData === 'function') ? getActiveWorkloadData() : window.currentWorkloadData;
    const deptFac = (window.workbenchState.departmentRosters && window.workbenchState.departmentRosters[deptCode]) || [];
    const policy = window.workbenchState.policy || {};
    const tiers = policy.tiers || {};

    // 1. Sheet 1: Department_Roster
    const rosterHeaders = [
        "Instructor_Name",
        "Billet_Type",
        "Occupancy_Status",
        "Role_Tier",
        "Teaching_FTE_Pct",
        "Admin_Governance_Pct",
        "Sponsored_Research_Pct",
        "Lab_Ops_Safety_Pct",
        "Advisees_Count",
        "Notes"
    ];

    const rosterRows = [rosterHeaders];

    if (deptFac.length > 0) {
        deptFac.forEach(f => {
            rosterRows.push([
                f.instructor || 'Instructor Name',
                f.billet_type || 'Military',
                f.occupancy_status || 'Filled',
                f.tier_key || 'Line_Faculty',
                f.teaching_pct !== undefined ? f.teaching_pct : 75,
                f.admin_pct !== undefined ? f.admin_pct : 10,
                f.research_pct !== undefined ? f.research_pct : 10,
                f.labops_pct !== undefined ? f.labops_pct : 5,
                f.advisees_count !== undefined ? f.advisees_count : 0,
                f.notes || ''
            ]);
        });
    } else {
        // Sample starter rows if empty
        rosterRows.push(["Maj John Smith", "Military", "Filled", "Line_Faculty", 75, 10, 10, 5, 15, "Organic faculty"]);
        rosterRows.push(["Dr. Jane Doe", "Civilian", "Filled", "Course_Director", 50, 35, 10, 5, 20, "Director of Math 141"]);
        rosterRows.push(["Vacant Mil Bil #03", "Military", "Vacant", "Line_Faculty", 75, 10, 10, 5, 0, "Awaiting PCS arrival"]);
    }

    const wsRoster = XLSX.utils.aoa_to_sheet(rosterRows);

    // 2. Sheet 2: Reference_Tiers & Guidance
    const tierHeaders = ["Tier_Key", "Display_Name", "Expected_Sections", "Standard_Teaching_Pct", "Standard_Admin_Pct", "Standard_Research_Pct", "Standard_LabOps_Pct"];
    const tierRows = [tierHeaders];
    Object.entries(tiers).forEach(([k, t]) => {
        tierRows.push([
            k,
            t.name,
            t.expected_sections,
            t.teaching_pct,
            t.admin_pct,
            t.research_pct,
            t.labops_pct
        ]);
    });

    const wsTiers = XLSX.utils.aoa_to_sheet(tierRows);

    // Build workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsRoster, "Department_Roster");
    XLSX.utils.book_append_sheet(wb, wsTiers, "Tiers_Reference");

    // Write file
    const filename = `USAFA_${deptCode}_Faculty_Roster_Starter.xlsx`;
    XLSX.writeFile(wb, filename);
}

/**
 * Export Current Calibrated Department Roster to Excel
 */
function exportDeptRosterXLSX(deptCode) {
    if (!deptCode) deptCode = currentDeptFacultyCode;
    if (!deptCode) return;
    if (typeof XLSX === 'undefined') {
        alert("SheetJS library not loaded.");
        return;
    }

    const deptFac = (window.workbenchState.departmentRosters && window.workbenchState.departmentRosters[deptCode]) || [];
    const activeData = (typeof getActiveWorkloadData === 'function') ? getActiveWorkloadData() : null;
    const computedFac = (activeData && activeData.faculty_directory ? activeData.faculty_directory.filter(f => f.primary_dept === deptCode) : deptFac);

    const headers = [
        "Instructor_Name",
        "Primary_Dept",
        "Billet_Type",
        "Occupancy_Status",
        "Role_Tier",
        "Expected_Sections",
        "Teaching_Sections_Weighted",
        "Cadet_Contact_Load",
        "Advisees_Count",
        "Admin_Pct",
        "Research_Pct",
        "LabOps_Pct",
        "Admin_Sec_Equiv",
        "Research_Sec_Equiv",
        "LabOps_Sec_Equiv",
        "Gross_Burden_Sections",
        "Section_Delta_vs_Expected",
        "Courses_Taught"
    ];

    const rows = [headers];
    computedFac.forEach(f => {
        const se = f.section_equivalents || {};
        rows.push([
            f.instructor,
            f.primary_dept,
            f.billet_type || 'Military',
            f.occupancy_status || 'Filled',
            f.expected_tier || f.tier_key || 'Line_Faculty',
            f.expected_sections !== undefined ? f.expected_sections : 3.0,
            f.weighted_sections || 0,
            f.cadet_load_allocated || 0,
            f.advisees_count || 0,
            f.teaching_pct || 0,
            f.admin_pct || 0,
            f.research_pct || 0,
            f.labops_pct || 0,
            se.admin || 0,
            se.research || 0,
            se.labops || 0,
            se.gross_burden !== undefined ? se.gross_burden : f.weighted_sections,
            f.section_delta !== undefined ? f.section_delta : 0,
            (f.courses_taught || []).join('; ')
        ]);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, `${deptCode}_Calibrated`);

    XLSX.writeFile(wb, `USAFA_${deptCode}_Faculty_Roster_Calibrated.xlsx`);
}

/**
 * Handle Department Roster File Upload (.xlsx or .csv)
 */
function handleRosterFileUpload(file) {
    const deptCode = currentDeptFacultyCode;
    if (!deptCode || !file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

            if (!rows || rows.length < 2) {
                alert("The uploaded file does not contain any data rows.");
                return;
            }

            // Find header indexes flexibly
            const headers = rows[0].map(h => String(h).trim().toLowerCase().replace(/[^a-z0-9]/g, '_'));
            
            const getColIdx = (aliases) => {
                for (let a of aliases) {
                    const idx = headers.indexOf(a);
                    if (idx !== -1) return idx;
                }
                return -1;
            };

            const idxName = getColIdx(['instructor_name', 'instructor', 'name', 'faculty_member', 'faculty']);
            const idxBillet = getColIdx(['billet_type', 'billet', 'type', 'service', 'category']);
            const idxOccupancy = getColIdx(['occupancy_status', 'occupancy', 'status']);
            const idxTier = getColIdx(['role_tier', 'tier', 'expected_tier', 'role']);
            const idxTeach = getColIdx(['teaching_fte_pct', 'teaching_pct', 'teach_pct', 'teaching']);
            const idxAdmin = getColIdx(['admin_governance_pct', 'admin_pct', 'governance_pct', 'admin']);
            const idxRes = getColIdx(['sponsored_research_pct', 'research_pct', 'research']);
            const idxLab = getColIdx(['lab_ops_safety_pct', 'labops_pct', 'lab_pct', 'lab_ops']);
            const idxAdv = getColIdx(['advisees_count', 'advisees', 'advisee_count']);
            const idxNotes = getColIdx(['notes', 'note', 'comments']);

            if (idxName === -1) {
                alert("Could not locate an 'Instructor_Name' or 'Instructor' column in the uploaded file header.");
                return;
            }

            const newRoster = [];
            const policyTiers = (window.workbenchState && window.workbenchState.policy && window.workbenchState.policy.tiers) || {};

            for (let r = 1; r < rows.length; r++) {
                const row = rows[r];
                const name = String(row[idxName] || '').trim();
                if (!name) continue;

                // Parse Billet Type (Military vs Civilian non-fungible)
                let bType = 'Military';
                if (idxBillet !== -1 && row[idxBillet]) {
                    const str = String(row[idxBillet]).toLowerCase();
                    if (str.includes('civ')) bType = 'Civilian';
                    else if (str.includes('moa') || str.includes('adjunct') || str.includes('courtesy')) bType = 'MOA_Adjunct';
                    else bType = 'Military';
                }

                // Parse Occupancy
                let occ = 'Filled';
                if (idxOccupancy !== -1 && row[idxOccupancy]) {
                    const str = String(row[idxOccupancy]).toLowerCase();
                    if (str.includes('vacant')) occ = 'Vacant';
                    else occ = 'Filled';
                }

                // Parse Tier
                let tierKey = 'Line_Faculty';
                if (idxTier !== -1 && row[idxTier]) {
                    const rawTier = String(row[idxTier]).trim();
                    // Match directly or fuzzy
                    if (policyTiers[rawTier]) {
                        tierKey = rawTier;
                    } else {
                        if (lowTier.includes('lab') && lowTier.includes('staff')) tierKey = 'Lab_Staff';
                        else if (lowTier.includes('dir') || lowTier.includes('course') || lowTier.includes('cd') || lowTier.includes('flyer') || lowTier.includes('306')) tierKey = 'Course_Director';
                        else if (lowTier.includes('head') || lowTier.includes('dh') || lowTier.includes('div') || lowTier.includes('chief')) tierKey = 'Dept_Head';
                        else if (lowTier.includes('adjunct') || lowTier.includes('chair')) tierKey = 'Adjunct_Chair';
                        else if (lowTier.includes('moa') || lowTier.includes('courtesy')) tierKey = 'MOA_Courtesy';
                        else if (lowTier.includes('lab') && !lowTier.includes('head') && !lowTier.includes('dir')) tierKey = 'Lab_Staff';
                    }
                }

                const tierInfo = policyTiers[tierKey] || policyTiers['Line_Faculty'] || { expected_sections: 3.0, teaching_pct: 75, admin_pct: 10, research_pct: 10, labops_pct: 5 };

                const teachPct = idxTeach !== -1 && row[idxTeach] !== '' ? Number(row[idxTeach]) : tierInfo.teaching_pct;
                const adminPct = idxAdmin !== -1 && row[idxAdmin] !== '' ? Number(row[idxAdmin]) : tierInfo.admin_pct;
                const resPct = idxRes !== -1 && row[idxRes] !== '' ? Number(row[idxRes]) : tierInfo.research_pct;
                const labPct = idxLab !== -1 && row[idxLab] !== '' ? Number(row[idxLab]) : tierInfo.labops_pct;
                const advCount = idxAdv !== -1 && row[idxAdv] !== '' ? Number(row[idxAdv]) : 0;
                const notes = idxNotes !== -1 ? String(row[idxNotes] || '') : '';

                newRoster.push({
                    instructor: name,
                    primary_dept: deptCode,
                    school_code: 'OTHER',
                    billet_type: bType,
                    occupancy_status: occ,
                    tier_key: tierKey,
                    expected_tier: tierInfo.name || tierKey,
                    expected_sections: tierInfo.expected_sections,
                    teaching_pct: teachPct,
                    admin_pct: adminPct,
                    research_pct: resPct,
                    labops_pct: labPct,
                    advisees_count: advCount,
                    notes: notes,
                    is_manual: true
                });
            }

            if (newRoster.length === 0) {
                alert("No valid instructor rows found in the uploaded file.");
                return;
            }

            // Save to workbench state
            window.workbenchState.departmentRosters[deptCode] = newRoster;
            closeUploadRosterModal();
            recomputeWorkbenchMetrics();
            renderDepartmentDetails(deptCode);
            alert(`Successfully loaded calibrated roster for ${deptCode} (${newRoster.length} billets updated)!`);

        } catch (err) {
            console.error("Roster parsing error:", err);
            alert(`Failed to parse roster file: ${err.message}`);
        }
    };
    reader.readAsArrayBuffer(file);
}

/**
 * Department Course Offerings & Sections Table
 */
function sortDeptCoursesTable(colKey) {
    if (currentDeptCoursesSort.col === colKey) {
        currentDeptCoursesSort.dir = currentDeptCoursesSort.dir === 'asc' ? 'desc' : 'asc';
    } else {
        currentDeptCoursesSort.col = colKey;
        currentDeptCoursesSort.dir = (colKey === 'cadet_count' || colKey === 'credit_units') ? 'desc' : 'asc';
    }
    if (currentDeptCoursesCode) {
        renderDepartmentCoursesTable(currentDeptCoursesCode);
    }
}

function updateDeptCourseSortIcons() {
    const cols = ['course', 'title', 'section', 'term', 'cadet_count', 'credit_units'];
    cols.forEach(c => {
        const el = document.getElementById(`th-coursesort-${c}`);
        const th = el ? el.closest('th') : null;
        if (el) {
            if (currentDeptCoursesSort.col === c) {
                el.textContent = currentDeptCoursesSort.dir === 'asc' ? '▲' : '▼';
                if (th) {
                    th.classList.remove('sorted-desc', 'sorted-asc');
                    th.classList.add(currentDeptCoursesSort.dir === 'asc' ? 'sorted-asc' : 'sorted-desc');
                }
            } else {
                el.textContent = '↕';
                if (th) th.classList.remove('sorted-desc', 'sorted-asc');
            }
        }
    });
}

function filterDeptCoursesTable() {
    if (currentDeptCoursesCode) {
        renderDepartmentCoursesTable(currentDeptCoursesCode);
    }
}

function renderDepartmentCoursesTable(deptCode) {
    currentDeptCoursesCode = deptCode;
    const data = (typeof getActiveWorkloadData === 'function') ? getActiveWorkloadData() : window.currentWorkloadData;
    const tbody = document.getElementById('deptCoursesTbody');
    if (!tbody || !data) return;
    tbody.innerHTML = '';

    updateDeptCourseSortIcons();

    const dept = (data.departments || []).find(d => d.dept_code === deptCode);
    const subjs = dept ? (dept.subjects_included || []) : [];

    // Filter active sections for department
    const allSecs = (data.active_sections || data.sections_audit || []);
    let sections = allSecs.filter(s =>
        s.department === deptCode ||
        (deptCode === 'ESECE' && s.department === 'ESEC') ||
        (subjs && subjs.includes(s.subject))
    );

    // Apply text search query
    const searchInput = document.getElementById('deptCourseSearch');
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
    if (query) {
        sections = sections.filter(s => {
            const cStr = `${s.subject || ''} ${s.course_nbr || ''}`.toLowerCase();
            const tStr = (s.title || '').toLowerCase();
            const secStr = (s.section || '').toLowerCase();
            const instStr = (s.instructors || []).join(' ').toLowerCase();
            return cStr.includes(query) || tStr.includes(query) || secStr.includes(query) || instStr.includes(query);
        });
    }

    if (sections.length === 0) {
        const msg = query 
            ? 'No course sections match your search query.' 
            : 'No active course sections recorded for this department (under active exclusion filters).';
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#64748b; padding:18px;">${msg}</td></tr>`;
        return;
    }

    // Sort sections
    sections.sort((a, b) => {
        let valA, valB;
        switch (currentDeptCoursesSort.col) {
            case 'course':
                valA = `${a.subject} ${a.course_nbr}`;
                valB = `${b.subject} ${b.course_nbr}`;
                break;
            case 'title':
                valA = (a.title || '').toLowerCase();
                valB = (b.title || '').toLowerCase();
                break;
            case 'section':
                valA = (a.section || '').toLowerCase();
                valB = (b.section || '').toLowerCase();
                break;
            case 'term':
                valA = String(a.term || '');
                valB = String(b.term || '');
                break;
            case 'cadet_count':
                valA = a.cadet_count !== undefined ? a.cadet_count : (a.cadets || 0);
                valB = b.cadet_count !== undefined ? b.cadet_count : (b.cadets || 0);
                break;
            case 'credit_units':
                valA = a.credit_units !== undefined ? a.credit_units : (a.credits || 0);
                valB = b.credit_units !== undefined ? b.credit_units : (b.credits || 0);
                break;
            default:
                valA = `${a.subject} ${a.course_nbr}`;
                valB = `${b.subject} ${b.course_nbr}`;
        }
        if (valA < valB) return currentDeptCoursesSort.dir === 'asc' ? -1 : 1;
        if (valA > valB) return currentDeptCoursesSort.dir === 'asc' ? 1 : -1;
        return 0;
    });

    const knownFacultySet = new Set((data.faculty_directory || []).map(x => x.instructor));

    sections.forEach(s => {
        const tr = document.createElement('tr');
        const courseName = `${s.subject} ${s.course_nbr}`;
        const cadetCount = s.cadet_count !== undefined ? s.cadet_count : (s.cadets || 0);
        const countStyle = s.is_sub10 ? 'color: #b45309; font-weight: 700;' : 'font-weight: 700;';

        // Format instructors
        let instHtml = '';
        if (s.instructors && s.instructors.length > 0) {
            instHtml = s.instructors.map(inst => {
                const displayName = window.maskFacultyNames ? 'Faculty Member' : inst;
                if (knownFacultySet.has(inst)) {
                    return `<span style="color:var(--primary); cursor:pointer; font-weight:600; text-decoration:underline dotted;" onclick="openFacultyModal('${inst.replace(/'/g, "\\'")}')" title="View instructor workload">${displayName}</span>`;
                } else {
                    return `<span style="color:var(--text-main); font-weight:500;">${displayName}</span>`;
                }
            }).join(', ');
        } else {
            instHtml = '<span style="color:#94a3b8; font-style:italic;">Unassigned / Staff</span>';
        }

        // Badges for flags
        const badges = [];
        if (s.is_sub10) {
            badges.push('<span class="badge badge-sub10" title="Low enrollment section (≤ 10 cadets)">≤ 10 Cadets</span>');
        }
        if (s.is_capstone) {
            badges.push('<span class="badge badge-capstone" title="Senior Capstone Design / Culminating Experience">Capstone</span>');
        }
        if (s.is_499) {
            badges.push('<span class="badge" style="background:#e0f2fe; color:#0369a1; font-weight:700;" title="Independent Study (499)">499 Ind Study</span>');
        }
        if (s.credit_type === 'Half Credit' || s.section_weight === 0.5) {
            badges.push('<span class="badge" style="background:#fef3c7; color:#b45309; font-weight:700;" title="Half Credit Course (0.50x Section / 0.50x Cadet Contact)">½ Credit</span>');
        }
        if (s.credit_type === 'Quarter Credit' || s.section_weight === 0.25) {
            badges.push('<span class="badge" style="background:#f3e8ff; color:#7e22ce; font-weight:700;" title="Quarter Credit Course (0.25x Section / 0.25x Cadet Contact)">¼ Credit</span>');
        }
        const flagsHtml = badges.length > 0 ? badges.join(' ') : '<span style="color:#cbd5e1;">—</span>';

        tr.innerHTML = `
            <td><strong>${courseName}</strong></td>
            <td style="font-size: 12.5px; max-width: 260px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${s.title || ''}">${s.title || '—'}</td>
            <td><span class="badge badge-status" style="font-weight:600;">${s.section}</span></td>
            <td style="font-size: 12px; color: var(--text-muted);">${s.term || '—'}</td>
            <td class="num" style="${countStyle}">${cadetCount}</td>
            <td class="num">${s.credit_units !== undefined ? Number(s.credit_units).toFixed(1) : '—'}</td>
            <td style="font-size: 12px;">${instHtml}</td>
            <td>${flagsHtml}</td>
        `;
        tbody.appendChild(tr);
    });
}

// =========================================================================
// SCHOOL DRILLDOWN CONTROLLERS
// =========================================================================

function renderSchoolDetails(schoolCode) {
    currentSchoolDrilldownCode = schoolCode;
    const deptCont = document.getElementById('deptDrilldownContainer');
    const schoolCont = document.getElementById('schoolDrilldownContainer');
    if (deptCont) deptCont.style.display = 'none';
    if (schoolCont) schoolCont.style.display = 'block';

    const data = (typeof getActiveWorkloadData === 'function') ? getActiveWorkloadData() : window.currentWorkloadData;
    if (!data) return;

    const school = (data.schools || []).find(s => s.school_code === schoolCode) || {
        school_code: schoolCode,
        school_name: schoolCode,
        icon: '🏛️'
    };

    const schoolDepts = (data.departments || []).filter(d => (d.school_code || 'OTHER') === schoolCode);

    // Update Title & Banner
    setTextSafe('schoolTitle', `${school.icon || '🏛️'} ${school.school_name} (${school.school_code})`);
    setTextSafe('schoolDesc', `${school.dean ? school.dean + ' — ' : ''}Comprehensive school-level academic footprint, cross-department comparison, and personnel directory`);
    setTextSafe('deptSubjs', `Academic Departments: ${schoolDepts.map(d => d.dept_code).join(', ')}`);
    const deanBadge = document.getElementById('schoolDeanBadgeDetail');
    if (deanBadge) {
        deanBadge.textContent = school.dean ? `Dean: ${school.dean}` : '';
    }

    // Dynamic aggregations from departments
    const totDepts = schoolDepts.length;
    const totSecs = school.total_sections !== undefined ? school.total_sections : Math.round(schoolDepts.reduce((acc, d) => acc + (d.total_sections || 0), 0) * 10) / 10;
    const totSeats = school.total_cadet_seats !== undefined ? school.total_cadet_seats : Math.round(schoolDepts.reduce((acc, d) => acc + (d.total_cadet_seats || 0), 0) * 10) / 10;
    const totSCH = school.total_sch !== undefined ? school.total_sch : Math.round(schoolDepts.reduce((acc, d) => acc + (d.total_sch || 0), 0) * 10) / 10;
    const totFac = school.teaching_faculty_count !== undefined ? school.teaching_faculty_count : schoolDepts.reduce((acc, d) => acc + (d.teaching_faculty_count || d.faculty_count || 0), 0);
    const totBillets = school.all_billets_count !== undefined ? school.all_billets_count : schoolDepts.reduce((acc, d) => acc + ((d.billet_summary && d.billet_summary.authorized) || d.faculty_count || 0), 0);
    const sub10Count = school.sub10_sections_count !== undefined ? school.sub10_sections_count : schoolDepts.reduce((acc, d) => acc + (d.sub10_sections_count || 0), 0);
    const sub10Pct = school.sub10_percentage !== undefined ? school.sub10_percentage : (totSecs > 0 ? Math.round((sub10Count / totSecs) * 1000) / 10 : 0);

    const schAvgSize = totSecs > 0
        ? (totSeats / totSecs).toFixed(1)
        : (school.overall_avg_section_size !== undefined ? Number(school.overall_avg_section_size).toFixed(1) : '0.0');

    // KPIs
    setTextSafe('schoolMetricDepts', totDepts);
    setTextSafe('schoolMetricSections', totSecs);
    setTextSafe('schoolMetricSectionsSub', `Classrooms & labs (Avg: ${schAvgSize})`);
    setTextSafe('schoolMetricAvgSize', schAvgSize);
    setTextSafe('schoolMetricSeats', Math.round(totSeats).toLocaleString());
    setTextSafe('schoolMetricSCH', Math.round(totSCH).toLocaleString());
    setTextSafe('schoolMetricFaculty', `${totFac} teaching / ${totBillets} billets`);
    setTextSafe('schoolMetricSub10', `${sub10Count} (${sub10Pct}%)`);

    // Render Department Comparative Table
    renderSchoolDeptsTable(schoolDepts);

    // Aggregated section size distribution for charts
    const schSizeDist = {'<=10': 0, '11-15': 0, '16-20': 0, '21-25': 0, '26+': 0};
    schoolDepts.forEach(d => {
        if (d.section_size_distribution) {
            for (const k of Object.keys(schSizeDist)) {
                schSizeDist[k] += (d.section_size_distribution[k] || 0);
            }
        }
    });

    // Render Visualizations
    try {
        if (typeof renderSchoolDeptChart === 'function') {
            renderSchoolDeptChart(schoolDepts);
        }
        if (typeof renderSchoolSizeDistChart === 'function') {
            renderSchoolSizeDistChart(schSizeDist);
        }
    } catch (e) {
        console.error("Error rendering school charts:", e);
    }

    // Render School Faculty
    renderSchoolFacultyTable(schoolCode);

    // Render School Courses
    renderSchoolCoursesTable(schoolCode);
}

function renderSchoolDeptsTable(schoolDepts) {
    const tbody = document.getElementById('schoolDeptsTbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const data = (typeof getActiveWorkloadData === 'function') ? getActiveWorkloadData() : window.currentWorkloadData;
    const depts = schoolDepts || (data ? (data.departments || []).filter(d => (d.school_code || 'OTHER') === currentSchoolDrilldownCode) : []);

    // Update active cap label in header
    const capLabel = document.getElementById('th-schooldepts-cap-label');
    const currentCap = (window.workbenchState?.policy?.standardSectionCap) || 24;
    if (capLabel) {
        capLabel.textContent = `Cap ${currentCap} Demand`;
    }

    // Update sort icons
    const cols = ['dept_code', 'dept_name', 'total_courses', 'target_sections', 'actual_sections', 'standard_sections', 'compression_delta', 'total_cadet_seats', 'total_sch', 'teaching_faculty_count', 'sections_per_inst_mean', 'sub10_percentage'];
    cols.forEach(c => {
        const icon = document.getElementById(`th-schooldepts-${c}`);
        if (icon) {
            if (currentSchoolDeptsSort.col === c) {
                icon.textContent = currentSchoolDeptsSort.dir === 'desc' ? '▼' : '▲';
            } else {
                icon.textContent = '↕';
            }
        }
    });

    // Sorting
    const sorted = depts.slice().sort((a, b) => {
        const c = currentSchoolDeptsSort.col;
        const dir = currentSchoolDeptsSort.dir;
        let valA = a[c];
        let valB = b[c];
        if (c === 'teaching_faculty_count') {
            valA = a.teaching_faculty_count || a.faculty_count || 0;
            valB = b.teaching_faculty_count || b.faculty_count || 0;
        } else if (c === 'actual_sections') {
            valA = a.actual_sections !== undefined ? a.actual_sections : (a.total_sections || 0);
            valB = b.actual_sections !== undefined ? b.actual_sections : (b.total_sections || 0);
        }
        if (typeof valA === 'number' || typeof valB === 'number') {
            valA = Number(valA) || 0;
            valB = Number(valB) || 0;
            return dir === 'desc' ? (valB - valA) : (valA - valB);
        }
        valA = String(valA || '').toLowerCase();
        valB = String(valB || '').toLowerCase();
        return dir === 'desc' ? valB.localeCompare(valA) : valA.localeCompare(valB);
    });

    sorted.forEach(d => {
        const tr = document.createElement('tr');
        const facTeaching = d.teaching_faculty_count !== undefined ? d.teaching_faculty_count : (d.faculty_count || 0);
        const facAuth = (d.billet_summary && d.billet_summary.authorized) !== undefined ? d.billet_summary.authorized : facTeaching;
        const meanSecs = d.sections_per_inst_mean !== undefined ? Number(d.sections_per_inst_mean).toFixed(1) : '—';
        const sub10Display = `${d.sub10_sections_count || 0} (${d.sub10_percentage || 0}%)`;

        const targetSec = d.target_sections !== undefined ? Number(d.target_sections).toFixed(1) : (d.capacity_balance?.target_sections !== undefined ? Number(d.capacity_balance.target_sections).toFixed(1) : '—');
        const actualSec = d.actual_sections !== undefined ? Number(d.actual_sections).toFixed(1) : (d.total_sections !== undefined ? Number(d.total_sections).toFixed(1) : '0.0');
        const standardSec = d.standard_sections !== undefined ? Number(d.standard_sections).toFixed(1) : (d.capacity_balance?.standard_sections !== undefined ? Number(d.capacity_balance.standard_sections).toFixed(1) : '—');
        const compDelta = d.compression_delta !== undefined ? Number(d.compression_delta) : (d.capacity_balance?.compression_delta !== undefined ? Number(d.capacity_balance.compression_delta) : 0);

        let compStyle = 'color: #15803d; font-weight: 600;';
        let compSign = compDelta > 0 ? `+${compDelta.toFixed(1)}` : compDelta.toFixed(1);
        if (compDelta > 2.0) {
            compStyle = 'color: #b45309; font-weight: 800; background: #fffbeb; border: 1px solid #fde68a; padding: 2px 7px; border-radius: 4px; display: inline-block;';
        } else if (compDelta < -2.0) {
            compStyle = 'color: #0369a1; font-weight: 700; background: #eff6ff; border: 1px solid #bfdbfe; padding: 2px 7px; border-radius: 4px; display: inline-block;';
        }

        tr.innerHTML = `
            <td><strong style="color:var(--primary);">${d.dept_code}</strong></td>
            <td style="font-weight:600;">${d.dept_name}</td>
            <td class="num">${d.total_courses || 0}</td>
            <td class="num"><strong style="color:var(--primary);">${targetSec}</strong></td>
            <td class="num"><strong>${actualSec}</strong></td>
            <td class="num"><strong style="color:#7c3aed;">${standardSec}</strong></td>
            <td class="num"><span style="${compStyle}">${compSign}</span></td>
            <td class="num">${(d.total_cadet_seats || 0).toLocaleString()}</td>
            <td class="num"><strong style="color:var(--primary);">${Math.round(d.total_sch || 0).toLocaleString()}</strong></td>
            <td class="num">${facTeaching} / ${facAuth}</td>
            <td class="num">${meanSecs}</td>
            <td class="num" style="${(d.sub10_percentage || 0) > 30 ? 'color:#b45309; font-weight:700;' : ''}">${sub10Display}</td>
            <td style="text-align:center;">
                <button class="btn btn-sm btn-primary" onclick="selectDepartmentDrilldown('${d.dept_code}')" style="padding:4px 10px; font-size:11.5px; font-weight:600; cursor:pointer;" title="View detailed workbench for ${d.dept_code}">🔍 View Dept</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function sortSchoolDeptsTable(col) {
    if (currentSchoolDeptsSort.col === col) {
        currentSchoolDeptsSort.dir = currentSchoolDeptsSort.dir === 'asc' ? 'desc' : 'asc';
    } else {
        currentSchoolDeptsSort.col = col;
        currentSchoolDeptsSort.dir = ['dept_code', 'dept_name'].includes(col) ? 'asc' : 'desc';
    }
    renderSchoolDeptsTable();
}

function selectDepartmentDrilldown(deptCode) {
    const sel = document.getElementById('deptSelect');
    if (sel) {
        sel.value = deptCode;
    }
    renderDrilldown(deptCode);
}

function renderSchoolFacultyTable(schoolCode) {
    schoolCode = schoolCode || currentSchoolDrilldownCode;
    const tbody = document.getElementById('schoolFacultyTbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const data = (typeof getActiveWorkloadData === 'function') ? getActiveWorkloadData() : window.currentWorkloadData;
    if (!data) return;

    const schoolDepts = (data.departments || []).filter(d => (d.school_code || 'OTHER') === schoolCode);
    const deptCodes = new Set(schoolDepts.map(d => d.dept_code));

    let faculty = (data.faculty_directory || []).filter(f => f.school_code === schoolCode || deptCodes.has(f.primary_dept));

    // Update sort icons
    const cols = ['instructor', 'primary_dept', 'expected_tier', 'expected_sections', 'relief_sections', 'weighted_sections', 'section_delta'];
    cols.forEach(c => {
        const icon = document.getElementById(`th-schoolfac-${c}`);
        if (icon) {
            if (currentSchoolFacultySort.col === c) {
                icon.textContent = currentSchoolFacultySort.dir === 'desc' ? '▼' : '▲';
            } else {
                icon.textContent = '↕';
            }
        }
    });

    // Text search filter
    const searchInput = document.getElementById('schoolFacultySearch');
    const q = searchInput ? searchInput.value.trim().toLowerCase() : '';
    if (q) {
        faculty = faculty.filter(f => {
            const name = (f.instructor || '').toLowerCase();
            const dept = (f.primary_dept || '').toLowerCase();
            const tier = (f.expected_tier || f.tier_key || '').toLowerCase();
            return name.includes(q) || dept.includes(q) || tier.includes(q);
        });
    }

    if (faculty.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; color:#64748b; padding:16px;">No faculty found matching the current criteria in this school.</td></tr>`;
        return;
    }

    // Sort
    faculty.sort((a, b) => {
        const c = currentSchoolFacultySort.col;
        const dir = currentSchoolFacultySort.dir;
        let valA, valB;
        if (c === 'relief_sections') {
            valA = (a.section_equivalents ? (a.section_equivalents.admin + a.section_equivalents.research + a.section_equivalents.labops) : 0);
            valB = (b.section_equivalents ? (b.section_equivalents.admin + b.section_equivalents.research + b.section_equivalents.labops) : 0);
        } else if (c === 'expected_sections') {
            valA = a.expected_sections !== undefined ? Number(a.expected_sections) : 3.0;
            valB = b.expected_sections !== undefined ? Number(b.expected_sections) : 3.0;
        } else {
            valA = a[c];
            valB = b[c];
        }

        if (typeof valA === 'number' || typeof valB === 'number') {
            valA = Number(valA) || 0;
            valB = Number(valB) || 0;
            return dir === 'desc' ? (valB - valA) : (valA - valB);
        }
        valA = String(valA || '').toLowerCase();
        valB = String(valB || '').toLowerCase();
        return dir === 'desc' ? valB.localeCompare(valA) : valA.localeCompare(valB);
    });

    faculty.forEach((f, idx) => {
        const rawName = f.instructor;
        const displayName = window.maskFacultyNames ? `Faculty ${String(idx + 1).padStart(2, '0')}` : rawName;
        const bType = f.billet_type || 'Military';
        const occ = f.occupancy_status || 'Filled';
        const isVacant = (occ === 'Vacant');

        const reliefSec = (f.section_equivalents ? (f.section_equivalents.admin + f.section_equivalents.research + f.section_equivalents.labops) : 0).toFixed(1);

        const delta = f.section_delta !== undefined ? f.section_delta : 0;
        let deltaBadge = '';
        if (delta > 0) {
            deltaBadge = `<span class="badge" style="background:#eff6ff; color:#1d4ed8; font-size:11px;">+${delta.toFixed(1)}</span>`;
        } else if (delta < 0) {
            deltaBadge = `<span class="badge" style="background:#fef3c7; color:#b45309; font-size:11px;">${delta.toFixed(1)}</span>`;
        } else {
            deltaBadge = `<span class="badge" style="background:#dcfce7; color:#15803d; font-size:11px;">0.0 (Target)</span>`;
        }

        const nameDisplay = isVacant
            ? `<span style="color:#b45309; font-weight:700;">${displayName} <span class="badge" style="background:#fee2e2; color:#b91c1c; font-size:10px;">VACANT</span></span>`
            : `<strong style="color:var(--primary); cursor:pointer;" onclick="openFacultyModal('${rawName.replace(/'/g, "\\'")}')" title="Click to view detailed teaching assignments">${displayName}</strong>`;

        const tr = document.createElement('tr');
        if (isVacant) tr.style.background = '#fffdf7';

        tr.innerHTML = `
            <td>${nameDisplay}</td>
            <td><span class="badge badge-dept">${f.primary_dept || '—'}</span></td>
            <td><span style="font-size:12px; font-weight:600;">${bType === 'Military' ? '🎖️ Mil' : (bType === 'Civilian' ? '🏛️ Civ' : '🤝 MOA')}</span></td>
            <td><span class="badge ${occ === 'Vacant' ? 'badge-sub10' : 'badge-status'}" style="font-size:11px;">${occ}</span></td>
            <td><span style="font-size:12px;">${f.expected_tier || f.tier_key || 'Line Faculty'}</span></td>
            <td class="num">${f.expected_sections !== undefined ? Number(f.expected_sections).toFixed(1) : '3.0'}</td>
            <td class="num" style="font-size:12px; color:var(--text-muted);" title="Admin: ${(f.section_equivalents?.admin || 0).toFixed(1)}s | Research: ${(f.section_equivalents?.research || 0).toFixed(1)}s | LabOps: ${(f.section_equivalents?.labops || 0).toFixed(1)}s">+${reliefSec}s</td>
            <td class="num"><strong>${f.weighted_sections || 0}</strong></td>
            <td class="num">${deltaBadge}</td>
            <td style="text-align:center;">
                <button class="btn btn-sm" onclick="selectDepartmentDrilldown('${f.primary_dept}')" style="padding:2px 8px; font-size:11px; cursor:pointer;" title="Go to ${f.primary_dept} Workbench">Go to Dept</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function sortSchoolFacultyTable(col) {
    if (currentSchoolFacultySort.col === col) {
        currentSchoolFacultySort.dir = currentSchoolFacultySort.dir === 'asc' ? 'desc' : 'asc';
    } else {
        currentSchoolFacultySort.col = col;
        currentSchoolFacultySort.dir = ['instructor', 'primary_dept', 'expected_tier'].includes(col) ? 'asc' : 'desc';
    }
    renderSchoolFacultyTable();
}

function filterSchoolFacultyTable() {
    renderSchoolFacultyTable();
}

function renderSchoolCoursesTable(schoolCode) {
    schoolCode = schoolCode || currentSchoolDrilldownCode;
    const tbody = document.getElementById('schoolCoursesTbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const data = (typeof getActiveWorkloadData === 'function') ? getActiveWorkloadData() : window.currentWorkloadData;
    if (!data) return;

    const schoolDepts = (data.departments || []).filter(d => (d.school_code || 'OTHER') === schoolCode);
    const deptCodes = new Set(schoolDepts.map(d => d.dept_code));

    let sections = (data.sections_audit || data.sections || []).filter(s => s.school_code === schoolCode || deptCodes.has(s.department));

    // Update sort icons
    const cols = ['course', 'title', 'department', 'section', 'term', 'cadet_count', 'credit_units'];
    cols.forEach(c => {
        const icon = document.getElementById(`th-schoolcourses-${c}`);
        if (icon) {
            if (currentSchoolCoursesSort.col === c) {
                icon.textContent = currentSchoolCoursesSort.dir === 'desc' ? '▼' : '▲';
            } else {
                icon.textContent = '↕';
            }
        }
    });

    // Search filter
    const searchInput = document.getElementById('schoolCourseSearch');
    const q = searchInput ? searchInput.value.trim().toLowerCase() : '';
    if (q) {
        sections = sections.filter(s => {
            const cName = `${s.subject || ''} ${s.course_nbr || ''}`.toLowerCase();
            const title = (s.title || '').toLowerCase();
            const sec = (s.section || '').toLowerCase();
            const dept = (s.department || '').toLowerCase();
            const insts = (s.instructors || []).join(' ').toLowerCase();
            return cName.includes(q) || title.includes(q) || sec.includes(q) || dept.includes(q) || insts.includes(q);
        });
    }

    if (sections.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:#64748b; padding:16px;">No course sections found matching the criteria in this school.</td></tr>`;
        return;
    }

    // Sort
    sections.sort((a, b) => {
        const c = currentSchoolCoursesSort.col;
        const dir = currentSchoolCoursesSort.dir;
        let valA, valB;
        switch (c) {
            case 'course':
                valA = `${a.subject} ${a.course_nbr}`;
                valB = `${b.subject} ${b.course_nbr}`;
                break;
            case 'title':
                valA = String(a.title || '').toLowerCase();
                valB = String(b.title || '').toLowerCase();
                break;
            case 'department':
                valA = String(a.department || '').toLowerCase();
                valB = String(b.department || '').toLowerCase();
                break;
            case 'section':
                valA = String(a.section || '').toLowerCase();
                valB = String(b.section || '').toLowerCase();
                break;
            case 'term':
                valA = String(a.term || '');
                valB = String(b.term || '');
                break;
            case 'cadet_count':
                valA = a.cadet_count !== undefined ? a.cadet_count : (a.cadets || 0);
                valB = b.cadet_count !== undefined ? b.cadet_count : (b.cadets || 0);
                break;
            case 'credit_units':
                valA = a.credit_units !== undefined ? a.credit_units : (a.credits || 0);
                valB = b.credit_units !== undefined ? b.credit_units : (b.credits || 0);
                break;
            default:
                valA = `${a.subject} ${a.course_nbr}`;
                valB = `${b.subject} ${b.course_nbr}`;
        }

        if (typeof valA === 'number' || typeof valB === 'number') {
            valA = Number(valA) || 0;
            valB = Number(valB) || 0;
            return dir === 'desc' ? (valB - valA) : (valA - valB);
        }
        valA = String(valA || '');
        valB = String(valB || '');
        return dir === 'desc' ? valB.localeCompare(valA) : valA.localeCompare(valB);
    });

    const knownFacultySet = new Set((data.faculty_directory || []).map(x => x.instructor));

    sections.forEach(s => {
        const tr = document.createElement('tr');
        const courseName = `${s.subject} ${s.course_nbr}`;
        const cadetCount = s.cadet_count !== undefined ? s.cadet_count : (s.cadets || 0);
        const countStyle = s.is_sub10 ? 'color: #b45309; font-weight: 700;' : 'font-weight: 700;';

        let instHtml = '';
        if (s.instructors && s.instructors.length > 0) {
            instHtml = s.instructors.map(inst => {
                const displayName = window.maskFacultyNames ? 'Faculty Member' : inst;
                if (knownFacultySet.has(inst)) {
                    return `<span style="color:var(--primary); cursor:pointer; font-weight:600; text-decoration:underline dotted;" onclick="openFacultyModal('${inst.replace(/'/g, "\\'")}')" title="View instructor workload">${displayName}</span>`;
                } else {
                    return `<span style="color:var(--text-main); font-weight:500;">${displayName}</span>`;
                }
            }).join(', ');
        } else {
            instHtml = '<span style="color:#94a3b8; font-style:italic;">Unassigned / Staff</span>';
        }

        const badges = [];
        if (s.is_sub10) badges.push('<span class="badge badge-sub10" title="Low enrollment section (≤ 10 cadets)">≤ 10 Cadets</span>');
        if (s.is_capstone) badges.push('<span class="badge badge-capstone" title="Senior Capstone Design">Capstone</span>');
        if (s.is_499) badges.push('<span class="badge" style="background:#e0f2fe; color:#0369a1; font-weight:700;" title="Independent Study (499)">499 Ind Study</span>');
        if (s.credit_type === 'Half Credit' || s.section_weight === 0.5) badges.push('<span class="badge" style="background:#fef3c7; color:#b45309; font-weight:700;">½ Credit</span>');
        if (s.credit_type === 'Quarter Credit' || s.section_weight === 0.25) badges.push('<span class="badge" style="background:#f3e8ff; color:#7e22ce; font-weight:700;">¼ Credit</span>');
        const flagsHtml = badges.length > 0 ? badges.join(' ') : '<span style="color:#cbd5e1;">—</span>';

        tr.innerHTML = `
            <td><strong>${courseName}</strong></td>
            <td style="font-size: 12.5px; max-width: 240px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${s.title || ''}">${s.title || '—'}</td>
            <td><span class="badge badge-dept">${s.department || '—'}</span></td>
            <td><span class="badge badge-status" style="font-weight:600;">${s.section}</span></td>
            <td style="font-size: 12px; color: var(--text-muted);">${s.term || '—'}</td>
            <td class="num" style="${countStyle}">${cadetCount}</td>
            <td class="num">${s.credit_units !== undefined ? Number(s.credit_units).toFixed(1) : '—'}</td>
            <td style="font-size: 12px;">${instHtml}</td>
            <td>${flagsHtml}</td>
        `;
        tbody.appendChild(tr);
    });
}

function sortSchoolCoursesTable(col) {
    if (currentSchoolCoursesSort.col === col) {
        currentSchoolCoursesSort.dir = currentSchoolCoursesSort.dir === 'asc' ? 'desc' : 'asc';
    } else {
        currentSchoolCoursesSort.col = col;
        currentSchoolCoursesSort.dir = ['course', 'title', 'department', 'section', 'term'].includes(col) ? 'asc' : 'desc';
    }
    renderSchoolCoursesTable();
}

function filterSchoolCoursesTable() {
    renderSchoolCoursesTable();
}

