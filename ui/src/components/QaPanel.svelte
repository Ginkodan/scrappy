<script lang="ts">
  import { runQa, getQaIssues, updateQaIssue, mergeRows, markNotDuplicate, deleteRecords, patchRecordField, type QaStoredIssue } from '../lib/api';

  const {
    output,
    rows,
    onClose,
    onRecordsChanged,
  }: {
    output: string;
    rows: Record<string, string>[];
    onClose: () => void;
    onRecordsChanged: () => void;
  } = $props();

  let issues    = $state<QaStoredIssue[]>([]);
  let running   = $state(false);
  let loading   = $state(true);
  let error     = $state<string | null>(null);
  let acting    = $state<number | null>(null); // issueId being actioned

  $effect(() => {
    void loadIssues();
  });

  async function loadIssues() {
    loading = true;
    try {
      const res = await getQaIssues(output);
      issues = res.issues;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      loading = false;
    }
  }

  async function handleRunQa() {
    running = true;
    error = null;
    try {
      const res = await runQa(output);
      issues = res.issues;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      running = false;
    }
  }

  async function dismiss(issue: QaStoredIssue) {
    acting = issue.id;
    try {
      await updateQaIssue(output, issue.id, 'dismissed');
      issues = issues.filter(i => i.id !== issue.id);
    } finally { acting = null; }
  }

  async function handleMerge(issue: QaStoredIssue) {
    if (!issue.payload.ids || issue.payload.ids.length < 2) return;
    acting = issue.id;
    try {
      const [keepId, ...removeIds] = issue.payload.ids;
      await mergeRows(output, keepId, removeIds);
      await updateQaIssue(output, issue.id, 'applied');
      issues = issues.filter(i => i.id !== issue.id);
      onRecordsChanged();
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally { acting = null; }
  }

  async function handleNotDuplicate(issue: QaStoredIssue) {
    if (!issue.payload.ids) return;
    acting = issue.id;
    try {
      await markNotDuplicate(output, issue.payload.ids);
      await updateQaIssue(output, issue.id, 'dismissed');
      issues = issues.filter(i => i.id !== issue.id);
    } finally { acting = null; }
  }

  async function handleApplyNormalization(issue: QaStoredIssue) {
    const id = issue.payload.id;
    const field = issue.payload.field;
    const value = issue.payload.suggested;
    if (!id || !field || value === undefined) return;
    acting = issue.id;
    try {
      await patchRecordField(output, id, field, value);
      await updateQaIssue(output, issue.id, 'applied');
      issues = issues.filter(i => i.id !== issue.id);
      onRecordsChanged();
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally { acting = null; }
  }

  async function handleDeleteRecord(issue: QaStoredIssue) {
    if (!issue.payload.id) return;
    acting = issue.id;
    try {
      await deleteRecords(output, [issue.payload.id]);
      await updateQaIssue(output, issue.id, 'applied');
      issues = issues.filter(i => i.id !== issue.id);
      onRecordsChanged();
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally { acting = null; }
  }

  // Look up the primary display value for a record id from current rows
  function recordName(id: number): string {
    const row = rows.find(r => parseInt(r._id) === id);
    if (!row) return `#${id}`;
    const val = Object.entries(row).find(([k, v]) => k !== '_id' && k !== '_dataSource' && k !== '_lastUpdated' && v)?.[1];
    return val ?? `#${id}`;
  }

  const dupes        = $derived(issues.filter(i => i.type === 'fuzzy_dupe'));
  const normalizations = $derived(issues.filter(i => i.type === 'normalization'));
  const outliers     = $derived(issues.filter(i => i.type === 'outlier'));
</script>

<div class="qa-panel">
  <!-- Header -->
  <div class="qa-header">
    <div class="qa-title-row">
      <span class="qa-title">QA Review</span>
      {#if issues.length > 0}
        <span class="qa-count">{issues.length} open</span>
      {/if}
    </div>
    <div class="qa-header-actions">
      <button
        class="qa-run-btn"
        onclick={handleRunQa}
        disabled={running || acting !== null}
      >
        {#if running}
          <span class="spinner-inline"></span> Analyzing…
        {:else}
          <span class="msicon" style="font-size:14px">analytics</span>
          Run QA
        {/if}
      </button>
      <button class="qa-close-btn" onclick={onClose} title="Close QA panel">
        <span class="msicon" style="font-size:18px">close</span>
      </button>
    </div>
  </div>

  <!-- Body -->
  <div class="qa-body">
    {#if error}
      <div class="qa-error">{error}</div>
    {/if}

    {#if loading}
      <div class="qa-empty">Loading…</div>
    {:else if issues.length === 0 && !running}
      <div class="qa-empty">
        {#if !running}
          <span class="msicon" style="font-size:2rem;color:var(--on-surface-muted)">verified</span>
          <p>No open issues. Run QA to check the dataset.</p>
        {/if}
      </div>
    {:else}

      <!-- Fuzzy duplicates -->
      {#if dupes.length > 0}
        <div class="qa-group">
          <div class="qa-group-header">
            <span class="qa-group-label">Possible Duplicates</span>
            <span class="qa-group-count">{dupes.length}</span>
          </div>
          {#each dupes as issue (issue.id)}
            <div class="qa-issue" class:acting={acting === issue.id}>
              <div class="issue-body">
                <div class="issue-records">
                  {#each (issue.payload.ids ?? []) as id}
                    <span class="issue-record-name">{recordName(id)}</span>
                  {/each}
                </div>
                <div class="issue-reason">{issue.payload.reason}</div>
                {#if issue.payload.confidence !== undefined}
                  <div class="issue-confidence">
                    <div class="conf-bar">
                      <div class="conf-fill" style="width:{Math.round((issue.payload.confidence ?? 0) * 100)}%"></div>
                    </div>
                    <span class="conf-label">{Math.round((issue.payload.confidence ?? 0) * 100)}% confidence</span>
                  </div>
                {/if}
              </div>
              <div class="issue-actions">
                <button
                  class="act-btn act-btn--primary"
                  onclick={() => handleMerge(issue)}
                  disabled={acting !== null}
                  title="Merge records (keep first)"
                >Merge</button>
                <button
                  class="act-btn"
                  onclick={() => handleNotDuplicate(issue)}
                  disabled={acting !== null}
                  title="Mark as not duplicates"
                >Not a dupe</button>
              </div>
            </div>
          {/each}
        </div>
      {/if}

      <!-- Normalization issues -->
      {#if normalizations.length > 0}
        <div class="qa-group">
          <div class="qa-group-header">
            <span class="qa-group-label">Normalization</span>
            <span class="qa-group-count">{normalizations.length}</span>
          </div>
          {#each normalizations as issue (issue.id)}
            <div class="qa-issue" class:acting={acting === issue.id}>
              <div class="issue-body">
                <div class="issue-field-row">
                  <span class="issue-field">{issue.field}</span>
                  {#if issue.payload.current && issue.payload.suggested}
                    <span class="issue-value old">{issue.payload.current}</span>
                    <span class="msicon" style="font-size:13px;color:var(--on-surface-muted)">arrow_forward</span>
                    <span class="issue-value new">{issue.payload.suggested}</span>
                  {/if}
                </div>
                <div class="issue-reason">{issue.payload.reason}</div>
              </div>
              <div class="issue-actions">
                {#if issue.payload.suggested}
                  <button
                    class="act-btn act-btn--primary"
                    onclick={() => handleApplyNormalization(issue)}
                    disabled={acting !== null}
                    title="Apply suggested value"
                  >Apply</button>
                {/if}
                <button
                  class="act-btn"
                  onclick={() => dismiss(issue)}
                  disabled={acting !== null}
                >Dismiss</button>
              </div>
            </div>
          {/each}
        </div>
      {/if}

      <!-- Outliers -->
      {#if outliers.length > 0}
        <div class="qa-group">
          <div class="qa-group-header">
            <span class="qa-group-label">Outliers</span>
            <span class="qa-group-count">{outliers.length}</span>
          </div>
          {#each outliers as issue (issue.id)}
            <div class="qa-issue" class:acting={acting === issue.id}>
              <div class="issue-body">
                <div class="issue-field-row">
                  <span class="issue-field">{issue.field}</span>
                  {#if issue.payload.value}
                    <span class="issue-value old">{issue.payload.value}</span>
                  {/if}
                  {#if issue.payload.id}
                    <span class="issue-record-ref">{recordName(issue.payload.id)}</span>
                  {/if}
                </div>
                <div class="issue-reason">{issue.payload.reason}</div>
              </div>
              <div class="issue-actions">
                <button
                  class="act-btn act-btn--danger"
                  onclick={() => handleDeleteRecord(issue)}
                  disabled={acting !== null}
                  title="Delete this record"
                >Delete</button>
                <button
                  class="act-btn"
                  onclick={() => dismiss(issue)}
                  disabled={acting !== null}
                >Dismiss</button>
              </div>
            </div>
          {/each}
        </div>
      {/if}

    {/if}
  </div>
</div>

<style>
  .qa-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    background: var(--surface);
  }

  /* Header */
  .qa-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.5rem 2rem 1rem;
    flex-shrink: 0;
    border-bottom: 1px solid rgba(255,255,255,0.04);
    gap: 1rem;
  }
  .qa-title-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .qa-title {
    font-family: 'Inter', sans-serif;
    font-size: 1.2rem;
    font-weight: 800;
    color: var(--on-surface);
    letter-spacing: -0.02em;
  }
  .qa-count {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.65rem;
    font-weight: 700;
    background: rgba(255,89,10,0.12);
    color: #ff590a;
    border: 1px solid rgba(255,89,10,0.25);
    padding: 0.15rem 0.5rem;
    border-radius: 20px;
    letter-spacing: 0.04em;
  }
  .qa-header-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .qa-run-btn {
    all: unset;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.4rem 0.85rem;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--on-surface);
    background: var(--surface-container);
    border: 1px solid var(--c-border-light);
    border-radius: 2px;
    transition: color 0.15s, background 0.15s, border-color 0.15s;
  }
  .qa-run-btn:hover:not(:disabled) { color: #ff590a; border-color: rgba(255,89,10,0.3); }
  .qa-run-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .qa-close-btn {
    all: unset;
    cursor: pointer;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--on-surface-muted);
    border-radius: 2px;
    transition: color 0.15s, background 0.15s;
  }
  .qa-close-btn:hover { color: var(--on-surface); background: var(--surface-container); }

  /* Body */
  .qa-body {
    flex: 1;
    overflow-y: auto;
    padding: 1rem 2rem 2rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }
  .qa-empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    color: var(--on-surface-muted);
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.75rem;
    padding: 3rem 0;
    text-align: center;
  }
  .qa-error {
    background: rgba(255,180,171,0.08);
    border: 1px solid rgba(255,180,171,0.2);
    color: var(--error);
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.72rem;
    padding: 0.6rem 0.85rem;
    border-radius: 2px;
  }

  /* Issue groups */
  .qa-group {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  .qa-group-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.15rem;
  }
  .qa-group-label {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.58rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--on-surface-muted);
  }
  .qa-group-count {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.6rem;
    color: var(--on-surface-muted);
    background: var(--surface-container);
    padding: 0.05rem 0.35rem;
  }

  /* Individual issue card */
  .qa-issue {
    background: var(--surface-container-low);
    border: 1px solid var(--c-border-light);
    border-radius: 2px;
    padding: 0.75rem 1rem;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    transition: opacity 0.2s;
  }
  .qa-issue.acting { opacity: 0.5; }
  .qa-issue:hover { border-color: var(--c-border); }

  .issue-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  /* Record names for fuzzy_dupe */
  .issue-records {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    align-items: center;
  }
  .issue-record-name {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--on-surface);
    background: var(--surface-container-high);
    padding: 0.15rem 0.45rem;
    border-radius: 2px;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Field row for normalization / outlier */
  .issue-field-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .issue-field {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.7rem;
    color: var(--primary-container);
    background: rgba(255,89,10,0.08);
    padding: 0.1rem 0.4rem;
    border-radius: 2px;
    flex-shrink: 0;
  }
  .issue-value {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.72rem;
    padding: 0.1rem 0.35rem;
    border-radius: 2px;
    max-width: 140px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .issue-value.old {
    color: var(--error);
    background: rgba(255,180,171,0.08);
    text-decoration: line-through;
    opacity: 0.8;
  }
  .issue-value.new {
    color: #34d399;
    background: rgba(52,211,153,0.08);
  }
  .issue-record-ref {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.68rem;
    color: var(--on-surface-muted);
    font-style: italic;
  }

  .issue-reason {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.7rem;
    color: var(--on-surface-muted);
    line-height: 1.5;
  }

  /* Confidence bar */
  .issue-confidence {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.1rem;
  }
  .conf-bar {
    width: 60px;
    height: 2px;
    background: rgba(255,255,255,0.06);
    flex-shrink: 0;
  }
  .conf-fill {
    height: 100%;
    background: #ff590a;
    transition: width 0.3s ease;
  }
  .conf-label {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.62rem;
    color: var(--on-surface-muted);
  }

  /* Action buttons */
  .issue-actions {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    flex-shrink: 0;
  }
  .act-btn {
    all: unset;
    cursor: pointer;
    padding: 0.3rem 0.7rem;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.62rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--on-surface-muted);
    background: var(--surface-container);
    border: 1px solid var(--c-border-light);
    border-radius: 2px;
    text-align: center;
    transition: color 0.15s, border-color 0.15s, background 0.15s;
    white-space: nowrap;
  }
  .act-btn:hover:not(:disabled) { color: var(--on-surface); background: var(--surface-container-high); }
  .act-btn:disabled { opacity: 0.35; cursor: not-allowed; }
  .act-btn--primary:hover:not(:disabled) { color: #ff590a; border-color: rgba(255,89,10,0.3); }
  .act-btn--danger:hover:not(:disabled) { color: #ef4444; border-color: rgba(239,68,68,0.3); }

  /* Inline spinner */
  .spinner-inline {
    display: inline-block;
    width: 9px;
    height: 9px;
    border: 1.5px solid currentColor;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    flex-shrink: 0;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
