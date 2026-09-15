/**
 * USAFA Academic Workload Workbench — Admin & Policy Configuration View
 * ---------------------------------------------------------------------
 * Provides interactive institutional controls for curriculum baselines,
 * academic subject filters, capstone catalog numbers, dynamic faculty tiers,
 * and policy JSON configuration export/import.
 */

function renderAdminPolicyTab() {
    const st = window.workbenchState;
    if (!st || !st.policy) return;

    renderAdminCurriculumControls();
    renderAdminTierManager();
}

/**
 * 1. Curriculum & Filtering Controls
 */
function renderAdminCurriculumControls() {
    const policy = window.workbenchState.policy;
    const allSecs = window.workbenchState.rawSections || [];

    // Extract all unique subjects from raw sections
    const allSubjectsSet = new Set();
    allSecs.forEach(s => {
        if (s.subject) allSubjectsSet.add(s.subject);
    });
    const allSubjects = Array.from(allSubjectsSet).sort();

    // Subject Checkboxes Grid
    const subjContainer = document.getElementById('adminSubjectsGrid');
    const subjSearch = (document.getElementById('adminSubjSearch')?.value || '').toUpperCase();
    const activeSubjs = new Set(policy.includedSubjects || allSubjects);

    if (subjContainer) {
        subjContainer.innerHTML = '';
        const filteredSubjs = allSubjects.filter(sub => sub.includes(subjSearch));

        filteredSubjs.forEach(sub => {
            const isChecked = activeSubjs.has(sub);
            const label = document.createElement('label');
            label.className = `admin-subj-chip ${isChecked ? 'active' : ''}`;
            label.style.display = 'inline-flex';
            label.style.alignItems = 'center';
            label.style.gap = '6px';
            label.style.padding = '5px 10px';
            label.style.fontSize = '12px';
            label.style.borderRadius = '6px';
            label.style.border = isChecked ? '1px solid var(--primary-light)' : '1px solid var(--border)';
            label.style.background = isChecked ? '#eff6ff' : '#fff';
            label.style.color = isChecked ? 'var(--primary)' : 'var(--text-muted)';
            label.style.cursor = 'pointer';
            label.style.fontWeight = isChecked ? '700' : '500';

            const chk = document.createElement('input');
            chk.type = 'checkbox';
            chk.checked = isChecked;
            chk.value = sub;
            chk.style.cursor = 'pointer';
            chk.onchange = () => toggleSubjectInclusion(sub, chk.checked);

            label.appendChild(chk);
            label.appendChild(document.createTextNode(sub));
            subjContainer.appendChild(label);
        });

        // Update count badge
        const countBadge = document.getElementById('adminSubjCountBadge');
        if (countBadge) {
            countBadge.textContent = `${activeSubjs.size} of ${allSubjects.length} subjects active`;
        }
    }

    // Helper to populate Subject dropdowns
    function populateSubjectSelect(selectId) {
        const select = document.getElementById(selectId);
        if (select && select.options.length <= 1) {
            const curVal = select.value;
            select.innerHTML = '<option value="">-- Select Subject --</option>';
            allSubjects.forEach(sub => {
                const opt = document.createElement('option');
                opt.value = sub;
                opt.textContent = sub;
                select.appendChild(opt);
            });
            if (curVal) select.value = curVal;
        }
    }

    populateSubjectSelect('adminNewCapstoneSubject');
    populateSubjectSelect('adminNewHalfCreditSubject');
    populateSubjectSelect('adminNewQuarterCreditSubject');

    // Capstone Catalog (Subject + Course Number) Tag Manager
    const capContainer = document.getElementById('adminCapstonesList');
    if (capContainer) {
        capContainer.innerHTML = '';
        const caps = policy.capstoneCourses || [];
        caps.forEach(capItem => {
            const capStr = typeof capItem === 'string' ? capItem : `${capItem.subject} ${capItem.course_nbr}`;
            const tag = document.createElement('span');
            tag.className = 'badge badge-capstone';
            tag.style.padding = '6px 12px';
            tag.style.fontSize = '12px';
            tag.style.display = 'inline-flex';
            tag.style.alignItems = 'center';
            tag.style.gap = '8px';
            const escapedStr = capStr.replace(/'/g, "\\'");
            tag.innerHTML = `<span><strong>${capStr}</strong></span><button type="button" onclick="removeCapstoneCourse('${escapedStr}')" style="background:none; border:none; color:#6b21a8; font-size:14px; font-weight:bold; cursor:pointer; padding:0 2px;" title="Remove ${capStr} from capstones">&times;</button>`;
            capContainer.appendChild(tag);
        });
    }

    // 1/2 Credit Courses Tag Manager
    const halfContainer = document.getElementById('adminHalfCreditList');
    const halfBadge = document.getElementById('adminHalfCreditCountBadge');
    if (halfContainer) {
        halfContainer.innerHTML = '';
        const halfList = policy.halfCreditCourses || [];
        if (halfBadge) halfBadge.textContent = `${halfList.length} course${halfList.length === 1 ? '' : 's'}`;
        if (halfList.length === 0) {
            halfContainer.innerHTML = '<span style="font-size:12px; color:var(--text-muted); font-style:italic;">No ½ credit courses configured (all courses count 1.00x full credit by default).</span>';
        } else {
            halfList.forEach(cItem => {
                const cStr = typeof cItem === 'string' ? cItem : `${cItem.subject} ${cItem.course_nbr}`;
                const tag = document.createElement('span');
                tag.className = 'badge';
                tag.style.background = '#fef3c7';
                tag.style.color = '#92400e';
                tag.style.border = '1px solid #fde68a';
                tag.style.padding = '5px 10px';
                tag.style.fontSize = '12px';
                tag.style.display = 'inline-flex';
                tag.style.alignItems = 'center';
                tag.style.gap = '8px';
                const escapedStr = cStr.replace(/'/g, "\\'");
                tag.innerHTML = `<span><strong>${cStr}</strong></span><button type="button" onclick="removeHalfCreditCourse('${escapedStr}')" style="background:none; border:none; color:#b45309; font-size:14px; font-weight:bold; cursor:pointer; padding:0 2px; line-height:1;" title="Remove ${cStr} (revert to full credit)">&times;</button>`;
                halfContainer.appendChild(tag);
            });
        }
    }

    // 1/4 Credit Courses Tag Manager
    const quarterContainer = document.getElementById('adminQuarterCreditList');
    const quarterBadge = document.getElementById('adminQuarterCreditCountBadge');
    if (quarterContainer) {
        quarterContainer.innerHTML = '';
        const quarterList = policy.quarterCreditCourses || [];
        if (quarterBadge) quarterBadge.textContent = `${quarterList.length} course${quarterList.length === 1 ? '' : 's'}`;
        if (quarterList.length === 0) {
            quarterContainer.innerHTML = '<span style="font-size:12px; color:var(--text-muted); font-style:italic;">No ¼ credit courses configured (all courses count 1.00x full credit by default).</span>';
        } else {
            quarterList.forEach(cItem => {
                const cStr = typeof cItem === 'string' ? cItem : `${cItem.subject} ${cItem.course_nbr}`;
                const tag = document.createElement('span');
                tag.className = 'badge';
                tag.style.background = '#f3e8ff';
                tag.style.color = '#6b21a8';
                tag.style.border = '1px solid #e9d5ff';
                tag.style.padding = '5px 10px';
                tag.style.fontSize = '12px';
                tag.style.display = 'inline-flex';
                tag.style.alignItems = 'center';
                tag.style.gap = '8px';
                const escapedStr = cStr.replace(/'/g, "\\'");
                tag.innerHTML = `<span><strong>${cStr}</strong></span><button type="button" onclick="removeQuarterCreditCourse('${escapedStr}')" style="background:none; border:none; color:#7e22ce; font-size:14px; font-weight:bold; cursor:pointer; padding:0 2px; line-height:1;" title="Remove ${cStr} (revert to full credit)">&times;</button>`;
                quarterContainer.appendChild(tag);
            });
        }
    }

    // 499 Toggle
    const chk499 = document.getElementById('adminExclude499sChk');
    if (chk499) {
        chk499.checked = Boolean(policy.exclude499s);
    }

    // Small Section Threshold
    const threshInput = document.getElementById('adminSub10ThreshInput');
    if (threshInput) {
        threshInput.value = policy.sub10Threshold || 10;
    }

    // Standard Section Target Cap
    const capInput = document.getElementById('adminStandardCapInput');
    if (capInput) {
        capInput.value = policy.standardSectionCap || 24;
    }
}

function toggleSubjectInclusion(sub, isIncluded) {
    const policy = window.workbenchState.policy;
    const current = new Set(policy.includedSubjects || []);
    if (isIncluded) {
        current.add(sub);
    } else {
        current.delete(sub);
    }
    policy.includedSubjects = Array.from(current);
    recomputeWorkbenchMetrics();
    renderAdminCurriculumControls();
}

function selectAllSubjects(selectAll) {
    const allSecs = window.workbenchState.rawSections || [];
    const allSubjectsSet = new Set();
    allSecs.forEach(s => { if (s.subject) allSubjectsSet.add(s.subject); });

    if (selectAll) {
        window.workbenchState.policy.includedSubjects = Array.from(allSubjectsSet);
    } else {
        window.workbenchState.policy.includedSubjects = [];
    }
    recomputeWorkbenchMetrics();
    renderAdminCurriculumControls();
}

function filterAdminSubjects() {
    renderAdminCurriculumControls();
}

function addCapstoneCourse() {
    const subjSelect = document.getElementById('adminNewCapstoneSubject');
    const input = document.getElementById('adminNewCapstoneInput');
    if (!subjSelect || !input) return;

    const subj = subjSelect.value.trim().toUpperCase();
    const num = input.value.trim().toUpperCase();

    if (!subj) {
        alert("Please select a Subject from the dropdown.");
        return;
    }
    if (!num) {
        alert("Please enter a Course Number (e.g. 480).");
        return;
    }

    const val = `${subj} ${num}`;
    const policy = window.workbenchState.policy;
    if (!policy.capstoneCourses) policy.capstoneCourses = [];

    const exists = policy.capstoneCourses.some(c => {
        const str = typeof c === 'string' ? c : `${c.subject} ${c.course_nbr}`;
        return str.trim().toUpperCase() === val;
    });

    if (!exists) {
        policy.capstoneCourses.push(val);
        input.value = '';
        recomputeWorkbenchMetrics();
        renderAdminCurriculumControls();
    } else {
        alert(`Capstone course "${val}" is already in the capstone list.`);
    }
}

function removeCapstoneCourse(val) {
    const policy = window.workbenchState.policy;
    if (!policy.capstoneCourses) return;
    const target = String(val).trim().toUpperCase();
    policy.capstoneCourses = policy.capstoneCourses.filter(c => {
        const str = typeof c === 'string' ? c : `${c.subject} ${c.course_nbr}`;
        return str.trim().toUpperCase() !== target;
    });
    recomputeWorkbenchMetrics();
    renderAdminCurriculumControls();
}

function addHalfCreditCourse() {
    const subjSelect = document.getElementById('adminNewHalfCreditSubject');
    const input = document.getElementById('adminNewHalfCreditInput');
    if (!subjSelect || !input) return;

    const subj = subjSelect.value.trim().toUpperCase();
    const num = input.value.trim().toUpperCase();

    if (!subj) {
        alert("Please select a Subject from the dropdown.");
        return;
    }
    if (!num) {
        alert("Please enter a Course Number (e.g. 101).");
        return;
    }

    const val = `${subj} ${num}`;
    const policy = window.workbenchState.policy;
    if (!policy.halfCreditCourses) policy.halfCreditCourses = [];
    if (!policy.quarterCreditCourses) policy.quarterCreditCourses = [];

    const exists = policy.halfCreditCourses.some(c => {
        const str = typeof c === 'string' ? c : `${c.subject} ${c.course_nbr}`;
        return str.trim().toUpperCase() === val;
    });

    if (exists) {
        alert(`Course "${val}" is already designated as a ½ credit course.`);
        return;
    }

    // If it was in quarter-credit, remove from quarter-credit
    policy.quarterCreditCourses = policy.quarterCreditCourses.filter(c => {
        const str = typeof c === 'string' ? c : `${c.subject} ${c.course_nbr}`;
        return str.trim().toUpperCase() !== val;
    });

    policy.halfCreditCourses.push(val);
    input.value = '';
    recomputeWorkbenchMetrics();
    renderAdminCurriculumControls();
}

function removeHalfCreditCourse(val) {
    const policy = window.workbenchState.policy;
    if (!policy.halfCreditCourses) return;
    const target = String(val).trim().toUpperCase();
    policy.halfCreditCourses = policy.halfCreditCourses.filter(c => {
        const str = typeof c === 'string' ? c : `${c.subject} ${c.course_nbr}`;
        return str.trim().toUpperCase() !== target;
    });
    recomputeWorkbenchMetrics();
    renderAdminCurriculumControls();
}

function addQuarterCreditCourse() {
    const subjSelect = document.getElementById('adminNewQuarterCreditSubject');
    const input = document.getElementById('adminNewQuarterCreditInput');
    if (!subjSelect || !input) return;

    const subj = subjSelect.value.trim().toUpperCase();
    const num = input.value.trim().toUpperCase();

    if (!subj) {
        alert("Please select a Subject from the dropdown.");
        return;
    }
    if (!num) {
        alert("Please enter a Course Number (e.g. 251A).");
        return;
    }

    const val = `${subj} ${num}`;
    const policy = window.workbenchState.policy;
    if (!policy.halfCreditCourses) policy.halfCreditCourses = [];
    if (!policy.quarterCreditCourses) policy.quarterCreditCourses = [];

    const exists = policy.quarterCreditCourses.some(c => {
        const str = typeof c === 'string' ? c : `${c.subject} ${c.course_nbr}`;
        return str.trim().toUpperCase() === val;
    });

    if (exists) {
        alert(`Course "${val}" is already designated as a ¼ credit course.`);
        return;
    }

    // If it was in half-credit, remove from half-credit
    policy.halfCreditCourses = policy.halfCreditCourses.filter(c => {
        const str = typeof c === 'string' ? c : `${c.subject} ${c.course_nbr}`;
        return str.trim().toUpperCase() !== val;
    });

    policy.quarterCreditCourses.push(val);
    input.value = '';
    recomputeWorkbenchMetrics();
    renderAdminCurriculumControls();
}

function removeQuarterCreditCourse(val) {
    const policy = window.workbenchState.policy;
    if (!policy.quarterCreditCourses) return;
    const target = String(val).trim().toUpperCase();
    policy.quarterCreditCourses = policy.quarterCreditCourses.filter(c => {
        const str = typeof c === 'string' ? c : `${c.subject} ${c.course_nbr}`;
        return str.trim().toUpperCase() !== target;
    });
    recomputeWorkbenchMetrics();
    renderAdminCurriculumControls();
}

function updateAdmin499Toggle(val) {
    window.workbenchState.policy.exclude499s = val;
    // Keep global toggle in sync
    if (typeof exclude499s !== 'undefined') {
        exclude499s = val;
        if (typeof updateToggleButtonsUI === 'function') updateToggleButtonsUI();
    }
    recomputeWorkbenchMetrics();
}

function updateAdminSub10Threshold(val) {
    const num = parseInt(val, 10);
    if (!isNaN(num) && num > 0) {
        window.workbenchState.policy.sub10Threshold = num;
        recomputeWorkbenchMetrics();
    }
}

function updateAdminStandardCap(val) {
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 10 && num <= 50) {
        window.workbenchState.policy.standardSectionCap = num;
        recomputeWorkbenchMetrics();
    }
}

/**
 * 2. Dynamic Faculty Tier Manager
 */
function renderAdminTierManager() {
    const tbody = document.getElementById('adminTiersTbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const tiers = window.workbenchState.policy.tiers || {};

    Object.entries(tiers).forEach(([key, tier]) => {
        const tr = document.createElement('tr');

        const teachPct = Number(tier.teaching_pct) || 0;
        const adminPct = Number(tier.admin_pct) || 0;
        const resPct = Number(tier.research_pct) || 0;
        const labPct = Number(tier.labops_pct) || 0;
        const totalPct = teachPct + adminPct + resPct + labPct;

        const is100 = (totalPct === 100);
        const totalBadge = is100
            ? `<span class="badge" style="background:#dcfce7; color:#15803d; font-size:12px;">100% ✓</span>`
            : `<span class="badge" style="background:#fee2e2; color:#b91c1c; font-size:12px;" title="Total FTE allocation should ideally sum to 100%">${totalPct}% ⚠️</span>`;

        const deleteBtn = tier.is_custom !== false
            ? `<button class="btn" style="padding:3px 8px; font-size:11px; color:#b91c1c; border-color:#fca5a5;" onclick="deleteCustomTier('${key}')" title="Delete custom tier">🗑️ Delete</button>`
            : `<span style="font-size:11px; color:#94a3b8;">Default</span>`;

        tr.innerHTML = `
            <td>
                <strong>${tier.name}</strong>
                <div style="font-size:10.5px; color:#64748b; font-family:monospace;">${key}</div>
            </td>
            <td>
                <input type="number" step="0.5" min="0" max="10" value="${tier.expected_sections}" 
                    style="width:70px; padding:4px 6px; font-size:12px; border:1px solid var(--border); border-radius:4px; text-align:right;"
                    onchange="updateTierProperty('${key}', 'expected_sections', this.value)">
            </td>
            <td>
                <input type="number" step="5" min="0" max="100" value="${teachPct}" 
                    style="width:65px; padding:4px 6px; font-size:12px; border:1px solid var(--border); border-radius:4px; text-align:right;"
                    onchange="updateTierProperty('${key}', 'teaching_pct', this.value)"> %
            </td>
            <td>
                <input type="number" step="5" min="0" max="100" value="${adminPct}" 
                    style="width:65px; padding:4px 6px; font-size:12px; border:1px solid var(--border); border-radius:4px; text-align:right;"
                    onchange="updateTierProperty('${key}', 'admin_pct', this.value)"> %
            </td>
            <td>
                <input type="number" step="5" min="0" max="100" value="${resPct}" 
                    style="width:65px; padding:4px 6px; font-size:12px; border:1px solid var(--border); border-radius:4px; text-align:right;"
                    onchange="updateTierProperty('${key}', 'research_pct', this.value)"> %
            </td>
            <td>
                <input type="number" step="5" min="0" max="100" value="${labPct}" 
                    style="width:65px; padding:4px 6px; font-size:12px; border:1px solid var(--border); border-radius:4px; text-align:right;"
                    onchange="updateTierProperty('${key}', 'labops_pct', this.value)"> %
            </td>
            <td style="text-align:center;">
                ${totalBadge}
            </td>
            <td style="text-align:center;">
                ${deleteBtn}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function updateTierProperty(tierKey, prop, value) {
    const tier = window.workbenchState.policy.tiers[tierKey];
    if (!tier) return;
    tier[prop] = Number(value);
    recomputeWorkbenchMetrics();
    renderAdminTierManager();
}

function openAddTierModal() {
    const modal = document.getElementById('adminAddTierModal');
    if (modal) modal.style.display = 'flex';
}

function closeAddTierModal() {
    const modal = document.getElementById('adminAddTierModal');
    if (modal) modal.style.display = 'none';
}

function submitNewCustomTier() {
    const name = document.getElementById('newTierName')?.value.trim();
    const expSec = parseFloat(document.getElementById('newTierExpSec')?.value || 3.0);
    const teachPct = parseFloat(document.getElementById('newTierTeachPct')?.value || 75);
    const adminPct = parseFloat(document.getElementById('newTierAdminPct')?.value || 10);
    const resPct = parseFloat(document.getElementById('newTierResPct')?.value || 10);
    const labPct = parseFloat(document.getElementById('newTierLabPct')?.value || 5);

    if (!name) {
        alert("Please enter a Tier Name.");
        return;
    }

    const tierKey = name.replace(/[^a-zA-Z0-9]/g, '_');
    if (window.workbenchState.policy.tiers[tierKey]) {
        alert(`A tier with key "${tierKey}" already exists.`);
        return;
    }

    window.workbenchState.policy.tiers[tierKey] = {
        name: name,
        expected_sections: expSec,
        teaching_pct: teachPct,
        admin_pct: adminPct,
        research_pct: resPct,
        labops_pct: labPct,
        is_custom: true
    };

    closeAddTierModal();
    recomputeWorkbenchMetrics();
    renderAdminTierManager();
    alert(`Custom Tier "${name}" created successfully and is now available across all department rosters!`);
}

function deleteCustomTier(tierKey) {
    if (!confirm(`Are you sure you want to delete tier "${tierKey}"? Faculty currently assigned to this tier will fall back to Line Faculty.`)) {
        return;
    }

    delete window.workbenchState.policy.tiers[tierKey];

    // Reassign any faculty holding this tier in all department rosters
    Object.values(window.workbenchState.departmentRosters).forEach(roster => {
        roster.forEach(f => {
            if (f.tier_key === tierKey) {
                f.tier_key = 'Line_Faculty';
            }
        });
    });

    recomputeWorkbenchMetrics();
    renderAdminTierManager();
}

/**
 * 3. Policy Reset
 */
function resetPolicyToDefaults() {
    if (!confirm("Are you sure you want to reset all curriculum rules and tiers to institutional defaults?")) return;

    const allSecs = window.workbenchState.rawSections || [];
    const allSubjectsSet = new Set();
    allSecs.forEach(s => { if (s.subject) allSubjectsSet.add(s.subject); });

    window.workbenchState.policy = {
        includedSubjects: Array.from(allSubjectsSet),
        capstoneCourses: [
            'AEROENGR 480', 'AEROENGR 481', 'BEHSCI 498', 'CIVENGR 451', 'COMPSCI 453',
            'CYBERSCI 438', 'DATASCI 421', 'ECE 463', 'ENGLISH 489', 'GEO 497',
            'LDRSHP 400', 'LDRSHP 400X', 'MATH 420', 'MECHENGR 491', 'MGT 472', 'OPSRSCH 421',
            'PHYSICS 490', 'POLSCI 491', 'SYSENGR 491'
        ],
        halfCreditCourses: [
            'COMMSTRT 101', 'COMMSTRT 101X',
            'LDRSHP 100', 'LDRSHP 100X', 'LDRSHP 400', 'LDRSHP 400X'
        ],
        quarterCreditCourses: [
            'LDRSHP 300A', 'LDRSHP 300B', 'LDRSHP 300C', 'LDRSHP 300D',
            'SPACE 251A', 'SPACE 251C', 'SPACE 252B', 'SPACE 252D', 'SPACE 350', 'SPACE 472A', 'SPACE 472B'
        ],
        excludeCapstones: true,
        exclude499s: true,
        sub10Threshold: 10,
        standardSectionCap: 24,
        tiers: {
            'Line_Faculty': { name: 'Line Faculty', expected_sections: 3.0, teaching_pct: 75, admin_pct: 10, research_pct: 10, labops_pct: 5, is_custom: false },
            'Course_Director': { name: 'CDs / 306 FTG Flyers', expected_sections: 2.0, teaching_pct: 50, admin_pct: 35, research_pct: 10, labops_pct: 5, is_custom: false },
            'Dept_Head': { name: 'Dept Head / Lab Dir', expected_sections: 1.0, teaching_pct: 25, admin_pct: 60, research_pct: 10, labops_pct: 5, is_custom: false },
            'Adjunct_Chair': { name: 'Adjunct / Chair', expected_sections: 0.5, teaching_pct: 15, admin_pct: 70, research_pct: 10, labops_pct: 5, is_custom: false },
            'MOA_Courtesy': { name: 'MOA / Courtesy', expected_sections: 0.0, teaching_pct: 0, admin_pct: 80, research_pct: 15, labops_pct: 5, is_custom: false },
            'Lab_Staff': { name: 'Lab Staff', expected_sections: 0.0, teaching_pct: 0, admin_pct: 0, research_pct: 0, labops_pct: 100, is_custom: false }
        }
    };

    recomputeWorkbenchMetrics();
    renderAdminPolicyTab();
    alert("Policy settings reset to defaults.");
}
