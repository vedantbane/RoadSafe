/* Adds the admin-only delete action after the dashboard renders reports. */
document.addEventListener('DOMContentLoaded', () => {
  const grid = document.getElementById('adminReportsGrid');
  if (!grid) return;

  const addDeleteButtons = () => {
    grid.querySelectorAll('.admin-status-control').forEach(controls => {
      if (controls.querySelector('[data-delete-report-id]')) return;

      const statusSelect = controls.querySelector('select[id^="status-"]');
      const reportId = statusSelect?.id.replace('status-', '');
      if (!reportId) return;

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn btn-outline btn-sm admin-delete-report';
      button.dataset.deleteReportId = reportId;
      button.textContent = 'Delete report';
      controls.appendChild(button);
    });
  };

  const observer = new MutationObserver(addDeleteButtons);
  observer.observe(grid, { childList: true, subtree: true });
  addDeleteButtons();

  grid.addEventListener('click', async event => {
    const button = event.target.closest('[data-delete-report-id]');
    if (!button) return;

    const reportId = button.dataset.deleteReportId;
    if (!window.confirm('Delete this report permanently?')) return;

    button.disabled = true;
    const response = await fetch(`/api/reports/${encodeURIComponent(reportId)}`, {
      method: 'DELETE',
      credentials: 'same-origin'
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      button.disabled = false;
      showToast(data.error || 'Unable to delete report', 'error');
      if (response.status === 401 || response.status === 403) window.location.href = 'account.html';
      return;
    }

    showToast('Report deleted');
    button.closest('.report-card')?.remove();
  });
});
