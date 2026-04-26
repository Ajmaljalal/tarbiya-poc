// View-routing, toast, and small formatting helpers used across the app.

const toastEl = document.getElementById('toast');
let toastTimer = null;

export function showToast(message, variant = 'info', duration = 2200) {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.remove('toast--success', 'toast--error', 'toast--info');
  toastEl.classList.add(`toast--${variant}`);
  toastEl.classList.add('toast--show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('toast--show'), duration);
}

export function showView(id) {
  document.querySelectorAll('.view').forEach((v) => v.classList.remove('view--active'));
  const target = document.getElementById(`view-${id}`);
  if (target) target.classList.add('view--active');
  window.scrollTo({ top: 0, behavior: 'instant' });
}

export function activeView() {
  const el = document.querySelector('.view.view--active');
  return el ? el.id.replace('view-', '') : null;
}

export function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function formatDate(date = new Date()) {
  return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}

export function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}
