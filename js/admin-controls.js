/* Admin dashboard controls: one stable status editor and delete action per report. */
document.addEventListener('DOMContentLoaded', () => {
  const originalGrid = document.getElementById('adminReportsGrid');
  if (!originalGrid) return;

  // app.js installs its own delegated handler. Cloning removes that handler so
  // status updates and deletes are handled exactly once on this page.
  const grid = originalGrid.cloneNode(false);
  originalGrid.replaceWith(grid);

  const statuses = ['Pending', 'Under Review', 'In Progress', 'Resolved', 'Rejected'];

  const showAccessError = (title, message) => {
    const errorBox = document.getElementById('adminError');
    if (errorBox) {
      errorBox.hidden = false;
      errorBox.innerHTML = `<h3>${title}</h3><p>${message}</p>`;
    }
    grid.innerHTML = `<div class="empty-state"><h3>${title}</h3><p>${message}</p></div>`;
  };

  const render = async () => {
    const response = await fetch('/api/reports', { credentials: 'same-origin' });
    if (!response.ok) {
      showAccessError('Unable to load reports', 'Please try again.');
      return;
    }
    const reports = await response.json();
    grid.innerHTML = reports.length ? reports.map(report => `
      <div class="admin-report-item" data-report-id="${escapeHtml(report.id)}">
        ${reportCard(report, true)}
        <div class="admin-status-control">
          <label for="admin-status-${escapeHtml(report.id)}">Status</label>
          <select id="admin-status-${escapeHtml(report.id)}" class="form-control" data-status-select>
            ${statuses.map(status => `<option value="${status}" ${status === report.status ? 'selected' : ''}>${status}</option>`).join('')}
          </select>
          <button type="button" class="btn btn-primary btn-sm" data-action="update-status">Update</button>
          <button type="button" class="btn btn-outline btn-sm admin-delete-report" data-action="delete-report">Delete report</button>
        </div>
      </div>
    `).join('') : '<div class="empty-state"><h3>No reports found</h3></div>';
  };

  grid.addEventListener('click', async event => {
    const actionButton = event.target.closest('[data-action]');
    if (!actionButton) return;
    const item = actionButton.closest('[data-report-id]');
    const reportId = item?.dataset.reportId;
    if (!reportId) return;

    actionButton.disabled = true;
    let response;
    if (actionButton.dataset.action === 'delete-report') {
      if (!window.confirm('Delete this report permanently?')) {
        actionButton.disabled = false;
        return;
      }
      response = await fetch(`/api/reports/${encodeURIComponent(reportId)}`, {
        method: 'DELETE', credentials: 'same-origin'
      });
    } else {
      const status = item.querySelector('[data-status-select]').value;
      response = await fetch(`/api/reports/${encodeURIComponent(reportId)}/status`, {
        method: 'PATCH', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      actionButton.disabled = false;
      showToast(data.error || 'Unable to update report', 'error');
      if (response.status === 401 || response.status === 403) window.location.href = 'account.html';
      return;
    }
    showToast(actionButton.dataset.action === 'delete-report' ? 'Report deleted' : 'Report status updated');
    await render();
  });

  getCurrentUser().then(user => {
    if (!user) return showAccessError('Sign in required', 'Log in to an admin account to manage reports.');
    if (user.role !== 'admin') return showAccessError('Admin access required', 'Only administrators can manage reports.');
    render();
  });
});
