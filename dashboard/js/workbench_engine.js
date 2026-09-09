/**
 * USAFA Academic Workload Workbench — Reactive Engine
 * -----------------------------------------------------
 * Powers real-time in-browser recalculation, transparent policy rules,
 * dynamic faculty tier definitions, non-fungible military/civilian billet tracking,
 * and department roster import/export.
 */

window.workbenchState = {
    rawSections: [],          // Normalized course sections from JSON
    majors: {},               // Declared majors & pipeline counts
    advising: {},             // Advisor advisee loads
    schools: [],              // School metadata
    departments: [],          // Department metadata
    policy: {                 // Active institutional policy rules
        includedSubjects: [],
        capstoneCourses: [
            'AEROENGR 480', 'AEROENGR 481', 'BEHSCI 498', 'CIVENGR 451', 'COMPSCI 453',
            'CYBERSCI 438', 'DATASCI 421', 'ECE 463', 'ENGLISH 489', 'GEO 497',
            'LDRSHP 400', 'MATH 420', 'MECHENGR 491', 'MGT 472', 'OPSRSCH 421',
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
        tiers: {
            'Line_Faculty': { name: 'Line Faculty', expected_sections: 3.0, teaching_pct: 75, admin_pct: 10, research_pct: 10, labops_pct: 5, is_custom: false },
            'Course_Director': { name: 'Course Director', expected_sections: 2.0, teaching_pct: 50, admin_pct: 35, research_pct: 10, labops_pct: 5, is_custom: false },
            'Dept_Head': { name: 'Dept Head / Lab Dir', expected_sections: 1.0, teaching_pct: 25, admin_pct: 60, research_pct: 10, labops_pct: 5, is_custom: false },
            'Division_Chief': { name: 'Division Chief', expected_sections: 1.0, teaching_pct: 25, admin_pct: 60, research_pct: 10, labops_pct: 5, is_custom: false },
            'Adjunct_Chair': { name: 'Adjunct / Chair', expected_sections: 0.5, teaching_pct: 15, admin_pct: 70, research_pct: 10, labops_pct: 5, is_custom: false },
            'MOA_Courtesy': { name: 'MOA / Courtesy', expected_sections: 0.0, teaching_pct: 0, admin_pct: 80, research_pct: 15, labops_pct: 5, is_custom: false },
            'Lab_Staff': { name: 'Lab Staff', expected_sections: 0.0, teaching_pct: 0, admin_pct: 0, research_pct: 0, labops_pct: 100, is_custom: false }
        }
    },
    departmentRosters: {},    // dept_code -> Array of faculty/billet objects
    activeCalculatedData: null
};

/**
 * Initialize workbench state from ingested academic dataset
 */
function initWorkbenchState(data) {
    if (!data) return;

    window.workbenchState.rawSections = data.sections_audit || data.sections || [];
    window.workbenchState.schools = JSON.parse(JSON.stringify(data.schools || []));
    window.workbenchState.departments = JSON.parse(JSON.stringify(data.departments || []));

    // Initialize subjects
    const allSubjects = new Set();
    window.workbenchState.rawSections.forEach(s => {
        if (s.subject) allSubjects.add(s.subject);
    });

    // Default policy setup
    if (data.default_policy) {
        const dp = data.default_policy;
        window.workbenchState.policy.includedSubjects = dp.included_subjects || Array.from(allSubjects);
        if (dp.capstone_courses && Array.isArray(dp.capstone_courses)) {
            const hasPairs = dp.capstone_courses.some(c => typeof c === 'string' && c.includes(' '));
            if (hasPairs) {
                window.workbenchState.policy.capstoneCourses = dp.capstone_courses;
            } else if (dp.capstone_pairs && dp.capstone_pairs.length > 0) {
                window.workbenchState.policy.capstoneCourses = dp.capstone_pairs.map(p => `${p.subject} ${p.course_nbr}`.trim());
            } else {
                window.workbenchState.policy.capstoneCourses = dp.capstone_courses;
            }
        }
        if (dp.half_credit_courses && Array.isArray(dp.half_credit_courses)) {
            window.workbenchState.policy.halfCreditCourses = dp.half_credit_courses;
        }
        if (dp.quarter_credit_courses && Array.isArray(dp.quarter_credit_courses)) {
            window.workbenchState.policy.quarterCreditCourses = dp.quarter_credit_courses;
        }
        if (dp.sub10_threshold) window.workbenchState.policy.sub10Threshold = dp.sub10_threshold;
        if (dp.tiers) {
            window.workbenchState.policy.tiers = JSON.parse(JSON.stringify(dp.tiers));
        }
    } else if (window.workbenchState.policy.includedSubjects.length === 0) {
        window.workbenchState.policy.includedSubjects = Array.from(allSubjects);
    }

    // Initialize department rosters from incoming faculty directory
    const initialFac = data.faculty_directory || [];
    const deptMap = {};
    window.workbenchState.departments.forEach(d => {
        deptMap[d.dept_code] = [];
    });

    initialFac.forEach(f => {
        const dCode = f.primary_dept || 'OTHER';
        if (!deptMap[dCode]) deptMap[dCode] = [];

        // Parse orthogonal billet attributes: Billet Type vs Occupancy
        const rawBillet = String(f.billet_status || 'Filled (Military)');
        let bType = 'Military';
        let bOccupancy = 'Filled';

        if (rawBillet.toLowerCase().includes('civ')) {
            bType = 'Civilian';
        } else if (rawBillet.toLowerCase().includes('moa') || rawBillet.toLowerCase().includes('courtesy') || rawBillet.toLowerCase().includes('adjunct')) {
            bType = 'MOA_Adjunct';
        } else {
            bType = 'Military';
        }

        if (rawBillet.toLowerCase().includes('vacant')) {
            bOccupancy = 'Vacant';
        } else {
            bOccupancy = 'Filled';
        }

        // Map tier key
        const tStr = String(f.expected_tier || 'Line_Faculty').toLowerCase();
        let tierKey = 'Line_Faculty';
        if (tStr.includes('lab') && tStr.includes('staff')) tierKey = 'Lab_Staff';
        else if (tStr.includes('dir') || tStr.includes('course')) tierKey = 'Course_Director';
        else if (tStr.includes('head') || tStr.includes('dh')) tierKey = 'Dept_Head';
        else if (tStr.includes('div') || tStr.includes('chief')) tierKey = 'Division_Chief';
        else if (tStr.includes('adjunct') || tStr.includes('chair')) tierKey = 'Adjunct_Chair';
        else if (tStr.includes('moa') || tStr.includes('courtesy')) tierKey = 'MOA_Courtesy';
        else if (tStr.includes('lab') && !tStr.includes('head') && !tStr.includes('dir')) tierKey = 'Lab_Staff';

        const tierInfo = window.workbenchState.policy.tiers[tierKey] || window.workbenchState.policy.tiers['Line_Faculty'];

        deptMap[dCode].push({
            instructor: f.instructor,
            primary_dept: dCode,
            school_code: f.school_code || 'OTHER',
            billet_type: bType,
            occupancy_status: bOccupancy,
            tier_key: tierKey,
            expected_sections: f.expected_sections !== undefined ? f.expected_sections : tierInfo.expected_sections,
            teaching_pct: f.teaching_pct !== undefined ? f.teaching_pct : tierInfo.teaching_pct,
            admin_pct: f.admin_pct !== undefined ? f.admin_pct : tierInfo.admin_pct,
            research_pct: f.research_pct !== undefined ? f.research_pct : tierInfo.research_pct,
            labops_pct: f.labops_pct !== undefined ? f.labops_pct : tierInfo.labops_pct,
            advisees_count: f.advisees_count !== undefined ? f.advisees_count : 0,
            notes: f.notes || '',
            is_manual: false
        });
    });

    window.workbenchState.departmentRosters = deptMap;

    // Run first calculation pass
    recomputeWorkbenchMetrics();
}

/**
 * Recomputes all school, department, faculty, and institutional metrics live
 */
function recomputeWorkbenchMetrics() {
    const st = window.workbenchState;
    const policy = st.policy;

    const exCap = Boolean(policy.excludeCapstones);
    const ex499 = Boolean(policy.exclude499s);
    const sub10Thresh = Number(policy.sub10Threshold) || 10;
    const includedSubjs = new Set(policy.includedSubjects || []);
    const capCoursesSet = new Set();
    (policy.capstoneCourses || []).forEach(item => {
        if (typeof item === 'string') {
            capCoursesSet.add(item.trim().toUpperCase());
        } else if (item && item.subject && item.course_nbr) {
            capCoursesSet.add(`${item.subject} ${item.course_nbr}`.trim().toUpperCase());
        }
    });

    const halfCreditSet = new Set();
    (policy.halfCreditCourses || []).forEach(item => {
        if (typeof item === 'string') halfCreditSet.add(item.trim().toUpperCase());
        else if (item && item.subject && item.course_nbr) halfCreditSet.add(`${item.subject} ${item.course_nbr}`.trim().toUpperCase());
    });

    const quarterCreditSet = new Set();
    (policy.quarterCreditCourses || []).forEach(item => {
        if (typeof item === 'string') quarterCreditSet.add(item.trim().toUpperCase());
        else if (item && item.subject && item.course_nbr) quarterCreditSet.add(`${item.subject} ${item.course_nbr}`.trim().toUpperCase());
    });

    // 1. Filter active sections and annotate all audited sections (without mutating rawSections)
    const allSecs = st.rawSections || [];
    const auditedSecs = [];
    const activeSecs = [];

    allSecs.forEach(rawSec => {
        // Subject inclusion
        const isSubjInc = !rawSec.subject || includedSubjs.has(rawSec.subject);

        // Capstone check: match by Subject + Course Number
        const courseKey = `${rawSec.subject || ''} ${rawSec.course_nbr || ''}`.trim().toUpperCase();
        const isCap = capCoursesSet.has(courseKey);

        // 499 check
        const is499 = String(rawSec.course_nbr) === '499';

        // Credit Weight evaluation (1/2 credit, 1/4 credit, 499, or full credit)
        let secWeight = 1.0;
        let cadetWeight = 1.0;
        let creditType = 'Full Credit';

        if (is499) {
            secWeight = 0.0;
            cadetWeight = 1.0;
            creditType = 'Independent Study';
        } else if (halfCreditSet.has(courseKey)) {
            secWeight = 0.50;
            cadetWeight = 0.50;
            creditType = 'Half Credit';
        } else if (quarterCreditSet.has(courseKey)) {
            secWeight = 0.25;
            cadetWeight = 0.25;
            creditType = 'Quarter Credit';
        }

        // Sub-10 evaluation based on active threshold
        const cCount = rawSec.cadets !== undefined ? rawSec.cadets : (rawSec.cadet_count !== undefined ? rawSec.cadet_count : 0);
        const isSub10 = (cCount <= sub10Thresh);

        const secObj = {
            ...rawSec,
            is_subject_included: isSubjInc,
            is_capstone: isCap,
            is_499: is499,
            is_sub10: isSub10,
            section_weight: secWeight,
            cadet_weight: cadetWeight,
            credit_multiplier: secWeight,
            credit_type: creditType
        };

        auditedSecs.push(secObj);

        // Active sections filter
        if (!isSubjInc) return;
        if (exCap && isCap) return;
        if (ex499 && is499) return;

        activeSecs.push(secObj);
    });

    // 2. Instructor attribution map
    const instSecMap = {};
    activeSecs.forEach(s => {
        const insts = s.instructors || [];
        insts.forEach(instName => {
            if (!instSecMap[instName]) instSecMap[instName] = [];
            instSecMap[instName].push(s);
        });
    });

    // 3. Consolidated Faculty List & Tier Calibrations
    const consolidatedFaculty = [];
    const deptFacultyMap = {};

    Object.entries(st.departmentRosters || {}).forEach(([deptCode, roster]) => {
        deptFacultyMap[deptCode] = [];

        roster.forEach((fac, fIdx) => {
            const mySecs = instSecMap[fac.instructor] || [];
            const nSecs = mySecs.length;

            let weightedSecs = 0.0;
            let cadetAlloc = 0;
            let totalSeats = 0;
            const coursesSet = new Set();
            const assignments = [];

            mySecs.forEach(s => {
                const coCount = Math.max(1, (s.instructors || []).length);
                const secWeight = s.section_weight !== undefined ? s.section_weight : 1.0;
                const cadetWeight = s.cadet_weight !== undefined ? s.cadet_weight : 1.0;

                const w = Math.round((secWeight / coCount) * 100) / 100;
                const cCount = s.cadets !== undefined ? s.cadets : (s.cadet_count !== undefined ? s.cadet_count : 0);
                const allocCadets = Math.round(((cCount * cadetWeight) / coCount) * 10) / 10;
                const weightedSeat = Math.round((cCount * cadetWeight) * 10) / 10;

                weightedSecs += w;
                cadetAlloc += allocCadets;
                totalSeats += weightedSeat;

                const cName = `${s.subject || ''} ${s.course_nbr || ''}`.trim();
                if (cName) coursesSet.add(cName);

                let weightLabel = coCount > 1
                    ? (s.credit_type && s.credit_type !== 'Full Credit' ? `${s.credit_type}, Co-Taught` : 'Co-Taught')
                    : (s.credit_type || 'Solo');

                assignments.push({
                    course: cName,
                    title: s.title || '',
                    section: s.section || '',
                    term: s.term || '',
                    cadets: cCount,
                    cadet_contact: allocCadets,
                    sec_weight: w,
                    weight_type: weightLabel,
                    credit_type: s.credit_type || 'Full Credit',
                    co_instructors: (s.instructors || []).filter(i => i !== fac.instructor)
                });
            });

            weightedSecs = Math.round(weightedSecs * 100) / 100;
            cadetAlloc = Math.round(cadetAlloc * 10) / 10;
            const avgSize = nSecs > 0 ? Math.round((totalSeats / nSecs) * 10) / 10 : 0;

            // Tier expectations & delta
            const tier = policy.tiers[fac.tier_key] || policy.tiers['Line_Faculty'] || { expected_sections: 3.0, teaching_pct: 75, admin_pct: 10, research_pct: 10, labops_pct: 5 };
            const expSec = fac.expected_sections !== undefined ? Number(fac.expected_sections) : tier.expected_sections;
            const delta = Math.round((weightedSecs - expSec) * 100) / 100;

            // Non-teaching section equivalents using dual rule
            const tPct = Number(fac.teaching_pct !== undefined ? fac.teaching_pct : tier.teaching_pct) || 0;
            const aPct = Number(fac.admin_pct !== undefined ? fac.admin_pct : tier.admin_pct) || 0;
            const rPct = Number(fac.research_pct !== undefined ? fac.research_pct : tier.research_pct) || 0;
            const lPct = Number(fac.labops_pct !== undefined ? fac.labops_pct : tier.labops_pct) || 0;

            let adminSec = 0, resSec = 0, labSec = 0;
            if (weightedSecs > 0 && tPct > 0) {
                const impliedTotalRatio = weightedSecs / (tPct / 100.0);
                adminSec = impliedTotalRatio * (aPct / 100.0);
                resSec = impliedTotalRatio * (rPct / 100.0);
                labSec = impliedTotalRatio * (lPct / 100.0);
            } else {
                // Baseline fallback: 25% FTE = 1.0 section
                adminSec = aPct / 25.0;
                resSec = rPct / 25.0;
                labSec = lPct / 25.0;
            }

            const grossBurden = weightedSecs + adminSec + resSec + labSec;

            const computedFac = {
                ...fac,
                f_idx: fIdx,
                expected_tier: tier.name || fac.tier_key,
                expected_sections: expSec,
                weighted_sections: weightedSecs,
                cadet_load_allocated: cadetAlloc,
                total_cadet_seats: totalSeats,
                avg_section_size: avgSize,
                courses_taught: Array.from(coursesSet),
                course_assignments: assignments,
                section_delta: delta,
                section_equivalents: {
                    admin: Math.round(adminSec * 10) / 10,
                    research: Math.round(resSec * 10) / 10,
                    labops: Math.round(labSec * 10) / 10,
                    gross_burden: Math.round(grossBurden * 10) / 10
                }
            };

            deptFacultyMap[deptCode].push(computedFac);
            consolidatedFaculty.push(computedFac);
        });
    });

    // 4. Department Calculations
    const computedDepartments = (st.departments || []).map(dept => {
        const subjs = dept.subjects_included || [];
        const deptSecs = activeSecs.filter(s =>
            s.department === dept.dept_code ||
            (dept.dept_code === 'ESECE' && s.department === 'ESEC') ||
            (subjs && subjs.includes(s.subject))
        );

        const dSections = Math.round(deptSecs.reduce((acc, s) => acc + (s.section_weight !== undefined ? s.section_weight : 1.0), 0) * 10) / 10;
        const dSeats = Math.round(deptSecs.reduce((acc, s) => acc + ((s.cadets !== undefined ? s.cadets : (s.cadet_count !== undefined ? s.cadet_count : 0)) * (s.cadet_weight !== undefined ? s.cadet_weight : 1.0)), 0) * 10) / 10;
        const dSCH = Math.round(deptSecs.reduce((acc, s) => {
            const cadets = (s.cadets !== undefined ? s.cadets : (s.cadet_count !== undefined ? s.cadet_count : 0)) * (s.cadet_weight !== undefined ? s.cadet_weight : 1.0);
            const credits = s.credits !== undefined ? s.credits : (s.credit_units !== undefined ? s.credit_units : 3.0);
            return acc + (cadets * credits);
        }, 0) * 10) / 10;
        const dCourses = new Set(deptSecs.map(s => `${s.subject} ${s.course_nbr}`)).size;
        const dSub10 = deptSecs.filter(s => s.is_sub10).length;
        const dSub10Pct = deptSecs.length > 0 ? Math.round((dSub10 / deptSecs.length) * 1000) / 10 : 0;

        // Size dist
        const dist = {'<=10': 0, '11-15': 0, '16-20': 0, '21-25': 0, '26+': 0};
        deptSecs.forEach(s => {
            const sz = s.cadets !== undefined ? s.cadets : (s.cadet_count !== undefined ? s.cadet_count : 0);
            if (sz <= 10) dist['<=10']++;
            else if (sz <= 15) dist['11-15']++;
            else if (sz <= 20) dist['16-20']++;
            else if (sz <= 25) dist['21-25']++;
            else dist['26+']++;
        });

        // Course levels
        const lvls = {'100': 0, '200': 0, '300': 0, '400': 0, 'Other': 0};
        deptSecs.forEach(s => {
            const nbr = String(s.course_nbr || '').replace(/\D/g, '');
            if (nbr.startsWith('1')) lvls['100']++;
            else if (nbr.startsWith('2')) lvls['200']++;
            else if (nbr.startsWith('3')) lvls['300']++;
            else if (nbr.startsWith('4')) lvls['400']++;
            else lvls['Other']++;
        });

        // Faculty & Orthogonal Billet Health
        const deptFac = deptFacultyMap[dept.dept_code] || [];
        const teachingFac = deptFac.filter(f => f.weighted_sections > 0);

        let milFilled = 0, milVacant = 0;
        let civFilled = 0, civVacant = 0;
        let moaCount = 0;

        deptFac.forEach(f => {
            const bType = f.billet_type || 'Military';
            const occ = f.occupancy_status || 'Filled';

            if (bType === 'Military') {
                if (occ === 'Vacant') milVacant++;
                else milFilled++;
            } else if (bType === 'Civilian') {
                if (occ === 'Vacant') civVacant++;
                else civFilled++;
            } else {
                moaCount++;
            }
        });

        const milAuth = milFilled + milVacant;
        const civAuth = civFilled + civVacant;
        const totalAuth = milAuth + civAuth;
        const totalVacant = milVacant + civVacant;
        const milVacRate = milAuth > 0 ? Math.round((milVacant / milAuth) * 1000) / 10 : 0.0;
        const civVacRate = civAuth > 0 ? Math.round((civVacant / civAuth) * 1000) / 10 : 0.0;
        const totalVacRate = totalAuth > 0 ? Math.round((totalVacant / totalAuth) * 1000) / 10 : 0.0;

        // Teaching load means
        const totWeighted = teachingFac.reduce((acc, f) => acc + f.weighted_sections, 0);
        const totCadets = teachingFac.reduce((acc, f) => acc + f.cadet_load_allocated, 0);
        const secPerInst = teachingFac.length > 0 ? Math.round((totWeighted / teachingFac.length) * 100) / 100 : 0;
        const stuPerInst = teachingFac.length > 0 ? Math.round((totCadets / teachingFac.length) * 100) / 100 : 0;

        // Total billet means
        const allFilledBillets = deptFac.filter(f => f.occupancy_status !== 'Vacant');
        const secPerAllInst = allFilledBillets.length > 0 ? Math.round((totWeighted / allFilledBillets.length) * 100) / 100 : 0;
        const stuPerAllInst = allFilledBillets.length > 0 ? Math.round((totCadets / allFilledBillets.length) * 100) / 100 : 0;

        // Non-teaching totals
        const totAdminSec = deptFac.reduce((acc, f) => acc + (f.section_equivalents ? f.section_equivalents.admin : 0), 0);
        const totResSec = deptFac.reduce((acc, f) => acc + (f.section_equivalents ? f.section_equivalents.research : 0), 0);
        const totLabSec = deptFac.reduce((acc, f) => acc + (f.section_equivalents ? f.section_equivalents.labops : 0), 0);
        const totGrossSec = dSections + totAdminSec + totResSec + totLabSec;

        return {
            ...dept,
            total_sections: dSections,
            total_courses: dCourses,
            total_cadet_seats: dSeats,
            total_sch: dSCH,
            sub10_sections_count: dSub10,
            sub10_percentage: dSub10Pct,
            section_size_distribution: dist,
            course_levels: lvls,
            faculty_count: teachingFac.length > 0 ? teachingFac.length : deptFac.length,
            teaching_faculty_count: teachingFac.length,
            all_billets_count: totalAuth,
            sections_per_inst_mean: secPerInst,
            students_per_inst_mean: stuPerInst,
            sections_per_all_inst_mean: secPerAllInst,
            students_per_all_inst_mean: stuPerAllInst,
            billet_summary: {
                authorized: totalAuth,
                vacant: totalVacant,
                vacancy_rate: totalVacRate,
                military_authorized: milAuth,
                filled_military: milFilled,
                military_vacant: milVacant,
                military_vacancy_rate: milVacRate,
                civilian_authorized: civAuth,
                filled_civilian: civFilled,
                civilian_vacant: civVacant,
                civilian_vacancy_rate: civVacRate,
                moa_adjunct: moaCount
            },
            raw_sections_count: deptSecs.length,
            non_teaching_workload: {
                admin_sections: Math.round(totAdminSec * 10) / 10,
                research_sections: Math.round(totResSec * 10) / 10,
                labops_sections: Math.round(totLabSec * 10) / 10,
                gross_burden_sections: Math.round(totGrossSec * 10) / 10,
                is_calibrated: true
            }
        };
    });

    // 5. School Calculations
    const computedSchools = (st.schools || []).map(sch => {
        const schDepts = computedDepartments.filter(d => (d.school_code || 'OTHER') === sch.school_code);
        const schSecs = Math.round(schDepts.reduce((acc, d) => acc + d.total_sections, 0) * 10) / 10;
        const schSeats = Math.round(schDepts.reduce((acc, d) => acc + d.total_cadet_seats, 0) * 10) / 10;
        const schSCH = Math.round(schDepts.reduce((acc, d) => acc + d.total_sch, 0) * 10) / 10;
        const schSub10 = schDepts.reduce((acc, d) => acc + d.sub10_sections_count, 0);
        const schRawSecs = schDepts.reduce((acc, d) => acc + (d.raw_sections_count || d.total_sections), 0);
        const schSub10Pct = schRawSecs > 0 ? Math.round((schSub10 / schRawSecs) * 1000) / 10 : 0;
        const schFac = schDepts.reduce((acc, d) => acc + (d.teaching_faculty_count || 0), 0);
        const schAuth = schDepts.reduce((acc, d) => acc + ((d.billet_summary && d.billet_summary.authorized) || 0), 0);

        const schWeighted = schDepts.reduce((acc, d) => acc + ((d.sections_per_inst_mean || 0) * (d.teaching_faculty_count || 0)), 0);
        const schCadets = schDepts.reduce((acc, d) => acc + ((d.students_per_inst_mean || 0) * (d.teaching_faculty_count || 0)), 0);
        const secPerInst = schFac > 0 ? Math.round((schWeighted / schFac) * 100) / 100 : 0;
        const stuPerInst = schFac > 0 ? Math.round((schCadets / schFac) * 100) / 100 : 0;

        const schDist = {'<=10': 0, '11-15': 0, '16-20': 0, '21-25': 0, '26+': 0};
        schDepts.forEach(d => {
            if (d.section_size_distribution) {
                for (const k of Object.keys(schDist)) {
                    schDist[k] += (d.section_size_distribution[k] || 0);
                }
            }
        });

        return {
            ...sch,
            total_sections: schSecs,
            total_cadet_seats: schSeats,
            total_sch: schSCH,
            sub10_sections_count: schSub10,
            sub10_percentage: schSub10Pct,
            section_size_distribution: schDist,
            faculty_count: schFac,
            teaching_faculty_count: schFac,
            all_billets_count: schAuth,
            sections_per_inst_mean: secPerInst,
            students_per_inst_mean: stuPerInst
        };
    });

    // 6. Institutional KPIs
    const instTotSecs = Math.round(activeSecs.reduce((acc, s) => acc + (s.section_weight !== undefined ? s.section_weight : 1.0), 0) * 10) / 10;
    const instTotSeats = Math.round(activeSecs.reduce((acc, s) => acc + ((s.cadets !== undefined ? s.cadets : (s.cadet_count !== undefined ? s.cadet_count : 0)) * (s.cadet_weight !== undefined ? s.cadet_weight : 1.0)), 0) * 10) / 10;
    const instTotSCH = Math.round(activeSecs.reduce((acc, s) => {
        const cadets = (s.cadets !== undefined ? s.cadets : (s.cadet_count !== undefined ? s.cadet_count : 0)) * (s.cadet_weight !== undefined ? s.cadet_weight : 1.0);
        const credits = s.credits !== undefined ? s.credits : (s.credit_units !== undefined ? s.credit_units : 3.0);
        return acc + (cadets * credits);
    }, 0) * 10) / 10;
    const instAvgSize = activeSecs.length > 0 ? Math.round((instTotSeats / activeSecs.length) * 100) / 100 : 0;
    const instSub10 = activeSecs.filter(s => s.is_sub10).length;
    const instSub10Pct = activeSecs.length > 0 ? Math.round((instSub10 / activeSecs.length) * 1000) / 10 : 0;
    const teachingFacultyTotal = consolidatedFaculty.filter(f => f.weighted_sections > 0).length;
    const allBilletsTotal = consolidatedFaculty.length;

    const instKPIs = {
        total_sections: instTotSecs,
        total_cadet_seats: instTotSeats,
        total_sch: instTotSCH,
        overall_avg_section_size: instAvgSize,
        overall_sub10_count: instSub10,
        overall_sub10_pct: instSub10Pct,
        unique_faculty_count: teachingFacultyTotal,
        teaching_faculty_count: teachingFacultyTotal,
        all_billets_count: allBilletsTotal
    };

    // Cache active state
    st.activeCalculatedData = {
        institution_kpis: instKPIs,
        school_kpis: instKPIs,
        schools: computedSchools,
        departments: computedDepartments,
        faculty_directory: consolidatedFaculty,
        sections_audit: auditedSecs,
        active_sections: activeSecs
    };

    // Refresh UI
    if (typeof refreshAllViews === 'function') {
        refreshAllViews();
    }
}

/**
 * Exports current policy configuration as a JSON file
 */
function exportPolicyConfigJSON() {
    const policy = window.workbenchState.policy;
    const payload = {
        schema: 'usafa_workload_policy_v1',
        exported_at: new Date().toISOString(),
        policy: policy
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workload_policy_config_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * Imports policy configuration JSON file
 */
function importPolicyConfigJSON(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            const p = data.policy || data;
            if (p.tiers && p.includedSubjects) {
                window.workbenchState.policy = JSON.parse(JSON.stringify(p));
                recomputeWorkbenchMetrics();
                renderAdminPolicyTab();
                alert("Policy configuration loaded and applied successfully!");
            } else {
                alert("Invalid policy JSON format.");
            }
        } catch (err) {
            alert(`Error reading policy JSON: ${err.message}`);
        }
    };
    reader.readAsText(file);
}

/**
 * Exports full calibrated session state JSON (data + policy + department calibrations)
 */
function exportFullSessionStateJSON() {
    const st = window.workbenchState;
    const payload = {
        schema: 'usafa_workload_session_full_v1',
        saved_at: new Date().toISOString(),
        meta: {
            description: "Complete calibrated academic workload session state"
        },
        policy: st.policy,
        departmentRosters: st.departmentRosters,
        rawSections: st.rawSections,
        schools: st.schools,
        departments: st.departments
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `usafa_workload_calibrated_session_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
}
