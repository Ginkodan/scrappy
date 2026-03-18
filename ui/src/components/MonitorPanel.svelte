<script lang="ts">
  import { dashStore } from '../stores/dashboard.svelte';
  import DashPanel from './DashPanel.svelte';
  import RawLog from './RawLog.svelte';
  import { shortUrl, fmtK } from '../lib/format';

  const s = $derived(dashStore.state);
  const job = $derived(s.job);
  const activeScrapesList = $derived([...s.activeScrapes.values()]);
  const activeCount = $derived(s.activeScrapes.size);
  const errorCount = $derived(s.errors.length);
</script>

{#if job}
  {#if job.type === 'update'}
    <!-- Update job panels -->
    <div class="panels-top">
      <DashPanel title="Active Scrapes" count={activeCount}>
        <div class="p-header">
          <span class="p-indicator">●</span>
          <span class="p-main">Provider</span>
          <span class="p-meta">Time</span>
        </div>
        {#if activeScrapesList.length === 0}
          <div class="empty">No active scrapes</div>
        {:else}
          {#each activeScrapesList as sc (sc.url)}
            <div class="p-row active-row">
              <span class="p-indicator active">●</span>
              <span class="p-main" title={sc.url}>{sc.url}</span>
              <span class="p-meta">{sc.ts}</span>
            </div>
          {/each}
        {/if}
      </DashPanel>

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
              <span class="p-meta" style={r.changed ? 'color:#4caf50' : ''}>
                {r.changed ? 'CHANGED' : 'same'} · {r.ts}
              </span>
            </div>
          {/each}
        {/if}
      </DashPanel>
    </div>

    {#if s.updateRows.filter(r => r.changed).length > 0}
      <DashPanel title="Changes" count={s.updateRows.filter(r => r.changed).length}>
        {#each s.updateRows.filter(r => r.changed) as r}
          <div class="p-row" style="flex-direction:column;align-items:flex-start;gap:0.1rem;padding:0.25rem 0">
            <span style="color:#ccc;font-size:0.7rem;font-weight:600">{r.provider}</span>
            <span style="color:#888;font-size:0.65rem;word-break:break-all">
              {r.oldValue} → <span style="color:#4caf50">{r.newValue}</span>
            </span>
          </div>
        {/each}
      </DashPanel>
    {/if}

  {:else}
    <!-- Index job panels -->
    <div class="panels-top">
      <DashPanel title="Active Scrapes" count={activeCount}>
        <div class="p-header">
          <span class="p-indicator">●</span>
          <span class="p-main">URL</span>
          <span class="p-meta">Depth · Time</span>
        </div>
        {#if activeScrapesList.length === 0}
          <div class="empty">No active scrapes</div>
        {:else}
          {#each activeScrapesList as sc (sc.url)}
            <div class="p-row active-row">
              <span class="p-indicator active">●</span>
              <span class="p-main" title={sc.url}>{shortUrl(sc.url)}</span>
              <span class="p-meta">depth {sc.depth ?? '?'} · {sc.ts}</span>
            </div>
          {/each}
        {/if}
      </DashPanel>

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
    </div>

    <div class="panels-mid">
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
              <span class="p-meta">
                {sc.chars ? fmtK(sc.chars) : ''}{sc.chars && sc.links ? ' · ' : ''}{sc.links ?? ''}
              </span>
            </div>
          {/each}
        {/if}
      </DashPanel>

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
    </div>
  {/if}

  <!-- Errors -->
  <DashPanel title="Errors" count={errorCount}>
    <div class="p-header">
      <span class="p-indicator">✗</span>
      <span class="p-main">Tool · Message · Time</span>
    </div>
    {#if s.errors.length === 0}
      <div class="empty" style="color:#2a2a2a">No errors</div>
    {:else}
      {#each [...s.errors].reverse() as err}
        <div class="p-row" style="flex-direction:column;align-items:flex-start;gap:0.1rem;padding:0.3rem 0">
          <span style="color:#f44336;font-size:0.7rem;word-break:break-all;overflow-wrap:anywhere">
            {err.tool ? `[${err.tool}] ` : ''}{err.message}
          </span>
          <span style="color:#333;font-size:0.62rem">{err.ts}</span>
        </div>
      {/each}
    {/if}
  </DashPanel>

  <RawLog entries={s.rawLog} />
{/if}
