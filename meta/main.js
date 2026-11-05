import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

let commits = [];
let xScale;
let yScale;
const number = d3.format(',');

async function loadData() {
    return d3.csv(new URL('loc.csv', import.meta.url), row => ({
        ...row,
        rawDate: row.date,
        line: Number(row.line),
        depth: Number(row.depth),
        length: Number(row.length),
        date: new Date(`${row.date}T00:00:00${row.timezone}`),
        datetime: new Date(row.datetime),
    }));
}

function processCommits(data) {
    return d3.groups(data, d => d.commit).map(([id, lines]) => {
        const first = lines[0];
        const [hour, minute, second = 0] = first.time.split(':').map(Number);
        const commit = {
            id,
            url: `https://github.com/rjbassig/portfolio/commit/${id}`,
            author: first.author,
            date: first.date,
            time: first.time,
            timezone: first.timezone,
            datetime: first.datetime,
            hourFrac: hour + minute / 60 + second / 3600,
            totalLines: lines.length,
        };
        Object.defineProperty(commit, 'lines', { value: lines, enumerable: false });
        return commit;
    });
}

function renderCommitInfo(data, commits) {
    const files = d3.group(data, d => d.file);
    const lengths = d3.rollups(data, rows => d3.max(rows, d => d.line), d => d.file);
    const longest = d3.greatest(lengths, d => d[1]);
    const stats = [
        ['Total lines of code', number(data.length)],
        ['Total commits', number(commits.length)],
        ['Number of files', number(files.size)],
        ['Average file length', `${d3.mean(lengths, d => d[1]).toFixed(1)} lines`],
        ['Longest file', `${longest[0]} (${number(longest[1])} lines)`],
        ['Average line length', `${d3.mean(data, d => d.length).toFixed(1)} characters`],
    ];
    const dl = d3.select('#stats').append('dl').attr('class', 'stats');
    for (const [label, value] of stats) {
        const item = dl.append('div');
        item.append('dt').text(label);
        item.append('dd').text(value);
    }
}

function renderTooltipContent(commit) {
    d3.select('#commit-link').attr('href', commit.url).text(commit.id.slice(0, 8));
    // Keep the authored calendar date rather than converting to the viewer's timezone.
    d3.select('#commit-date').text(commit.lines[0].rawDate);
    d3.select('#commit-time').text(`${commit.time} (UTC${commit.timezone})`);
    d3.select('#commit-author').text(commit.author);
    d3.select('#commit-lines').text(number(commit.totalLines));
}

function updateTooltipVisibility(isVisible) {
    d3.select('#commit-tooltip').property('hidden', !isVisible);
}

function updateTooltipPosition(event) {
    const tooltip = document.querySelector('#commit-tooltip');
    const box = tooltip.getBoundingClientRect();
    const left = Math.max(8, Math.min(event.clientX + 12, window.innerWidth - box.width - 8));
    const top = Math.max(8, Math.min(event.clientY + 12, window.innerHeight - box.height - 8));
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
}

function isCommitSelected(selection, commit) {
    if (!selection) return false;
    const [[x0, y0], [x1, y1]] = selection;
    const x = xScale(commit.datetime);
    const y = yScale(commit.hourFrac);
    return x0 <= x && x <= x1 && y0 <= y && y <= y1;
}

function renderSelectionCount(selection) {
    const count = commits.filter(commit => isCommitSelected(selection, commit)).length;
    d3.select('#selection-count').text(count === 0 ? 'No commits selected' : `${count} commit${count === 1 ? '' : 's'} selected`);
}

function renderLanguageBreakdown(selection) {
    const lines = commits.filter(commit => isCommitSelected(selection, commit)).flatMap(commit => commit.lines);
    const breakdown = d3.rollup(lines, rows => rows.length, d => d.type);
    const names = { js: 'JavaScript', html: 'HTML', css: 'CSS', svelte: 'Svelte' };
    const dl = d3.select('#language-breakdown');
    dl.selectAll('*').remove();
    for (const [language, count] of d3.sort([...breakdown], d => -d[1])) {
        const item = dl.append('div');
        item.append('dt').text(names[language] ?? language);
        item.append('dd').text(`${number(count)} lines (${d3.format('.1~%')(count / lines.length)})`);
    }
}

function brushed(event) {
    updateTooltipVisibility(false);
    d3.select('#chart').selectAll('circle').classed('selected', commit => isCommitSelected(event.selection, commit));
    renderSelectionCount(event.selection);
    renderLanguageBreakdown(event.selection);
}

function renderScatterPlot(data, commits) {
    const width = 1000;
    const height = 600;
    const margin = { top: 30, right: 40, bottom: 65, left: 65 };
    const right = width - margin.right;
    const bottom = height - margin.bottom;
    const svg = d3.select('#chart').append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('role', 'img').attr('aria-label', 'Commit date versus time of day; circle size represents lines attributed to each commit.');
    let [start, end] = d3.extent(commits, d => d.datetime);
    if (+start === +end) {
        start = new Date(+start - 86400000);
        end = new Date(+end + 86400000);
    }
    xScale = d3.scaleTime().domain([start, end]).range([margin.left + 30, right - 30]).nice();
    yScale = d3.scaleLinear().domain([0, 24]).range([bottom, margin.top]);
    const ticks = [0, 6, 12, 18, 24];
    svg.append('g').attr('class', 'gridlines').attr('transform', `translate(${margin.left},0)`)
        .call(d3.axisLeft(yScale).tickValues(ticks).tickSize(-(right - margin.left)).tickFormat(''));
    svg.append('g').attr('transform', `translate(0,${bottom})`).call(d3.axisBottom(xScale).ticks(6));
    svg.append('g').attr('transform', `translate(${margin.left},0)`)
        .call(d3.axisLeft(yScale).tickValues(ticks).tickFormat(hour => `${String(hour % 24).padStart(2, '0')}:00`));
    svg.append('text').attr('x', width / 2).attr('y', height - 15).attr('fill', 'currentColor').attr('text-anchor', 'middle').text('Commit date');
    svg.append('text').attr('transform', 'rotate(-90)').attr('x', -height / 2).attr('y', 15).attr('fill', 'currentColor').attr('text-anchor', 'middle').text('Time of day (commit timezone)');
    const [minLines, maxLines] = d3.extent(commits, d => d.totalLines);
    const rScale = d3.scaleSqrt().domain(minLines === maxLines ? [0, maxLines || 1] : [minLines, maxLines]).range([2, 30]);
    const sortedCommits = d3.sort(commits, d => -d.totalLines);
    const dots = svg.append('g').attr('class', 'dots');
    dots.selectAll('circle').data(sortedCommits).join('circle')
        .attr('cx', d => xScale(d.datetime)).attr('cy', d => yScale(d.hourFrac))
        .attr('r', d => rScale(d.totalLines))
        .attr('tabindex', 0).attr('aria-label', d => `${d.author}, ${d.time}, ${d.totalLines} lines`)
        .on('mouseenter', (event, commit) => {
            renderTooltipContent(commit);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
        })
        .on('mousemove', updateTooltipPosition)
        .on('mouseleave', () => updateTooltipVisibility(false))
        .on('focus', (event, commit) => {
            renderTooltipContent(commit);
            updateTooltipVisibility(true);
            const box = event.target.getBoundingClientRect();
            updateTooltipPosition({ clientX: box.right, clientY: box.top });
        })
        .on('blur', () => updateTooltipVisibility(false))
        .on('keydown', (event, commit) => {
            if (event.key === 'Enter') window.open(commit.url, '_blank', 'noopener,noreferrer');
        });
    svg.append('g').attr('class', 'brush')
        .call(d3.brush().extent([[margin.left, margin.top], [right, bottom]]).on('start brush end', brushed));
    // Dots above the overlay keep hover targets available after brushing.
    dots.raise();
}

try {
    const data = await loadData();
    if (!data.length || data.some(row => !Number.isFinite(row.line) || !Number.isFinite(row.depth) || !Number.isFinite(row.length) || Number.isNaN(+row.datetime) || Number.isNaN(+row.date))) {
        throw new Error('Invalid or empty code analysis');
    }
    commits = processCommits(data);
    renderCommitInfo(data, commits);
    renderScatterPlot(data, commits);
    d3.select('#data-status').text('Snapshot of committed source lines, grouped by the commit that last changed each line; this is not a count of every historical edit.');
} catch {
    d3.select('#data-status').attr('role', 'alert').text('Code analysis could not be loaded. Please reload the page or regenerate meta/loc.csv with npm run analyze.');
}
