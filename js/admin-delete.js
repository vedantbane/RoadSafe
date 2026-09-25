/* Admin-only report deletion controls. Status changes remain handled by app.js. */
document.addEventListener('DOMContentLoaded', () => {
  const grid = document.getElementById('adminReportsGrid');
  if (!grid) return;

  const addDeleteButtons = () => {
    grid.querySelectorAll('.report-card').forEach(card => {
      if (card.querySelector('[data-delete-report-id]')) return;
      const reportId = card.querySelector('[id^="status-"]')?.id.replace('status-', '');
      if (!reportId) return;
      const controls = card.querySelector('.admin-status-control') || card;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn btn-outline admin-delete-report';
      button.dataset.deleteReportId = reportId;
      button.textContent = 'Delete report';
      controls.appendChild(button);
    });
  };

  new MutationObserver(addDeleteButtons).observe(grid, { childList: true, subtree: true });
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

    button.closest('.report-card')?.remove();
    showToast('Report deleted');
  });
});
