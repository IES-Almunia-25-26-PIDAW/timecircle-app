export function canRequestStart(trade: any) {
  if (!trade?.scheduledDate) return { allowed: true, tooSoon: false, message: '' };
  const scheduled = new Date(trade.scheduledDate);
  if (Number.isNaN(scheduled.getTime())) return { allowed: true, tooSoon: false, message: '' };
  const earliest = new Date(scheduled.getTime() - 24 * 60 * 60 * 1000); // 1 day early
  const latest = new Date(scheduled.getTime() + 5 * 60 * 60 * 1000); // 5 hours late
  const now = new Date();
  if (now < earliest) {
    const opts: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    const when = earliest.toLocaleString(undefined, opts);
    return {
      allowed: false,
      tooSoon: true,
      message: `Aún es muy pronto para solicitar el inicio. Puedes solicitar desde ${when}`,
      earliestAllowed: earliest,
      latestAllowed: latest,
    };
  }
  // Within window or past; allow (server will enforce other rules)
  return { allowed: true, tooSoon: false, message: '', earliestAllowed: earliest, latestAllowed: latest };
}

export default canRequestStart;
