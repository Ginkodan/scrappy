export function classifyType(type: string): string {
  if (type === 'search' || type === 'search_done') return 'search';
  if (type === 'scrape_start' || type === 'scrape_done') return 'scrape';
  if (type === 'extract' || type === 'update_row') return 'extract';
  if (type === 'agent') return 'agent';
  if (type === 'error') return 'error';
  if (type === 'finish') return 'finish';
  return '';
}

export function formatEvent(type: string, p: Record<string, unknown>): string | null {
  switch (type) {
    case 'search':       return `[search] ${p.query}`;
    case 'search_done':  return `  → ${p.count} URLs`;
    case 'scrape_start': return `[scrape] depth=${p.depth ?? ''} ${p.url ?? p.provider}`;
    case 'scrape_done':  return `  → ${p.chars} chars, ${p.links} links`;
    case 'extract':      return `[extract] +${p.count} records from ${p.url} (total: ${p.total})`;
    case 'finish':       return `[finish] ${p.total} total records`;
    case 'error':        return `[error] ${p.tool}: ${p.message}`;
    case 'agent':        return `[agent] ${p.message}`;
    case 'update_start': return `[update] ${p.total} rows to verify`;
    case 'update_row':   return `  ✓ ${p.provider}: ${p.oldRate} → ${p.newRate}${p.changed ? ' (CHANGED)' : ''}`;
    case 'log':          return (p.message as string) ?? null;
    case 'iter_state':   return null;
    default:             return null;
  }
}
