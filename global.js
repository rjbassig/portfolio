console.log("IT'S ALIVE!");

function $$(selector, context = document) {
    return Array.from(context.querySelectorAll(selector));
}

const BASE_PATH =
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1"
        ? "/"
        : "/portfolio/";

let pages = [
    { url: "", title: "Home" },
    { url: "projects/", title: "Projects" },
    { url: "contact/", title: "Contact" },
    { url: "https://github.com/rjbassig", title: "GitHub" },
    { url: "resume/", title: "Resume" },
    { url: "meta/", title: "Meta" }
];

let nav = document.createElement("nav");
document.body.prepend(nav);

for (let p of pages) {
    let url = p.url;
    let title = p.title;

    url = !url.startsWith("http") ? BASE_PATH + url : url;

    let a = document.createElement("a");
    a.href = url;
    a.textContent = title;

    if (a.host === location.host && a.pathname === location.pathname) {
        a.classList.add("current");
    }

    if (a.host !== location.host) {
        a.target = "_blank";
        a.rel = "noopener noreferrer";
    }

    nav.append(a);
}

document.body.insertAdjacentHTML(
    "afterbegin",
    `
    <label class="color-scheme">
        Theme:
        <select>
            <option value="light dark">Automatic</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
        </select>
    </label>
    `
);

let select = document.querySelector(".color-scheme select");

function setColorScheme(colorScheme) {
    document.documentElement.style.setProperty("color-scheme", colorScheme);
}

select.addEventListener("input", function (event) {
    let colorScheme = event.target.value;

    setColorScheme(colorScheme);
    localStorage.colorScheme = colorScheme;
});

if ("colorScheme" in localStorage) {
    select.value = localStorage.colorScheme;
    setColorScheme(localStorage.colorScheme);
}

let form = document.querySelector("form");

form?.addEventListener("submit", function (event) {
    event.preventDefault();

    let data = new FormData(form);
    let url = form.action + "?";

    for (let [name, value] of data) {
        url += `${name}=${encodeURIComponent(value)}&`;
    }

    url = url.slice(0, -1);

    location.href = url;
});

export async function fetchJSON(url) {
    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to fetch projects: ${response.statusText}`);
        }

        const data = await response.json();
        return data;

    } catch (error) {
        console.error("Error fetching or parsing JSON data:", error);
        return null;
    }
}

export function renderProjects(projects, containerElement, headingLevel = 'h2') {
    if (!containerElement) {
        console.error('Projects container not found.');
        return;
    }

    containerElement.innerHTML = '';

    if (!Array.isArray(projects) || projects.length === 0) {
        containerElement.textContent = 'No projects available.';
        return;
    }

    if (!/^h[1-6]$/.test(headingLevel)) {
        headingLevel = 'h2';
    }

    for (const project of projects) {
        const article = document.createElement('article');

        const heading = document.createElement(headingLevel);
        if (project.url) {
            const link = document.createElement('a');
            link.href = project.url;
            link.textContent = project.title ?? 'Untitled Project';
            heading.append(link);
        } else {
            heading.textContent = project.title ?? 'Untitled Project';
        }

        const image = document.createElement('img');
        image.src = project.image || 'https://vis-society.github.io/labs/2/images/empty.svg';
        image.alt = project.title ?? 'Project image';

        const details = document.createElement('div');
        details.classList.add('project-details');

        const description = document.createElement('p');
        description.textContent = project.description ?? 'No description available.';

        const year = document.createElement('p');
        year.classList.add('project-year');
        year.textContent = project.year ?? 'Year unknown';

        details.append(description, year);

        article.append(heading, image, details);
        containerElement.appendChild(article);
    }
}

export function fetchGitHubData(username) {
    return fetchJSON(`https://api.github.com/users/${encodeURIComponent(username)}`);
}
