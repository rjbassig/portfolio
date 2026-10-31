import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// Load projects
const projects = await fetchJSON('../lib/projects.json') ?? [];

const projectsContainer = document.querySelector('.projects');
const projectsTitle = document.querySelector('.projects-title');
const searchInput = document.querySelector('.searchBar');

const svg = d3.select('#projects-pie-plot');
const legend = d3.select('.legend');

const colors = d3.scaleOrdinal(d3.schemeTableau10);

// Track both filters independently
let query = '';
let selectedYear = null;

// Filter projects using BOTH search and selected year
function getFilteredProjects() {
    return projects.filter((project) => {
        const values = Object.values(project)
            .join('\n')
            .toLowerCase();

        const matchesSearch = values.includes(query);

        const matchesYear =
            selectedYear === null ||
            String(project.year) === selectedYear;

        return matchesSearch && matchesYear;
    });
}

// Render projects and update count
function updateProjects(projectsGiven) {
    renderProjects(projectsGiven, projectsContainer, 'h2');

    if (projectsTitle) {
        projectsTitle.textContent = `${projectsGiven.length} Projects`;
    }
}

// Render pie chart and legend
function renderPieChart(projectsGiven) {
    const rolledData = d3.rollups(
        projectsGiven,
        (v) => v.length,
        (d) => d.year
    );

    const data = rolledData.map(([year, count]) => ({
        label: String(year),
        value: count
    }));

    // Clear previous chart and legend
    svg.selectAll('*').remove();
    legend.selectAll('*').remove();

    if (data.length === 0) {
        return;
    }

    const pie = d3.pie()
        .value((d) => d.value)
        .sort(null);

    const arcs = pie(data);

    const arcGenerator = d3.arc()
        .innerRadius(0)
        .outerRadius(50);

    // Draw pie slices
    svg.selectAll('path')
        .data(arcs)
        .join('path')
        .attr('d', arcGenerator)
        .attr('fill', (d) => colors(d.data.label))
        .classed('selected', (d) =>
            d.data.label === selectedYear
        )
        .on('click', (event, d) => {
            const clickedYear = d.data.label;

            selectedYear =
                selectedYear === clickedYear
                    ? null
                    : clickedYear;

            updateVisualization();
        });

    // Draw legend
    legend.selectAll('li')
        .data(data)
        .join('li')
        .attr('class', 'legend-item')
        .style('--color', (d) => colors(d.label))
        .classed('selected', (d) =>
            d.label === selectedYear
        )
        .html((d) => `
            <span class="swatch"></span>
            ${d.label} <em>(${d.value})</em>
        `)
        .on('click', (event, d) => {
            selectedYear =
                selectedYear === d.label
                    ? null
                    : d.label;

            updateVisualization();
        });
}

// Update everything together
function updateVisualization() {
    // Apply both filters to project cards
    const filteredProjects = getFilteredProjects();

    updateProjects(filteredProjects);

    // Pie chart shows years matching the search query.
    // This keeps other years clickable even when one is selected.
    const searchFilteredProjects = projects.filter((project) => {
        const values = Object.values(project)
            .join('\n')
            .toLowerCase();

        return values.includes(query);
    });

    renderPieChart(searchFilteredProjects);
}

// Search functionality
if (searchInput) {
    searchInput.addEventListener('input', (event) => {
        query = event.target.value.toLowerCase().trim();

        updateVisualization();
    });
}

// Initial render
updateVisualization();