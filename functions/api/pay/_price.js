// price.js — the translation price, the same arithmetic in the page and on the
// server. prices = {"new":[base, pages in base, each page after], "check":[…],
// "stamp": per page}. Nan's prices 2026-10-11: new ฿1,500 up to 5 pages then
// ฿500; checking ฿500 up to 5 pages then ฿150; stamp ฿100 a page.
export function price(prices, { svc, pages, stamp }) {
  const [base, upto, each] = prices[svc] || prices.new
  const n = Math.max(1, Math.min(200, Math.floor(Number(pages)) || 1))
  return base + Math.max(0, n - upto) * each + (stamp ? n * (prices.stamp || 0) : 0)
}
