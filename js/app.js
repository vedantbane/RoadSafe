/* Application logic: storage, form, map, filters, theme, toasts. */
/* RoadSafe Portal - Main JS */
const STORAGE_KEY = 'roadsafe_reports';
// Mock initial data
const MOCK_REPORTS = [
{
id: 'r1',
title: 'Large pothole near MG Road',
location: 'MG Road, near Metro Station, Bengaluru',
category: 'Pothole',
severity: 'high',
description: 'Deep pothole causing vehicle damage. Water logged after rain.',
status: 'reported',
date: '2026-07-28',
reporter: 'Rahul S.',
lat: 12.9750,
lng: 77.6063,
photo: null
},
{
id: 'r2',
title: 'Cracked road surface',
location: 'Link Road, Andheri West, Mumbai',
category: 'Crack',
severity: 'medium',
description: 'Multiple cracks spanning 20 meters. Risk of further damage.',
status: 'progress',
date: '2026-07-25',
reporter: 'Priya M.',
lat: 19.1364,
lng: 72.8277,
photo: null
},
{
id: 'r3',
title: 'Debris on highway shoulder',
location: 'NH-48, near Vadodara',
category: 'Debris',
severity: 'low',
description: 'Construction debris left on shoulder, partially blocking view.',
status: 'fixed',
date: '2026-07-20',
reporter: 'Amit K.',
lat: 22.3072,
lng: 73.1812,
photo: null
},
{
id: 'r4',
title: 'Broken manhole cover',
location: 'Sector 18, Noida',
category: 'Hazard',
severity: 'high',
description: 'Open manhole with broken cover. Extremely dangerous at night.',
status: 'reported',
date: '2026-07-29',
reporter: 'Sneha R.',
lat: 28.5700,
lng: 77.3200,
photo: null
},
{
id: 'r5',
title: 'Uneven speed breaker',
location: 'Park Street, Kolkata',
category: 'Other',
severity: 'medium',
description: 'Speed breaker is uneven and too high, damaging low cars.',
status: 'progress',
date: '2026-07-22',
reporter: 'Vikram D.',
lat: 22.5520,
lng: 88.3520,
photo: null
}
];
async function getReports() {
try {
const res = await fetch('/api/reports');
if (!res.ok) throw new Error('API Error');
const data = await res.json();
if (data && data.length > 0) return data;
} catch (e) {
console.error('Fetch failed, falling back to local storage', e);
}
const stored = localStorage.getItem(STORAGE_KEY);
if (stored) {
try {
return JSON.parse(stored);
} catch (e) {
return [...MOCK_REPORTS];
}
}
return [...MOCK_REPORTS];
}
function saveReports(reports) {
localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
}
async function addReport(report) {
try {
const res = await fetch('/api/reports', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify(report)
});
if (res.ok) {
return await res.json();
}
} catch (e) {
console.error('Failed to save to backend', e);
}
const reports = await getReports();
reports.unshift(report);
saveReports(reports);
return report;
}
async function updateReport(id, changes) {
const reports = await getReports();
const reportIndex = reports.findIndex(report => report.id === id && report.isOwner);
if (reportIndex === -1) return false;
reports[reportIndex] = { ...reports[reportIndex], ...changes };
saveReports(reports);
return true;
}
function generateId() {
return 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
function showToast(message, type = 'success') {
let container = document.querySelector('.toast-container');
if (!container) {
container = document.createElement('div');
container.className = 'toast-container';
document.body.appendChild(container);
}
const toast = document.createElement('div');
toast.className = `toast ${type}`;
toast.innerHTML = `<span>${type === 'success' ? '✓' : '✕'}</span><span>${message}</span>`;
container.appendChild(toast);
setTimeout(() => {
toast.style.opacity = '0';
toast.style.transform = 'translateX(100%)';
setTimeout(() => toast.remove(), 300);
}, 3200);
}
function formatDate(dateStr) {
const d = new Date(dateStr);
return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function severityClass(sev) {
return `sev-${sev}`;
}
function statusBadge(status) {
const map = {
reported: 'badge-reported',
progress: 'badge-progress',
fixed: 'badge-fixed'
};
const labels = {
reported: 'Reported',
progress: 'In Progress',
fixed: 'Fixed'
};
return `<span class="badge ${map[status] || 'badge-reported'}">${labels[status] || status}</span>`;
}
// Theme
function initTheme() {
const saved = localStorage.getItem('roadsafe_theme') || 'light';
document.documentElement.setAttribute('data-theme', saved);
updateThemeIcon(saved);
}
function toggleTheme() {
const current = document.documentElement.getAttribute('data-theme') || 'light';
const next = current === 'light' ? 'dark' : 'light';
document.documentElement.setAttribute('data-theme', next);
localStorage.setItem('roadsafe_theme', next);
updateThemeIcon(next);
}
function updateThemeIcon(theme) {
const btn = document.querySelector('.theme-toggle');
if (btn) btn.textContent = theme === 'dark' ? '■■' : '■';
}
// Mobile nav
function initNav() {
const hamburger = document.querySelector('.hamburger');
const links = document.querySelector('.nav-links');
if (hamburger && links) {
hamburger.addEventListener('click', () => {
links.classList.toggle('open');
});
links.querySelectorAll('a').forEach(a => {
a.addEventListener('click', () => links.classList.remove('open'));
});
}
}
// Report form
function initReportForm() {

const form = document.getElementById('reportForm');
if (!form) return;

const locBtn = document.getElementById('getLocation');

if (locBtn) {
locBtn.addEventListener('click', () => {
if (!navigator.geolocation) {
showToast('Geolocation not supported', 'error');
return;
}
locBtn.disabled = true;
locBtn.textContent = 'Locating...';
navigator.geolocation.getCurrentPosition(
pos => {
const lat = pos.coords.latitude.toFixed(5);
const lng = pos.coords.longitude.toFixed(5);
document.getElementById('location').value = `Lat: ${lat}, Lng: ${lng}`;
document.getElementById('lat').value = lat;
document.getElementById('lng').value = lng;
showToast('Location captured!');
locBtn.disabled = false;
locBtn.textContent = '■ Use My Location';
},
() => {
showToast('Unable to get location', 'error');
locBtn.disabled = false;
locBtn.textContent = '■ Use My Location';
}
);
});
}
form.addEventListener('submit', async e => {
e.preventDefault();
const title = document.getElementById('title').value.trim();
const location = document.getElementById('location').value.trim();
const category = document.getElementById('category').value;
const severity = document.querySelector('input[name="severity"]:checked')?.value;
const description = document.getElementById('description').value.trim();
const reporter = document.getElementById('reporter').value.trim() || 'Anonymous';
const lat = parseFloat(document.getElementById('lat').value) || 20.5937;
const lng = parseFloat(document.getElementById('lng').value) || 78.9629;
if (!title || !location || !severity || !description) {
showToast('Please fill all required fields', 'error');
return;
}

const report = {
title,
location,
category,
severity,
description,
status: 'reported',
date: new Date().toISOString().slice(0, 10),
reporter,
isOwner: true,
lat,
lng
};
await addReport(report);
showToast('Report submitted successfully! Thank you.');
form.reset();

setTimeout(() => {
window.location.href = 'reports.html';
}, 1200);
});

// Auto-scroll for keyboards
const inputs = form.querySelectorAll('input, textarea, select');
inputs.forEach(input => {
input.addEventListener('focus', () => {
setTimeout(() => {
input.scrollIntoView({ behavior: 'smooth', block: 'center' });
}, 300);
});
});
}
// Reports page
function initReportsPage() {
const grid = document.getElementById('reportsGrid');
if (!grid) return;
const statusFilter = document.getElementById('filterStatus');
const severityFilter = document.getElementById('filterSeverity');
const searchInput = document.getElementById('searchReports');

async function render() {
let reports = await getReports();
const status = statusFilter?.value || 'all';
const severity = severityFilter?.value || 'all';
const search = (searchInput?.value || '').toLowerCase();

if (status !== 'all') reports = reports.filter(r => r.status === status);
if (severity !== 'all') reports = reports.filter(r => r.severity === severity);
if (search) {
reports = reports.filter(r =>
r.title.toLowerCase().includes(search) ||
r.location.toLowerCase().includes(search) ||
r.category.toLowerCase().includes(search)
);
}
if (reports.length === 0) {
grid.innerHTML = `
<div class="empty-state" style="grid-column: 1 / -1;">
<div class="icon">■■</div>
<h3>No reports found</h3>
<p>Try changing filters or submit a new report.</p>
</div>`;
return;
}
grid.innerHTML = reports.map(r => `
<article class="report-card">
<div class="report-body">
<h3>${escapeHtml(r.title)}</h3>
<div class="report-meta">
<span>■ ${escapeHtml(r.location)}</span>
</div>
<div class="report-meta">
<span class="severity-badge ${severityClass(r.severity)}">${r.severity.toUpperCase()}</span>
<span>${r.category}</span>
${statusBadge(r.status)}
</div>
<p class="report-desc">${escapeHtml(r.description)}</p>
<div class="report-footer">
<span>■ ${escapeHtml(r.reporter)}</span>
<span>${formatDate(r.date)}</span>
</div>

</div>
</article>
`).join('');
}
function escapeHtml(str) {
const div = document.createElement('div');
div.textContent = str;
return div.innerHTML;
}
statusFilter?.addEventListener('change', render);
severityFilter?.addEventListener('change', render);
searchInput?.addEventListener('input', render);

render();
initMap();
}
let myMap = null;
async function initMap() {
const mapEl = document.getElementById('map');
if (!mapEl || typeof L === 'undefined') return;

if (myMap) {
try { myMap.remove(); } catch (e) {}
myMap = null;
}

myMap = L.map('map').setView([22.5, 78.5], 5);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
attribution: '&copy; OpenStreetMap'
}).addTo(myMap);
const reports = await getReports();
const iconColors = { high: '#EF476F', medium: '#FFD166', low: '#06D6A0' };
reports.forEach(r => {
if (r.lat && r.lng) {
const marker = L.circleMarker([r.lat, r.lng], {
radius: 10,
fillColor: iconColors[r.severity] || '#E85D04',
color: '#fff',
weight: 2,
fillOpacity: 0.9
}).addTo(myMap);
marker.bindPopup(`
<strong>${r.title}</strong><br>
${r.location}<br>
<em>${r.severity} • ${r.status}</em>
`);
}
});
}
// Stats on home
async function initHomeStats() {
const reports = await getReports();
const totalEl = document.getElementById('statTotal');
const fixedEl = document.getElementById('statFixed');
const highEl = document.getElementById('statHigh');
const progressEl = document.getElementById('statProgress');
if (totalEl) totalEl.textContent = reports.length;
if (fixedEl) fixedEl.textContent = reports.filter(r => r.status === 'fixed').length;
if (highEl) highEl.textContent = reports.filter(r => r.severity === 'high').length;
if (progressEl) progressEl.textContent = reports.filter(r => r.status === 'progress').length;
}


function initPushNotifications() {
const pushBtn = document.getElementById('pushNotificationBtn');
if (!pushBtn) return;
pushBtn.addEventListener('click', async () => {
if (!('Notification' in window)) {
showToast('Push notifications not supported on this device', 'error');
return;
}
const permission = await Notification.requestPermission();
if (permission === 'granted') {
showToast('Push notifications enabled!');
new Notification("RoadSafe", { body: "You will now receive updates on your reports." });
} else {
showToast('Permission denied for notifications', 'error');
}
});
}

// Boot
document.addEventListener('DOMContentLoaded', () => {
initTheme();
initNav();
document.querySelector('.theme-toggle')?.addEventListener('click', toggleTheme);
initSPA(); // Initialize Single Page Application Router
});

/* SPA Router */
function initSPA() {
// Initial load based on URL or default to home.html
const initialPage = window.location.pathname.endsWith('/') || window.location.pathname.endsWith('index.html') ? 'home.html' : window.location.pathname.split('/').pop();
loadPage(initialPage, false);

document.addEventListener('click', e => {
const link = e.target.closest('a.spa-link');
if (link) {
e.preventDefault();
const href = link.getAttribute('href');
if (href) {
loadPage(href, true);
updateBottomNav(href);
}
}
});

window.addEventListener('popstate', e => {
if (e.state && e.state.page) {
loadPage(e.state.page, false, true);
updateBottomNav(e.state.page);
}
});
}

async function loadPage(url, pushState = true, isBack = false) {
const contentDiv = document.getElementById('app-content');
if (!contentDiv) return;
const progressBar = document.getElementById('progress-bar');
if (progressBar) {
progressBar.classList.add('loading');
progressBar.style.width = '30%';
}

try {
// Show skeleton
contentDiv.innerHTML = '<div style="padding:2rem;"><div class="skeleton" style="height:200px;"></div><div class="skeleton"></div><div class="skeleton"></div></div>';
if (progressBar) progressBar.style.width = '70%';

const response = await fetch(url);
if (!response.ok) throw new Error('Page not found');
let text = await response.text();

// Extract main content
const parser = new DOMParser();
const doc = parser.parseFromString(text, 'text/html');
let newContent = '';

const header = doc.querySelector('.page-header');
const hero = doc.querySelector('.hero');
const sections = doc.querySelectorAll('.section');
const modals = doc.querySelectorAll('.modal-backdrop');

if (hero) newContent += hero.outerHTML;
if (header) newContent += header.outerHTML;
sections.forEach(sec => newContent += sec.outerHTML);
modals.forEach(mod => newContent += mod.outerHTML);

if (!newContent) newContent = doc.body.innerHTML; // fallback

if (progressBar) progressBar.style.width = '100%';

// Animate out
contentDiv.classList.add(isBack ? 'slide-out-right' : 'slide-out-left'); // Wait, we just use slide-in-right for push
contentDiv.innerHTML = newContent;
contentDiv.className = '';
void contentDiv.offsetWidth; // trigger reflow
contentDiv.classList.add(isBack ? 'slide-in-left' : 'slide-in-right');

if (pushState) {
history.pushState({ page: url }, '', url);
}

// Re-initialize page specific scripts
setTimeout(() => {
initReportForm();
initReportsPage();
initHomeStats();
initPushNotifications();
}, 50);

} catch (err) {
console.error(err);
contentDiv.innerHTML = '<div class="empty-state"><h3>Error loading page</h3></div>';
} finally {
setTimeout(() => {
if (progressBar) {
progressBar.style.opacity = '0';
setTimeout(() => {
progressBar.classList.remove('loading');
progressBar.style.width = '0';
progressBar.style.opacity = '1';
}, 300);
}
}, 300);
}
}

function updateBottomNav(url) {
document.querySelectorAll('.bottom-nav .nav-item').forEach(nav => {
nav.classList.remove('active');
if (nav.getAttribute('href') === url) nav.classList.add('active');
});
}
