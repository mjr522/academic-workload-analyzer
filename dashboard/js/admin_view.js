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

    // Capstone Catalog Numbers Tag Manager
    const capContainer = document.getElementById('adminCapstonesList');
    if (capContainer) {
        capContainer.innerHTML = '';
        const caps = policy.capstoneCourses || [];
        caps.forEach(capNbr => {
            const tag = document.createElement('span');
            tag.className = 'badge badge-capstone';
            tag.style.padding = '6px 12px';
            tag.style.fontSize = '12px';
            tag.style.display = 'inline-flex';
            tag.style.alignItems = 'center';
            tag.style.gap = '8px';
            tag.innerHTML = `<span><strong>${capNbr}</strong></span><button type="button" onclick="removeCapstoneCourse('${capNbr}')" style="background:none; border:none; color:#6b21a8; font-size:14px; font-weight:bold; cursor:pointer; padding:0 2px;">&times;</button>`;
            capContainer.appendChild(tag);
        });
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
    const input = document.getElementById('adminNewCapstoneInput');
    if (!input) return;
    const val = input.value.trim().toUpperCase().replace(/\D/g, '');
    if (!val) return;

    const policy = window.workbenchState.policy;
    if (!policy.capstoneCourses) policy.capstoneCourses = [];
    if (!policy.capstoneCourses.includes(val)) {
        policy.capstoneCourses.push(val);
        input.value = '';
        recomputeWorkbenchMetrics();
        renderAdminCurriculumControls();
    } else {
        alert(`Course number ${val} is already in the capstone list.`);
    }
}

function removeCapstoneCourse(val) {
    const policy = window.workbenchState.policy;
    if (!policy.capstoneCourses) return;
    policy.capstoneCourses = policy.capstoneCourses.filter(c => String(c) !== String(val));
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
        capstoneCourses: ['480', '481', '491', '492', '463', '464', '451', '452'],
        excludeCapstones: true,
        exclude499s: true,
        sub10Threshold: 10,
        tiers: {
            'Line_Faculty': { name: 'Line Faculty', expected_sections: 3.0, teaching_pct: 75, admin_pct: 10, research_pct: 10, labops_pct: 5, is_custom: false },
            'Course_Director': { name: 'Course Director', expected_sections: 2.0, teaching_pct: 50, admin_pct: 35, research_pct: 10, labops_pct: 5, is_custom: false },
            'Dept_Head': { name: 'Dept Head / Lab Dir', expected_sections: 1.0, teaching_pct: 25, admin_pct: 60, research_pct: 10, labops_pct: 5, is_custom: false },
            'Division_Chief': { name: 'Division Chief', expected_sections: 1.0, teaching_pct: 25, admin_pct: 60, research_pct: 10, labops_pct: 5, is_custom: false },
            'Adjunct_Chair': { name: 'Adjunct / Chair', expected_sections: 0.5, teaching_pct: 15, admin_pct: 70, research_pct: 10, labops_pct: 5, is_custom: false },
            'MOA_Courtesy': { name: 'MOA / Courtesy', expected_sections: 0.0, teaching_pct: 0, admin_pct: 80, research_pct: 15, labops_pct: 5, is_custom: false }
        }
    };

    recomputeWorkbenchMetrics();
    renderAdminPolicyTab();
    alert("Policy settings reset to defaults.");
}
