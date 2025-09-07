import { CONFIG } from './config.js';
import { State } from './state.js';
import { el, fmtTime, escapeHtml } from './utils.js';
import { formatOrderLabel } from './utils.js';

export function render() {
  const pp = el('paymentPanel'); if (pp) pp.style.display = 'block';
  const tEl = el('time'); if (tEl) tEl.textContent = fmtTime(State.shiftRemaining);
  const bEl = el('bank'); if (bEl) bEl.textContent = `${State.bank} Kč`;
  const sEl = el('served'); if (sEl) sEl.textContent = `${State.customersServed}`;
  const rep = State.customersServed ? (State.reputationSum / State.customersServed).toFixed(1) : '0.0';
  const rEl = el('reputation'); if (rEl) rEl.textContent = rep;

  const q = el('queueHeads'); if (q) {
    q.innerHTML = '';
    const heads = Math.min(CONFIG.spawn.maxQueueVisual, State.queue.length);
    for (let i = 0; i < heads; i++) { const d = document.createElement('div'); d.className = 'head'; d.textContent = '🙂'; q.appendChild(d); }
  }
  const qcEl = el('queueCount'); if (qcEl) qcEl.textContent = String(State.queue.length);
  const qt = el('queueTop'); if (qt) qt.textContent = String(State.queue.length);

  if (State.active) {
    const ol = el('orderLabel'); if (ol) ol.textContent = formatOrderLabel(State.active.order);
    const ph = el('phase'); if (ph) ph.textContent = State.active.phase;
    const sb = el('sbar'); if (sb) sb.style.width = `${State.active.S}%`;
  } else {
    const ol = el('orderLabel'); if (ol) ol.textContent = '—';
    const ph = el('phase'); if (ph) ph.textContent = '—';
    const sb = el('sbar'); if (sb) sb.style.width = '0%';
  }

  const OL = el('orderedList'); if (OL) OL.innerHTML = '';
  const PL = el('preparedList'); if (PL) PL.innerHTML = '';
  if (State.active && State.active.order && OL && PL) {
    for (const it of State.active.order.items) { OL.appendChild(tag(it.size)); }
    for (const it of State.active.order.prepared) { PL.appendChild(tag(it.size)); }
  }

  renderCurrentItemPanel();

  if (document.getElementById('dev').style.display !== 'none') {
    renderDev();
  }
}

export function renderCurrentItemPanel() {
  const lbl = el('curItemLabel');
  const ing = el('curItemIngredients');
  if (!lbl || !ing) return;
  if (State.currentItem) {
    lbl.textContent = `Káva ${State.currentItem.size}`;
    const a = State.currentItem.actual;
    const parts = [];
    if (a.cup_S) parts.push('kelímek S');
    if (a.cup_M) parts.push('kelímek M');
    if (a.cup_L) parts.push('kelímek L');
    if (a.dose_coffee) parts.push(`káva ×${a.dose_coffee}`);
    ing.textContent = parts.length ? parts.join(' + ') : 'zatím bez ingrediencí';
  } else {
    lbl.textContent = '—';
    ing.textContent = '—';
  }
}

export function tag(size) {
  const span = document.createElement('span');
  span.className = 'tag ' + size.toLowerCase();
  span.textContent = 'Káva ' + size;
  return span;
}

export function flashPhase(msg) {
  const elp = el('phase'); if (!elp) return;
  const old = elp.textContent;
  elp.textContent = msg;
  elp.style.color = '#a33';
  setTimeout(() => { elp.textContent = State.active ? State.active.phase : '—'; elp.style.color = ''; }, 900);
}

export function showPayErrorInline(v) { const e = el('payErrorInline'); if (e) e.style.display = v ? 'block' : 'none'; }

export function buildKeypad() {
  const KP = el('keypadInline'); if (!KP) return; KP.innerHTML = '';
  const keys = ['7', '8', '9', '4', '5', '6', '1', '2', '3', 'C', '0', '←'];
  keys.forEach((k) => {
    const b = document.createElement('button'); b.textContent = k; b.addEventListener('click', () => {
      const input = el('payInputInline');
      if (k === 'C') input.value = '';
      else if (k === '←') input.value = input.value.slice(0, -1);
      else input.value += k;
      showPayErrorInline(false);
    }); KP.appendChild(b);
  });
}

export function renderDev() {
  const rows = (obj) => Object.entries(obj).map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('');
  const avg = State.customersServed ? (State.reputationSum / State.customersServed).toFixed(1) : '0.0';
  el('tblGame').innerHTML = rows({
    Time: fmtTime(State.shiftRemaining),
    Bank: `${State.bank} / start ${State.bankStart} / profit ${State.bank - State.bankStart}`,
    Customers: `${State.customersServed}`,
    Reputation: `${avg}`,
    Queue: State.queue.length,
  });
  const cust = State.active ? {
    Persona: `${State.active.personaId} (decay ${State.active.persona.decayPerSecond}/s)`,
    S: State.active.S.toFixed(1),
    Phase: State.active.phase,
    Order: formatOrderLabel(State.active.order),
    Prepared: State.active.order ? State.active.order.prepared.length + ' ks' : '—',
  } : { Persona: '-', S: '-', Phase: '-', Order: '-', Prepared: '-' };
  el('tblCust').innerHTML = rows(cust);

  const curIt = State.currentItem ? JSON.stringify(State.currentItem.actual) : '-';
  const must = State.currentItem ? JSON.stringify(CONFIG.recipes.coffee[State.currentItem.size]) : '-';
  el('tblOrder').innerHTML = rows({ CurrentItem: curIt, Recipe: must, Valid: '—' });

  el('tblEco').innerHTML = rows({ TotalSpent: State.totalSpent, TotalRevenue: State.totalRevenue, TipModel: CONFIG.economy.tip.formula });

  const log = el('eventLog');
  log.innerHTML = State.eventLog.map((l) => `<div>${escapeHtml(l)}</div>`).join('');
}

export function toggleDev() {
  const dv = el('dev');
  dv.style.display = dv.style.display === 'none' ? 'block' : 'none';
  render();
}

