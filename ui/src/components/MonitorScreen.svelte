<script lang="ts">
  import { jobsStore } from '../stores/jobs.svelte';
  import { dashStore } from '../stores/dashboard.svelte';
  import StatsBar from './StatsBar.svelte';
  import DashPanel from './DashPanel.svelte';
  import RawLog from './RawLog.svelte';
  import { shortUrl, fmtK, timeAgo } from '../lib/format';
  import { cancelJob } from '../lib/api';

  const s = $derived(dashStore.state);
  const activeScrapesList = $derived([...s.activeScrapes.values()]);
  const recentJobs = $derived(jobsStore.jobs.slice(0, 5));

  // Auto-connect to the latest running job when no job is loaded
  $effect(() => {
    const running = jobsStore.jobs.find(j => j.status === 'running');
    if (running && !dashStore.state.job) {
      dashStore.openJob(running.id);
    }
  });

  async function handleClearJobs() {
    await jobsStore.clear();
    dashStore.reset();
  }

  async function handleCancel(id: string, e: MouseEvent) {
    e.stopPropagation();
    await cancelJob(id);
    await jobsStore.refresh();
  }

  function jobLabel(j: typeof recentJobs[0]) {
    return j.type === 'index' ? (j.params.topic ?? j.params.schema ?? 'index') : `update: ${j.params.input ?? ''}`;
  }
</script>

<StatsBar />

<div class="action-ticker" class:idle={dashStore.state.job?.status !== 'running'}>
  <span class="ticker-dot" class:active={dashStore.state.job?.status === 'running'}></span>
  <span class="ticker-text">{dashStore.currentAction}</span>
</div>

<div class="monitor-grid">
  <!-- Active Scrapes -->
  <DashPanel title="Active Scrapes" count={s.activeScrapes.size}>
    <div class="p-header">
      <span class="p-indicator">●</span>
      <span class="p-main">URL / Provider</span>
      <span class="p-meta">Depth · Time</span>
    </div>
    {#if activeScrapesList.length === 0}
      <div class="empty">No active scrapes</div>
    {:else}
      {#each activeScrapesList as sc (sc.url)}
        <div class="p-row active-row">
          <span class="p-indicator active">●</span>
          <span class="p-main" title={sc.url}>{shortUrl(sc.url)}</span>
          <span class="p-meta">{sc.depth != null ? `depth ${sc.depth} · ` : ''}{sc.ts}</span>
        </div>
      {/each}
    {/if}
  </DashPanel>

  <!-- Search Queries -->
  <DashPanel title="Search Queries" count={s.searches.length}>
    <div class="p-header">
      <span class="p-indicator">⌕</span>
      <span class="p-main">Query</span>
      <span class="p-meta">Results</span>
    </div>
    {#if s.searches.length === 0}
      <div class="empty">No searches yet</div>
    {:else}
      {#each [...s.searches].reverse() as sq}
        <div class="p-row">
          <span class="p-indicator search">⌕</span>
          <span class="p-main" title={sq.query}>{sq.query}</span>
          <span class="p-meta">{sq.count != null ? sq.count : '…'}</span>
        </div>
      {/each}
    {/if}
  </DashPanel>

  <!-- Updated Rows -->
  <DashPanel title="Updated Rows" count={s.updateRows.length}>
    <div class="p-header">
      <span class="p-indicator">✓</span>
      <span class="p-main">Provider</span>
      <span class="p-meta">Changed · Time</span>
    </div>
    {#if s.updateRows.length === 0}
      <div class="empty">No rows updated yet</div>
    {:else}
      {#each s.updateRows as r}
        <div class="p-row">
          <span class="p-indicator {r.changed ? 'extract' : 'done'}">✓</span>
          <span class="p-main" title={r.provider}>{r.provider}</span>
          <span class="p-meta" style={r.changed ? 'color:#4caf50' : ''}>{r.changed ? 'CHANGED' : 'same'} · {r.ts}</span>
        </div>
      {/each}
    {/if}
  </DashPanel>

  <!-- Completed Scrapes -->
  <DashPanel title="Completed Scrapes" count={s.completedScrapes.length}>
    <div class="p-header">
      <span class="p-indicator">✓</span>
      <span class="p-main">URL</span>
      <span class="p-meta">Chars · Links</span>
    </div>
    {#if s.completedScrapes.length === 0}
      <div class="empty">No completed scrapes</div>
    {:else}
      {#each s.completedScrapes.slice(0, 80) as sc}
        <div class="p-row">
          <span class="p-indicator done">✓</span>
          <span class="p-main" title={sc.url}>{shortUrl(sc.url)}</span>
          <span class="p-meta">{sc.chars ? fmtK(sc.chars) : ''}{sc.chars && sc.links ? ' · ' : ''}{sc.links ?? ''}</span>
        </div>
      {/each}
    {/if}
  </DashPanel>

  <!-- Extractions -->
  <DashPanel title="Extractions" count={s.extractions.length}>
    <div class="p-header">
      <span class="p-indicator">+</span>
      <span class="p-main">URL</span>
      <span class="p-meta">Found · Total</span>
    </div>
    {#if s.extractions.length === 0}
      <div class="empty">No extractions yet</div>
    {:else}
      {#each [...s.extractions].reverse().slice(0, 60) as ex}
        <div class="p-row">
          <span class="p-indicator extract">+{ex.count}</span>
          <span class="p-main" title={ex.url}>{shortUrl(ex.url)}</span>
          <span class="p-meta">{ex.count} · {ex.total}</span>
        </div>
      {/each}
    {/if}
  </DashPanel>

  <!-- Jobs (last 5, next to Extractions) -->
  <DashPanel title="Jobs" count={jobsStore.jobs.length}>
    <div class="p-header">
      <span class="p-indicator">●</span>
      <span class="p-main">Job</span>
      <span class="p-meta">Age</span>
    </div>
    {#if recentJobs.length === 0}
      <div class="empty">No jobs yet</div>
    {:else}
      {#each recentJobs as j (j.id)}
        <button class="job-row p-row" class:active-row={j.id === jobsStore.selectedJobId} onclick={() => dashStore.openJob(j.id)}>
          <span class="p-indicator">
            {#if j.status === 'running'}<span class="spinner"></span>
            {:else if j.status === 'done'}<span style="color:#00bcd4">✓</span>
            {:else if j.status === 'failed'}<span style="color:#f44336">✗</span>
            {:else}<span style="color:#ffb74d">–</span>
            {/if}
          </span>
          <span class="p-main" title={jobLabel(j)}>{jobLabel(j)}</span>
          <span class="p-meta">{timeAgo(j.startedAt)}</span>
          {#if j.status === 'running'}
            <button class="cancel-btn" onclick={(e) => handleCancel(j.id, e)} title="Cancel">×</button>
          {/if}
        </button>
      {/each}
      {#if jobsStore.jobs.length > 5}
        <div style="font-size:0.65rem;color:#555;padding:0.2rem 0;text-align:center">+{jobsStore.jobs.length - 5} more</div>
      {/if}
      <button class="clear-link" onclick={handleClearJobs}>clear completed</button>
    {/if}
  </DashPanel>

</div>

<!-- Errors (full width) -->
<div style="margin-top:0.75rem">
  <DashPanel title="Errors" count={s.errors.length}>
    <div class="p-header">
      <span class="p-indicator">✗</span>
      <span class="p-main">Tool · Message</span>
      <span class="p-meta">Time</span>
    </div>
    {#if s.errors.length === 0}
      <div class="empty">No errors</div>
    {:else}
      {#each [...s.errors].reverse() as err}
        <div class="p-row" style="flex-direction:column;align-items:flex-start;gap:0.1rem;padding:0.3rem 0">
          <span style="color:#f44336;font-size:0.7rem;word-break:break-all;overflow-wrap:anywhere">
            {err.tool ? `[${err.tool}] ` : ''}{err.message}
          </span>
          <span style="color:#555;font-size:0.62rem">{err.ts}</span>
        </div>
      {/each}
    {/if}
  </DashPanel>
</div>

<!-- Raw Log (full width, collapsible) -->
<div style="margin-top:0.75rem">
  <RawLog entries={s.rawLog} />
</div>

<style>
  .action-ticker {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.45rem 0.75rem;
    margin-bottom: 0.75rem;
    background: #0d1a0d;
    border: 1px solid #1a2e1a;
    border-radius: 4px;
    font-family: "SF Mono", "Fira Code", monospace;
    font-size: 0.72rem;
    color: #4caf50;
    min-width: 0;
    transition: color 0.3s, border-color 0.3s;
  }
  .action-ticker.idle {
    color: #556655;
    border-color: #1a1a1a;
  }
  .ticker-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #4a5a4a;
    flex-shrink: 0;
    margin-top: 0.3rem;
  }
  .ticker-dot.active {
    background: #4caf50;
    animation: ticker-pulse 1.2s ease-in-out infinite;
  }
  @keyframes ticker-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
  .ticker-text {
    white-space: pre-wrap;
    word-break: break-word;
    min-height: 4.2em;
    line-height: 1.5;
  }

  .monitor-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 0.75rem;
  }
  @media (max-width: 1100px) {
    .monitor-grid { grid-template-columns: 1fr 1fr; }
  }
  @media (max-width: 700px) {
    .monitor-grid { grid-template-columns: 1fr; }
  }

  .job-row {
    all: unset;
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    padding: 0.1rem 0;
    border-bottom: 1px solid #1a1a1a;
    cursor: pointer;
    width: 100%;
    box-sizing: border-box;
  }
  .job-row:last-of-type { border-bottom: none; }
  .job-row:hover .p-main { color: #fff; }

  .cancel-btn {
    all: unset;
    cursor: pointer;
    color: #444;
    font-size: 0.85rem;
    line-height: 1;
    margin-left: auto;
    flex-shrink: 0;
  }
  .cancel-btn:hover { color: #f44336; }

  .clear-link {
    all: unset;
    cursor: pointer;
    font-size: 0.62rem;
    color: #555;
    margin-top: 0.35rem;
    display: block;
    transition: color 0.15s;
  }
  .clear-link:hover { color: #ef5350; }
</style>
