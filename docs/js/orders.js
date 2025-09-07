import { CONFIG } from './config.js';

export function chooseItemCount() {
  const w = CONFIG.orders.itemCountWeights;
  const r = Math.random();
  const w1 = w[1] ?? 0.6, w2 = w[2] ?? 0.3, w3 = w[3] ?? 0.1;
  if (r < w1) return 1; if (r < w1 + w2) return 2; return 3;
}

export function newOrderWeighted() {
  const n = chooseItemCount();
  const items = [];
  for (let i = 0; i < n; i++) {
    const size = CONFIG.sizes[(Math.random() * CONFIG.sizes.length) | 0];
    const recipe = CONFIG.recipes.coffee[size];
    items.push({ productId: 'coffee', size, recipe });
  }
  return { id: 'ORD' + Date.now(), items, prepared: [] };
}

export function orderTotal(order) {
  let sum = 0;
  for (const it of order.items) { sum += CONFIG.pricesCZK[it.productId][it.size]; }
  return sum;
}

