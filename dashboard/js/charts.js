/**
 * Visual Analytics & Chart.js Controllers
 */

let quadrantChartInstance = null;
let rankingChartInstance = null;
let pipelineChartInstance = null;

function renderQuadrantChart(departments, overallStats) {
    const canvas = document.getElementById('quadrantChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (quadrantChartInstance) quadrantChartInstance.destroy();

    const activeDepts = departments.filter(d => d.faculty_count > 0 || d.total_sections > 0);
    if (activeDepts.length === 0) return;

    const bubbleData = activeDepts.map(d => ({
        x: d.sections_per_inst_mean || 0,
        y: d.students_per_inst_mean || 0,
        r: Math.max(8, Math.min(26, Math.sqrt(d.total_cadet_seats || 10) * 0.45)),
        deptCode: d.dept_code,
        deptName: d.dept_name,
        totalSeats: d.total_cadet_seats,
        facultyCount: d.faculty_count,
        sub10Pct: d.sub10_percentage
    }));

    // Color gradient based on contact load (Y) and prep load (X)
    const allY = bubbleData.map(b => b.y);
    const minY = Math.min(...allY);
    const maxY = Math.max(...allY);
    const rangeY = Math.max(1, maxY - minY);

    const allX = bubbleData.map(b => b.x);
    const minX = Math.min(...allX);
    const maxX = Math.max(...allX);
    const rangeX = Math.max(0.1, maxX - minX);

    const bgColors = bubbleData.map(b => {
        const ty = (b.y - minY) / rangeY;
        const hue = Math.round(135 * (1.0 - ty)); // Green (bottom) to Red (top)
        const tx = (b.x - minX) / rangeX;
        const lightness = Math.round(56 - (16 * tx));
        return `hsla(${hue}, 85%, ${lightness}%, 0.8)`;
    });

    quadrantChartInstance = new Chart(ctx, {
        type: 'bubble',
        data: {
            datasets: [{
                label: 'Departments',
                data: bubbleData,
                backgroundColor: bgColors,
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
                            return `${raw.deptCode} (${raw.deptName}): ${raw.y} cadets/inst, ${raw.x} secs/inst (${raw.totalSeats} seats, ${raw.facultyCount} faculty, ${raw.sub10Pct}% sub-10)`;
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

function renderRankingChart(departments, benchmark) {
    const canvas = document.getElementById('rankingChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (rankingChartInstance) rankingChartInstance.destroy();

    const sortedDepts = [...departments].sort((a, b) => b.total_sch - a.total_sch);

    rankingChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedDepts.map(d => d.dept_code),
            datasets: [{
                label: 'Student Credit Hours (SCH)',
                data: sortedDepts.map(d => d.total_sch),
                backgroundColor: '#3b82f6',
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
                        afterLabel: () => `Institution Benchmark: ${benchmark} SCH`
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

function renderPipelineChart(classPipelineData) {
    const canvas = document.getElementById('pipelineChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (pipelineChartInstance) pipelineChartInstance.destroy();

    const years = ['2026', '2027', '2028', '2029'];
    const yearLabels = ['Class of 2026 (1°)', 'Class of 2027 (2°)', 'Class of 2028 (3°)', 'Class of 2029 (4°)'];
    const majors = Object.keys(classPipelineData || {});

    const colors = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6'];
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
