/* Administrative snapshots only. Never read flight records or local flight caches. */
(() => {
  'use strict';
  const el = id => document.getElementById(id);
  let revision = 0;
  let loadedKey = '';
  let pending = false;
  const allowed = () => cloudEnabled && !!currentUser && currentRole === 'admin' && !passwordRecovery;
  const monthKey = () => new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Kyiv', year: 'numeric', month: '2-digit'
  }).formatToParts(new Date()).filter(p => p.type === 'year' || p.type === 'month').map(p => [p.type, p.value]);
  const currentMonth = () => { const p = Object.fromEntries(monthKey()); return `${p.year}-${p.month}`; };
  const message = value => { el('archiveStatus').textContent = value; };
  function clear() {
    revision++;
    loadedKey = '';
    pending = false;
    el('archiveRows').replaceChildren();
    el('archiveChart').replaceChildren();
    el('archiveCount').textContent = '—';
    message('Архів доступний лише адміністратору.');
    if (activeView === 'archive') showView('overview');
  }
  function render(rows) {
    el('archiveRows').replaceChildren();
    el('archiveChart').replaceChildren();
    el('archiveCount').textContent = String(rows.length);
    for (const row of rows) {
      const tr = document.createElement('tr');
      const month = /^\d{4}-\d{2}-01$/.test(row.month) ? row.month.slice(0, 7) : '—';
      const captured = new Date(row.captured_at);
      const values = [month, Number.isNaN(captured.getTime()) ? '—' : captured.toLocaleString('uk-UA', {timeZone:'Europe/Kyiv'}),
        row.admins, row.moderators, row.executors, row.viewers];
      for (const value of values) {
        const td = document.createElement('td');
        td.textContent = String(value ?? '—');
        tr.append(td);
      }
      el('archiveRows').append(tr);
    }
    const latest = rows[0];
    if (latest) {
      const counts = ['admins','moderators','executors','viewers'].map(key => Math.max(0, Number(latest[key]) || 0));
      const maximum = Math.max(1, ...counts);
      counts.forEach((count, i) => {
        const item = document.createElement('div');
        item.className = 'archive-chart-row';
        const label = document.createElement('span');
        label.textContent = ['Адміни','Модератори','Виконавці','Переглядачі'][i];
        const meter = document.createElement('meter');
        meter.min = 0; meter.max = maximum; meter.value = count;
        meter.setAttribute('aria-label', label.textContent);
        const value = document.createElement('strong'); value.textContent = String(count);
        item.append(label, meter, value); el('archiveChart').append(item);
      });
    }
  }
  async function load(force = false) {
    if (!allowed()) return;
    const key = `${currentUser.id}:${currentMonth()}`;
    if (pending || (!force && loadedKey === key)) return;
    pending = true;
    const request = ++revision;
    el('archiveRefresh').disabled = true;
    message('Перевіряємо доступ і зберігаємо щомісячний знімок…');
    try {
      const saved = await cloud.rpc('capture_admin_monthly_summary');
      if (request !== revision || !allowed()) return;
      if (saved.error) throw saved.error;
      const result = await cloud.from('admin_monthly_summaries')
        .select('month,captured_at,admins,moderators,executors,viewers').order('month', {ascending:false});
      if (request !== revision || !allowed()) return;
      if (result.error) throw result.error;
      render(result.data || []);
      loadedKey = key;
      message('Збережено в Supabase. Знімок робиться під час першого входу адміністратора в місяці й надалі не змінюється.');
    } catch (_) {
      if (request !== revision || !allowed()) return;
      message('Архів недоступний: перевірте підключення, роль і встановлення міграції admin-monthly-summaries.sql. Збереження не підтверджено.');
    } finally {
      if (request === revision) { pending = false; el('archiveRefresh').disabled = false; }
    }
  }
  function sync() {
    el('archiveNav').hidden = !allowed();
    if (!allowed()) { clear(); el('archiveRefresh').disabled = false; return; }
    load();
  }
  el('archiveRefresh').addEventListener('click', () => load(true));
  window.adminArchive = {sync};
  sync();
  // Also handles a tab kept open across a Kyiv calendar-month boundary.
  setInterval(sync, 60000);
})();
