function initAdminDashboard() {
  const grid = document.getElementById('adminReportsGrid');
  if (!grid) return;
  let reports = [];
  async function render() {
    const response = await fetch('/api/reports', { credentials: 'same-origin' });
    reports = response.ok ? await response.json() : [];
    grid.innerHTML = reports.map(report => `
      <div class="report-card-wrapper">
        ${reportCard(report, true)}
        <div class="admin-status-control">
          <label for="status-${report.id}">Status</label>
          <select id="status-${report.id}" class="form-control">
            ${['Pending', 'Under Review', 'In Progress', 'Resolved', 'Rejected'].map(status => `<option value="${status}" ${status === report.status ? 'selected' : ''}>${status}</option>`).join('')}
          </select>
          <button type="button" class="btn btn-primary btn-sm" data-report-id="${report.id}" data-action="update-status">Update</button>
          <button type="button" class="btn btn-outline btn-sm" data-report-id="${report.id}" data-action="delete-report">Delete report</button>
        </div>
      </div>
    `).join('') || '<div class="empty-state"><h3>No reports found</h3></div>';
  }
  grid.addEventListener('click', async event => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const reportId = button.dataset.reportId;
    if (!reportId) return;

    if (button.dataset.action === 'delete-report') {
      if (!window.confirm('Delete this report permanently?')) return;
      button.disabled = true;
      const response = await fetch(`/api/reports/${encodeURIComponent(reportId)}`, { method: 'DELETE', credentials: 'same-origin' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        showToast(data.error || 'Unable to delete report', 'error');
        button.disabled = false;
        if (response.status === 401 || response.status === 403) window.location.href = 'account.html';
        return;
      }
      showToast('Report deleted');
      render();
      return;
    }

    const status = document.getElementById(`status-${reportId}`)?.value;
    if (!status) return;
    button.disabled = true;
    const response = await fetch(`/api/reports/${encodeURIComponent(reportId)}/status`, { method: 'PATCH', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      showToast(data.error || 'Unable to update status', 'error');
      button.disabled = false;
      if (response.status === 401 || response.status === 403) window.location.href = 'account.html';
      return;
    }
    showToast('Report status updated');
    render();
  });

  getCurrentUser().then(user => {
    const errorBox = document.getElementById('adminError');
    if (!user) {
      if (errorBox) {
        errorBox.hidden = false;
        errorBox.innerHTML = '<h3>Sign in required</h3><p>Log in to an admin account to manage reports.</p>';
      }
      grid.innerHTML = '<div class="empty-state"><h3>Access required</h3><p>Please sign in to continue.</p></div>';
      return;
    }
    if (user.role !== 'admin') {
      if (errorBox) {
        errorBox.hidden = false;
        errorBox.innerHTML = '<h3>Admin access required</h3><p>Use the master admin passcode from the account page to promote your account.</p>';
      }
      grid.innerHTML = '<div class="empty-state"><h3>Admin access required</h3><p>Promote this account to admin to continue.</p></div>';
      return;
    }
    render();
  });
}
