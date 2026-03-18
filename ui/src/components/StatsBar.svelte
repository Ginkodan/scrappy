<script lang="ts">
  import { dashStore } from '../stores/dashboard.svelte';

  const s = $derived(dashStore.state);
  const job = $derived(s.job);
  const elapsed = $derived(dashStore.getElapsed());
  const activeCount = $derived(s.activeScrapes.size);
  const errorCount = $derived(s.errors.length);
  const totalTokens = $derived(s.totalInputTokens + s.totalOutputTokens);
  const tokenLabel = $derived(totalTokens > 0 ? fmtTokens(totalTokens) : '–');

  function fmtTokens(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
    return String(n);
  }

  const title = $derived(
    job
      ? job.type === 'index'
        ? (job.params.topic ?? '')
        : `update: ${job.params.input ?? ''}`
      : ''
  );
</script>

{#if job}
  <div class="stats-bar">
    <div class="stats-job-title">
      {#if job.status === 'running'}
        <span class="spinner"></span>
      {/if}
      {title}
      <span class="badge {job.status}">{job.status}</span>
      {#if job.status === 'done' && job.type === 'index' && job.params.output}
        <a class="dl-link" href="/outputs/{job.params.output}">↓ {job.params.output}</a>
      {/if}
    </div>
    <div class="stats-row">
      {#if job.type === 'update'}
        <div class="stat">
          <span class="stat-label">Rows</span>
          <span class="stat-value teal">{s.updateDone} / {s.updateTotal || '?'}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Changed</span>
          <span class="stat-value green">{s.updateRows.filter(r => r.changed).length}</span>
        </div>
      {:else}
        <div class="stat">
          <span class="stat-label">Iteration</span>
          <span class="stat-value teal">{s.iteration} / {s.maxIterations}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Scraped</span>
          <span class="stat-value">{s.visitedCount}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Records</span>
          <span class="stat-value green">{s.recordCount}</span>
        </div>
      {/if}
      <div class="stat">
        <span class="stat-label">Active</span>
        <span class="stat-value amber">{activeCount || '–'}</span>
      </div>
      <div class="stat">
        <span class="stat-label">Errors</span>
        <span class="stat-value" class:red={errorCount > 0}>{errorCount || '–'}</span>
      </div>
      <div class="stat">
        <span class="stat-label">Elapsed</span>
        <span class="stat-value">{elapsed}</span>
      </div>
      <div class="stat" title="{s.totalInputTokens.toLocaleString()} in / {s.totalOutputTokens.toLocaleString()} out">
        <span class="stat-label">Tokens</span>
        <span class="stat-value" style="color:#9e9e9e">{tokenLabel}</span>
      </div>
      {#if job.result}
        <div class="stat">
          <span class="stat-label">Result</span>
          <span class="stat-value" style="color:#888;font-size:0.68rem">{job.result}</span>
        </div>
      {/if}
    </div>
  </div>
{/if}
