/* RoadSafe application logic. Pages are intentionally standalone; navigation is handled by the browser. */
const STORAGE_KEY = 'roadsafe_reports';
const STATUSES = ['Pending', 'Under Review', 'In Progress', 'Resolved', 'Rejected'];

function escapeHtml(value) {
  const node = document.createElement('div');
  node.textContent = value == null ? '' : String(value);
  return node.innerHTML;
}
function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function showToast(message, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) { container = document.createElement('div'); container.className = 'toast-container'; document.body.appendChild(container); }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✓' : '✕'}</span><span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(100%)'; setTimeout(() => toast.remove(), 300); }, 3200);
}
function statusBadge(status) {
  const classes = { Pending: 'badge-pending', 'Under Review': 'badge-review', 'In Progress': 'badge-progress', Resolved: 'badge-resolved', Rejected: 'badge-rejected' };
  return `<span class="badge ${classes[status] || 'badge-pending'}">${escapeHtml(status || 'Pending')}</span>`;
}
function reportCard(report, includeReporter = false) {
  return `<article class="report-card"><div class="report-body"><h3>${escapeHtml(report.title)}</h3><div class="report-meta"><span>📍 ${escapeHtml(report.location)}</span></div><div class="report-meta"><span class="severity-badge sev-${escapeHtml(report.severity || 'medium')}">${escapeHtml(String(report.severity || 'medium').toUpperCase())}</span><span>${escapeHtml(report.category)}</span>${statusBadge(report.status)}</div><p class="report-desc">${escapeHtml(report.description)}</p><div class="report-footer">${includeReporter ? `<span>👤 ${escapeHtml(report.reporter || 'Anonymous')}</span>` : ''}<span>${formatDate(report.date)}</span></div></div></article>`;
}
async function getReports() {
  try { const response = await fetch('/api/reports'); if (response.ok) return await response.json(); } catch (error) { console.warn('Reports API unavailable', error); }
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
async function addReport(report) {
  try { const response = await fetch('/api/reports', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(report) }); if (response.ok) return await response.json(); } catch (error) { console.warn('Unable to submit to API', error); }
  const reports = await getReports(); reports.unshift({ ...report, id: report.id || `local-${Date.now()}` }); localStorage.setItem(STORAGE_KEY, JSON.stringify(reports)); return report;
}
async function getCurrentUser() {
  try { const response = await fetch('/api/auth/me', { credentials: 'same-origin' }); if (!response.ok) return null; return (await response.json()).user; } catch { return null; }
}
function initTheme() {
  const theme = localStorage.getItem('roadsafe_theme') || 'light'; document.documentElement.dataset.theme = theme;
  document.querySelectorAll('.theme-toggle').forEach(button => { button.textContent = theme === 'dark' ? '☀' : '◐'; button.onclick = () => { const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; localStorage.setItem('roadsafe_theme', next); document.documentElement.dataset.theme = next; initTheme(); }; });
}
async function initAccountNavigation() {
  const user = await getCurrentUser();
  document.querySelectorAll('.account-nav-slot').forEach(slot => { slot.innerHTML = user ? `<a href="/account.html">Account</a>${user.role === 'admin' ? '<a href="/admin.html">Admin</a>' : ''}` : '<a href="/account.html">Sign in</a>'; });
}
function initNav() {
  document.querySelectorAll('.hamburger').forEach(button => button.addEventListener('click', () => document.querySelector('.nav-links')?.classList.toggle('open')));
}
function initReportForm() {
  const form = document.getElementById('reportForm'); if (!form || form.dataset.initialized) return; form.dataset.initialized = 'true';
  document.getElementById('getLocation')?.addEventListener('click', () => {
    if (!navigator.geolocation || !window.isSecureContext) return showToast('Location requires HTTPS and browser support', 'error');
    const button = document.getElementById('getLocation'); button.disabled = true; navigator.geolocation.getCurrentPosition(position => { const lat = position.coords.latitude.toFixed(5), lng = position.coords.longitude.toFixed(5); document.getElementById('location').value = `Lat: ${lat}, Lng: ${lng}`; document.getElementById('lat').value = lat; document.getElementById('lng').value = lng; button.disabled = false; showToast('Location captured'); }, () => { button.disabled = false; showToast('Unable to get your location', 'error'); });
  });
  form.addEventListener('submit', async event => { event.preventDefault(); const value = id => document.getElementById(id)?.value.trim(); const report = { title: value('title'), location: value('location'), category: value('category'), severity: document.querySelector('input[name="severity"]:checked')?.value, description: value('description'), reporter: value('reporter') || 'Anonymous', reporterEmail: value('reporterEmail') || '', reporterPhone: value('reporterPhone') || '', lat: Number.parseFloat(value('lat')) || 20.5937, lng: Number.parseFloat(value('lng')) || 78.9629, status: 'Pending', date: new Date().toISOString() }; if (!report.title || !report.location || !report.description || !report.severity) return showToast('Please fill all required fields', 'error'); await addReport(report); showToast('Report submitted successfully'); form.reset(); setTimeout(() => { window.location.href = '/reports.html'; }, 900); });
}
function initReportsPage() {
  const grid = document.getElementById('reportsGrid'); if (!grid || grid.dataset.initialized) return; grid.dataset.initialized = 'true'; const render = async () => { let reports = await getReports(); const search = (document.getElementById('searchReports')?.value || '').toLowerCase(); const status = document.getElementById('filterStatus')?.value || 'all'; const severity = document.getElementById('filterSeverity')?.value || 'all'; reports = reports.filter(r => (status === 'all' || r.status === status) && (severity === 'all' || r.severity === severity) && (!search || `${r.title} ${r.location} ${r.category}`.toLowerCase().includes(search))); grid.innerHTML = reports.length ? reports.map(r => reportCard(r)).join('') : '<div class="empty-state"><h3>No reports found</h3><p>Try changing the filters or submit a new report.</p></div>'; }; ['searchReports', 'filterStatus', 'filterSeverity'].forEach(id => document.getElementById(id)?.addEventListener('input', render)); render(); initMap();
}
async function initMap() { const map = document.getElementById('map'); if (!map || typeof L === 'undefined') return; const leafletMap = L.map(map).setView([22.5, 78.5], 5); L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(leafletMap); (await getReports()).forEach(report => { if (report.lat && report.lng) L.marker([report.lat, report.lng]).addTo(leafletMap).bindPopup(`<strong>${escapeHtml(report.title)}</strong><br>${escapeHtml(report.location)}`); }); }
function initHomeStats() { getReports().then(reports => { const set = (id, value) => { const node = document.getElementById(id); if (node) node.textContent = value; }; set('statTotal', reports.length); set('statFixed', reports.filter(r => r.status === 'Resolved').length); set('statHigh', reports.filter(r => r.severity === 'high').length); set('statProgress', reports.filter(r => r.status === 'In Progress').length); }); }
function initAccountPage() {
  const login = document.getElementById('loginForm'), register = document.getElementById('registerForm'), account = document.getElementById('accountPanel'); if (!login && !register && !account) return;
  const render = async () => { const user = await getCurrentUser(); if (!user) return; document.getElementById('authPanel')?.setAttribute('hidden', ''); account?.removeAttribute('hidden'); const name = document.getElementById('accountName'); if (name) name.textContent = user.name || user.email; const promote = document.getElementById('adminPromotionPanel'); if (promote) promote.hidden = user.role === 'admin'; const grid = document.getElementById('myReportsGrid'); if (grid) { const response = await fetch('/api/reports/mine', { credentials: 'same-origin' }); const reports = response.ok ? await response.json() : []; grid.innerHTML = reports.length ? reports.map(r => reportCard(r)).join('') : '<div class="empty-state"><h3>No reports yet</h3><p>Your submitted reports will appear here.</p></div>'; } };
  const submit = (form, endpoint) => form.addEventListener('submit', async event => { event.preventDefault(); const response = await fetch(endpoint, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(form))) }); const data = await response.json().catch(() => ({})); if (!response.ok) return showToast(data.error || 'Unable to continue', 'error'); showToast('You are signed in'); await initAccountNavigation(); render(); });
  if (login) submit(login, '/api/auth/login'); if (register) submit(register, '/api/auth/register'); document.getElementById('logoutButton')?.addEventListener('click', async () => { await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }); window.location.href = '/account.html'; }); document.getElementById('promoteAdminButton')?.addEventListener('click', async () => { const passcode = document.getElementById('adminPasscodeInput')?.value || ''; const response = await fetch('/api/auth/promote-admin', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ passcode }) }); const data = await response.json().catch(() => ({})); if (!response.ok) return showToast(data.error || 'Unable to promote account', 'error'); showToast('Admin access granted'); await initAccountNavigation(); render(); }); render();
}
function initPushNotifications() { document.getElementById('pushNotificationBtn')?.addEventListener('click', async () => { if (!('Notification' in window)) return showToast('Notifications are not supported', 'error'); const permission = await Notification.requestPermission(); showToast(permission === 'granted' ? 'Notifications enabled' : 'Permission denied', permission === 'granted' ? 'success' : 'error'); }); }
function initAdminDashboard() { /* admin-controls.js owns the admin page interactions when present */ }
document.addEventListener('DOMContentLoaded', () => { initTheme(); initNav(); initReportForm(); initReportsPage(); initHomeStats(); initAccountNavigation(); initAccountPage(); initPushNotifications(); });
