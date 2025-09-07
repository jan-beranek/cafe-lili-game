import { State } from './state.js';
import { el } from './utils.js';

export function showReport(title/*, isGameOver*/) {
  el('reportTitle').textContent = title;
  const avg = State.customersServed ? (State.reputationSum / State.customersServed).toFixed(1) : '0.0';
  const body = `
    <div>Obslouženo: <strong>${State.customersServed}</strong></div>
    <div>Tržby: <strong>${State.totalRevenue} Kč</strong> &nbsp; Náklady: <strong>${State.totalSpent} Kč</strong> &nbsp; Profit: <strong>${State.bank - State.bankStart} Kč</strong></div>
    <div>Průměrná spokojenost: <strong>${avg}</strong></div>
  `;
  el('reportBody').innerHTML = body;
  el('reportOverlay').style.display = 'flex';
}

export function hideReport() { el('reportOverlay').style.display = 'none'; }

