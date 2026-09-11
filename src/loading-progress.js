export function modelProgress(loaded, total) {
  const mb = bytes => (Math.max(0, bytes || 0) / 1000000).toFixed(1);
  return total > 0
    ? `LOADING BATWING · ${mb(loaded)} / ${mb(total)} MB`
    : loaded > 0 ? `LOADING BATWING · ${mb(loaded)} MB RECEIVED` : "LOADING BATWING…";
}
