/**
 * Visual Analytics & Chart.js Controllers
 * Supports both School-Level (USAFA Academic Division) and Department-Level Visualizations
 */

let quadrantChartInstance = null;
let rankingChartInstance = null;
let pipelineChartInstance = null;
let facultyPieChartInstance = null;
let majorsPieChartInstance = null;
let sub10BarChartInstance = null;
let courseLevelChartInstance = null;
let deptSizeDistChartInstance = null;

const SCHOOL_COLORS = {
    'SINE': '#2563eb', // Royal Blue
    'SIBS': '#059669', // Emerald Green
    'HASS': '#7c3aed', // Purple
    'OTHER': '#64748b' // Slate
};

const DEPT_COLORS = {
    // SINE (Engineering Sciences)
    'ESME': '#2563eb', 'ESCS': '#10b981', 'ESAN': '#f59e0b',
    'ESEC': '#06b6d4', 'ESCE': '#8b5cf6', 'ESAS': '#ec4899', 'ESIS': '#64748b',
    // SIBS (Basic Sciences)
    'BSBI': '#10b981', 'BSCH': '#059669', 'BSMS': '#0284c7', 'BSPM': '#4f46e5',
    // HASS (Humanities & Social Sciences)
    'HSBL': '#e11d48', 'HSEG': '#d97706', 'HSEN': '#0891b2',
    'HSHI': '#7c3aed', 'HSLA': '#4338ca', 'HSLC': '#be123c',
    'HSMA': '#b45309', 'HSMI': '#15803d', 'HSPS': '#6d28d9', 'HSPY': '#374151',
    'OTHER': '#94a3b8'
};

function setTextSafe(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = (val !== null && val !== undefined) ? val : '';
}

/**
 * Master Dispatcher for Executive Charts
 */
function renderExecutiveCharts(data, scope) {
    if (!data) return;

    const isSchoolLevel = (scope === 'ALL');
    const schools = data.schools || [];

    if (isSchoolLevel) {
        setTextSafe('titleQuadrant', 'School Resourcing Matrix (2×2 Quadrant)');
        setTextSafe('descQuadrant', 'X: Course Prep Load (Weighted Sections/Inst) | Y: Student Contact Load (Cadets/Inst) | Bubble Size: Total Cadet Volume');
        setTextSafe('titleRanking', 'Student Credit Hours Delivered by School');
        setTextSafe('descRanking', 'Total student credit volume generated across USAFA Academic Schools');
        setTextSafe('titleFacultyPie', 'Faculty by School');
        setTextSafe('descFacultyPie', 'Share of instructional faculty lines across USAFA Academic Schools');
        setTextSafe('titleMajorsPie', 'Declared Majors by School');
        setTextSafe('descMajorsPie', 'Cadet enrollment across USAFA Academic Schools');
        setTextSafe('titleSub10', 'Sections with ≤ 10 Cadets by School');
        setTextSafe('descSub10', 'Small section proliferation and elective fragmentation across schools');

        const kpis = data.institution_kpis || data.school_kpis;
        renderQuadrantChart(schools, kpis.overall_avg_stu_per_inst, true);
        renderRankingChart(schools, Math.round((kpis.total_sch || 0) / Math.max(1, schools.length)), true);
        renderFacultyPieChart(schools, true);
        renderMajorsPieChart(schools, true);
        renderSub10BarChart(schools, true);
    } else {
        const targetSchool = schools.find(s => s.school_code === scope);
        const schoolDepts = (data.departments || []).filter(d => (d.school_code || 'OTHER') === scope && (d.total_sections > 0 || d.faculty_count > 0));
        const sName = targetSchool ? targetSchool.short_name : scope;

        setTextSafe('titleQuadrant', `Department Resourcing Matrix (2×2 Quadrant) — ${sName}`);
        setTextSafe('descQuadrant', 'X: Course Prep Load (Weighted Sections/Inst) | Y: Student Contact Load (Cadets/Inst) | Bubble Size: Total Cadet Volume');
        setTextSafe('titleRanking', `Student Credit Hours Delivered by Department — ${sName}`);
        setTextSafe('descRanking', `Total student credit volume generated across ${sName} departments`);
        setTextSafe('titleFacultyPie', `Faculty by Department — ${sName}`);
        setTextSafe('descFacultyPie', `Share of instructional faculty lines across ${sName}`);
        setTextSafe('titleMajorsPie', `Declared Majors by Department — ${sName}`);
        setTextSafe('descMajorsPie', `Cadet enrollment across ${sName} academic majors`);
        setTextSafe('titleSub10', `Sections with ≤ 10 Cadets — ${sName}`);
        setTextSafe('descSub10', `Small section proliferation across ${sName} departments`);

        const avgStu = targetSchool ? targetSchool.students_per_inst_mean : 0;
        const avgSCH = targetSchool ? Math.round((targetSchool.total_sch || 0) / Math.max(1, schoolDepts.length)) : 0;

        renderQuadrantChart(schoolDepts, avgStu, false);
        renderRankingChart(schoolDepts, avgSCH, false);
        renderFacultyPieChart(schoolDepts, false);
        renderMajorsPieChart(schoolDepts, false);
        renderSub10BarChart(schoolDepts, false);
    }
}

/**
 * 2x2 Resourcing Quadrant Matrix
 */
function renderQuadrantChart(items, yBenchmark, isSchoolLevel) {
    if (typeof Chart === 'undefined') {
        setTimeout(() => renderQuadrantChart(items, yBenchmark, isSchoolLevel), 200);
        return;
    }
    const canvas = document.getElementById('quadrantChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (quadrantChartInstance) quadrantChartInstance.destroy();

    const activeItems = (items || []).filter(d => (d.faculty_count > 0 || d.total_sections > 0));
    if (activeItems.length === 0) return;

    let bubbleData;
    if (isSchoolLevel) {
        bubbleData = activeItems.map(s => ({
            x: s.sections_per_inst_mean || 0,
            y: s.students_per_inst_mean || 0,
            r: Math.max(14, Math.min(36, Math.sqrt(s.total_cadet_seats || 10) * 0.22)),
            code: s.school_code,
            name: s.school_name,
            dean: s.dean,
            totalSeats: s.total_cadet_seats,
            facultyCount: s.faculty_count,
            sub10Pct: s.sub10_percentage,
            color: SCHOOL_COLORS[s.school_code] || '#2563eb'
        }));
    } else {
        bubbleData = activeItems.map(d => ({
            x: d.sections_per_inst_mean || 0,
            y: d.students_per_inst_mean || 0,
            r: Math.max(8, Math.min(26, Math.sqrt(d.total_cadet_seats || 10) * 0.45)),
            code: d.dept_code,
            name: d.dept_name,
            totalSeats: d.total_cadet_seats,
            facultyCount: d.faculty_count,
            sub10Pct: d.sub10_percentage,
            color: DEPT_COLORS[d.dept_code] || '#3b82f6'
        }));
    }

    quadrantChartInstance = new Chart(ctx, {
        type: 'bubble',
        data: {
            datasets: [{
                label: isSchoolLevel ? 'Schools' : 'Departments',
                data: bubbleData,
                backgroundColor: bubbleData.map(b => b.color),
                borderColor: '#1e293b',
                borderWidth: 1.5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const raw = context.raw;
                            if (isSchoolLevel) {
                                return `[${raw.code}] ${raw.name}: ${raw.y} cadets/inst, ${raw.x} secs/inst (${(raw.totalSeats || 0).toLocaleString()} seats, ${raw.facultyCount} faculty, ${raw.sub10Pct}% sub-10)`;
                            } else {
                                return `${raw.code} (${raw.name}): ${raw.y} cadets/inst, ${raw.x} secs/inst (${(raw.totalSeats || 0).toLocaleString()} seats, ${raw.facultyCount} faculty, ${raw.sub10Pct}% sub-10)`;
                            }
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Weighted Sections / Instructor (Prep Load)', font: { weight: 'bold' } },
                    grid: { color: '#f1f5f9' }
                },
                y: {
                    title: { display: true, text: 'Cadet Contact Load / Instructor', font: { weight: 'bold' } },
                    grid: { color: '#f1f5f9' }
                }
            }
        }
    });
}

/**
 * SCH Ranking Chart
 */
function renderRankingChart(items, benchmark, isSchoolLevel) {
    if (typeof Chart === 'undefined') {
        setTimeout(() => renderRankingChart(items, benchmark, isSchoolLevel), 200);
        return;
    }
    const canvas = document.getElementById('rankingChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (rankingChartInstance) rankingChartInstance.destroy();

    const sortedItems = [...(items || [])].sort((a, b) => b.total_sch - a.total_sch);
    const labels = sortedItems.map(item => isSchoolLevel ? (item.short_name || item.school_code) : item.dept_code);
    const bgColors = sortedItems.map(item => isSchoolLevel ? (SCHOOL_COLORS[item.school_code] || '#3b82f6') : (DEPT_COLORS[item.dept_code] || '#3b82f6'));

    rankingChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Student Credit Hours (SCH)',
                data: sortedItems.map(d => Math.round(d.total_sch || 0)),
                backgroundColor: bgColors,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        afterLabel: () => `Benchmark: ${(benchmark || 0).toLocaleString()} SCH`
                    }
                }
            },
            scales: {
                y: {
                    title: { display: true, text: 'Total Student Credit Hours (SCH)', font: { weight: 'bold' } },
                    grid: { color: '#f1f5f9' }
                }
            }
        }
    });
}

/**
 * Faculty Distribution Donut Chart
 */
function renderFacultyPieChart(items, isSchoolLevel) {
    if (typeof Chart === 'undefined') {
        setTimeout(() => renderFacultyPieChart(items, isSchoolLevel), 200);
        return;
    }
    const canvas = document.getElementById('facultyPieChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (facultyPieChartInstance) facultyPieChartInstance.destroy();

    const activeItems = (items || []).filter(d => d.faculty_count > 0);
    if (activeItems.length === 0) return;

    const labels = activeItems.map(d => isSchoolLevel ? `${d.short_name} (${d.faculty_count})` : `${d.dept_code} (${d.faculty_count})`);
    const bgColors = activeItems.map(d => isSchoolLevel ? (SCHOOL_COLORS[d.school_code] || '#3b82f6') : (DEPT_COLORS[d.dept_code] || '#3b82f6'));

    facultyPieChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: activeItems.map(d => d.faculty_count),
                backgroundColor: bgColors,
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
                tooltip: {
                    callbacks: {
                        label: (ctx) => ` ${ctx.label}: ${ctx.raw} faculty lines`
                    }
                }
            }
        }
    });
}

/**
 * Declared Majors Distribution Donut Chart
 */
function renderMajorsPieChart(items, isSchoolLevel) {
    if (typeof Chart === 'undefined') {
        setTimeout(() => renderMajorsPieChart(items, isSchoolLevel), 200);
        return;
    }
    const canvas = document.getElementById('majorsPieChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (majorsPieChartInstance) majorsPieChartInstance.destroy();

    const activeItems = (items || []).filter(d => d.declared_majors_total > 0);
    if (activeItems.length === 0) return;

    const labels = activeItems.map(d => isSchoolLevel ? `${d.short_name} (${d.declared_majors_total})` : `${d.dept_code} (${d.declared_majors_total})`);
    const bgColors = activeItems.map(d => isSchoolLevel ? (SCHOOL_COLORS[d.school_code] || '#3b82f6') : (DEPT_COLORS[d.dept_code] || '#3b82f6'));

    majorsPieChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: activeItems.map(d => d.declared_majors_total),
                backgroundColor: bgColors,
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
                tooltip: {
                    callbacks: {
                        label: (ctx) => ` ${ctx.label}: ${ctx.raw} declared majors`
                    }
                }
            }
        }
    });
}

/**
 * Sub-10 Cadet Sections Bar Chart
 */
function renderSub10BarChart(items, isSchoolLevel) {
    if (typeof Chart === 'undefined') {
        setTimeout(() => renderSub10BarChart(items, isSchoolLevel), 200);
        return;
    }
    const canvas = document.getElementById('sub10BarChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (sub10BarChartInstance) sub10BarChartInstance.destroy();

    const activeItems = (items || []).filter(d => d.total_sections > 0);
    if (activeItems.length === 0) return;

    const labels = activeItems.map(d => isSchoolLevel ? d.short_name : d.dept_code);
    const bgColors = activeItems.map(d => isSchoolLevel ? (SCHOOL_COLORS[d.school_code] || '#d97706') : '#d97706');

    sub10BarChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Sections ≤ 10 Cadets',
                data: activeItems.map(d => d.sub10_sections_count),
                backgroundColor: bgColors,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        afterLabel: (ctx) => {
                            const d = activeItems[ctx.dataIndex];
                            return `${d.sub10_percentage}% of sections (${d.sub10_sections_count}/${d.total_sections})`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    title: { display: true, text: 'Number of Sections', font: { weight: 'bold' } },
                    grid: { color: '#f1f5f9' }
                }
            }
        }
    });
}

/**
 * Class Year Pipeline Chart
 */
function renderPipelineChart(classPipelineData) {
    if (typeof Chart === 'undefined') {
        setTimeout(() => renderPipelineChart(classPipelineData), 200);
        return;
    }
    const canvas = document.getElementById('pipelineChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (pipelineChartInstance) pipelineChartInstance.destroy();

    const years = ['2026', '2027', '2028', '2029'];
    const yearLabels = ['Class of 2026 (1°)', 'Class of 2027 (2°)', 'Class of 2028 (3°)', 'Class of 2029 (4°)'];
    const majors = Object.keys(classPipelineData || {});

    const colors = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
    const datasets = majors.map((m, idx) => {
        const counts = years.map(y => (classPipelineData[m] && classPipelineData[m][y]) ? classPipelineData[m][y] : 0);
        return {
            label: m,
            data: counts,
            backgroundColor: colors[idx % colors.length],
            borderRadius: 4
        };
    });

    pipelineChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: yearLabels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' }
            },
            scales: {
                x: { stacked: true },
                y: {
                    stacked: true,
                    title: { display: true, text: 'Declared Cadets', font: { weight: 'bold' } },
                    grid: { color: '#f1f5f9' }
                }
            }
        }
    });
}

/**
 * Course Level Footprint Chart
 */
function renderCourseLevelChart(courseLevelsData) {
    if (typeof Chart === 'undefined') {
        setTimeout(() => renderCourseLevelChart(courseLevelsData), 200);
        return;
    }
    const canvas = document.getElementById('courseLevelChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (courseLevelChartInstance) courseLevelChartInstance.destroy();

    const levels = ['100', '200', '300', '400', 'Other'];
    const counts = levels.map(lvl => (courseLevelsData && courseLevelsData[lvl]) ? courseLevelsData[lvl] : 0);
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#64748b'];

    courseLevelChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['100-Level', '200-Level', '300-Level', '400-Level', 'Other'],
            datasets: [{
                label: 'Enrolled Cadets',
                data: counts,
                backgroundColor: colors,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    title: { display: true, text: 'Enrolled Cadets', font: { weight: 'bold' } },
                    grid: { color: '#f1f5f9' }
                }
            }
        }
    });
}

/**
 * Section Size Distribution Chart
 */
function renderDeptSizeDistChart(dist) {
    if (typeof Chart === 'undefined') {
        setTimeout(() => renderDeptSizeDistChart(dist), 200);
        return;
    }
    const canvas = document.getElementById('deptSizeDistChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (deptSizeDistChartInstance) deptSizeDistChartInstance.destroy();

    const buckets = dist || {'<=10': 0, '11-15': 0, '16-20': 0, '21-25': 0, '26+': 0};
    const labels = ['≤ 10 Cadets', '11–15 Cadets', '16–20 Cadets', '21–25 Cadets', '26+ Cadets'];
    const dataVals = [buckets['<=10'] || 0, buckets['11-15'] || 0, buckets['16-20'] || 0, buckets['21-25'] || 0, buckets['26+'] || 0];
    const bgColors = ['#d97706', '#2563eb', '#10b981', '#06b6d4', '#8b5cf6'];

    deptSizeDistChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Sections',
                data: dataVals,
                backgroundColor: bgColors,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => ` ${ctx.raw} sections`
                    }
                }
            },
            scales: {
                y: {
                    title: { display: true, text: 'Number of Sections', font: { weight: 'bold' } },
                    grid: { color: '#f1f5f9' },
                    ticks: { precision: 0 }
                }
            }
        }
    });
}
