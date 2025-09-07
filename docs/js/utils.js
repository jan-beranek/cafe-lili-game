import { State } from './state.js';

export function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
export function randInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }

export const el = (id) => document.getElementById(id);

export function fmtTime(s) {
  s = Math.max(0, Math.floor(s));
  const m = Math.floor(s / 60), r = s % 60;
  return String(m).padStart(2, '0') + ':' + String(r).padStart(2, '0');
}

export function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function logEvent(msg, deltaBank = 0, deltaS = 0) {
  const t = new Date().toLocaleTimeString();
  State.eventLog.unshift(`[${t}] ${msg} ${deltaBank ? `(ΔKč ${deltaBank})` : ''} ${deltaS ? `(ΔS ${deltaS})` : ''}`);
  if (State.eventLog.length > 200) State.eventLog.pop();
}

export function formatOrderLabel(order) {
  if (!order) return '—';
  return order.items.map((it) => `${it.size}`).join(' + ');
}

export function pickPersona(personas) {
  return personas[(Math.random() * personas.length) | 0];
}

