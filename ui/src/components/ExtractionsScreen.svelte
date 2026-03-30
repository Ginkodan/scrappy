<script lang="ts">
  import { jobsStore } from '../stores/jobs.svelte';
  import { deleteOutput } from '../lib/api';
  import ExtractionDetailScreen from './ExtractionDetailScreen.svelte';

  const {
    outputs,
    selectedOutput = null,
    onSelectOutput,
    onDeleted,
  }: {
    outputs: string[];
    selectedOutput?: string | null;
    onSelectOutput: (output: string) => void;
    onDeleted: (output: string) => void;
  } = $props();

  let deleting = $state<string | null>(null);

  async function handleDelete(name: string, e: MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Delete extraction "${name}"? This cannot be undone.`)) return;
    deleting = name;
    try {
      await deleteOutput(name);
      onDeleted(name);
    } finally {
      deleting = null;
    }
  }

  // Find the most relevant job for each output
  function jobForOutput(name: string) {
    return (
      jobsStore.jobs.find(j =>
        (j.params.output === name || j.params.input === name) && j.status === 'running'
      ) ??
      jobsStore.jobs.find(j =>
        j.params.output === name || j.params.input === name
      ) ??
      null
    );
  }

  function statusOf(name: string) {
    const j = jobForOutput(name);
    if (!j) return 'idle';
    return j.status;
  }
</script>

<div class="extractions-root">
  <!-- Left sidebar -->
  <aside class="ex-sidebar">
    <div class="sidebar-head">
      <span class="sidebar-title">Extractions</span>
      <span class="sidebar-count">{outputs.length}</span>
    </div>

    <div class="ex-list">
      {#if outputs.length === 0}
        <div class="ex-empty">No extractions yet</div>
      {:else}
        {#each outputs as name (name)}
          {@const status = statusOf(name)}
          <div
            class="ex-item"
            class:active={name === selectedOutput}
            role="button"
            tabindex="0"
            onclick={() => onSelectOutput(name)}
            onkeydown={(e) => e.key === 'Enter' && onSelectOutput(name)}
          >
            <div class="ex-item-icon">
              <span class="msicon" style="font-size:16px">dataset</span>
            </div>
            <div class="ex-item-info">
              <span class="ex-item-name">{name}</span>
              <span class="ex-item-status" class:running={status === 'running'}>
                {#if status === 'running'}
                  <span class="running-dot"></span>
                {/if}
                {status}
              </span>
            </div>
            <button
              class="ex-delete-btn"
              onclick={(e) => handleDelete(name, e)}
              disabled={deleting === name || status === 'running'}
              title="Delete extraction"
            >
              <span class="msicon" style="font-size:14px">{deleting === name ? 'hourglass_empty' : 'delete'}</span>
            </button>
          </div>
        {/each}
      {/if}
    </div>
  </aside>

  <!-- Detail area -->
  <div class="ex-detail">
    {#if selectedOutput}
      {#key selectedOutput}
        <ExtractionDetailScreen
          output={selectedOutput}
          jobId={jobForOutput(selectedOutput)?.id ?? null}
        />
      {/key}
    {:else}
      <div class="ex-placeholder">
        <span class="msicon" style="font-size:3rem;color:var(--on-surface-muted)">dataset</span>
        <p>Select an extraction to view results</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .extractions-root {
    display: flex;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  /* Sidebar */
  .ex-sidebar {
    width: 220px;
    flex-shrink: 0;
    background: var(--surface-container-low);
    border-right: 1px solid var(--c-border-light);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .sidebar-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.5rem 1.25rem 0.75rem;
    flex-shrink: 0;
  }
  .sidebar-title {
    font-family: 'Inter', sans-serif;
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--on-surface);
    letter-spacing: -0.01em;
  }
  .sidebar-count {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.65rem;
    color: var(--on-surface-muted);
    background: var(--surface-container);
    padding: 0.1rem 0.45rem;
  }

  .ex-list {
    flex: 1;
    overflow-y: auto;
    padding: 0.25rem 0.5rem;
  }
  .ex-empty {
    padding: 1.5rem 1rem;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.68rem;
    color: var(--on-surface-muted);
    text-align: center;
  }

  .ex-item {
    all: unset;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.65rem;
    padding: 0.6rem 0.75rem;
    width: 100%;
    box-sizing: border-box;
    border-radius: 2px;
    transition: background 0.12s;
  }
  .ex-item:hover { background: var(--surface-container); }
  .ex-item.active {
    background: var(--surface-container-high);
    border-left: 2px solid #ff590a;
    padding-left: calc(0.75rem - 2px);
  }

  .ex-delete-btn {
    all: unset;
    cursor: pointer;
    color: var(--on-surface-muted);
    display: flex;
    align-items: center;
    padding: 0.2rem;
    opacity: 0;
    flex-shrink: 0;
    transition: color 0.15s, opacity 0.15s;
  }
  .ex-item:hover .ex-delete-btn { opacity: 1; }
  .ex-delete-btn:hover { color: #ef4444; }
  .ex-delete-btn:disabled { opacity: 0.3; cursor: not-allowed; }

  .ex-item-icon {
    color: var(--on-surface-muted);
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }
  .ex-item.active .ex-item-icon { color: #ff590a; }

  .ex-item-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }
  .ex-item-name {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.72rem;
    font-weight: 500;
    color: var(--on-surface);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .ex-item-status {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.58rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--on-surface-muted);
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }
  .ex-item-status.running { color: #ff590a; }

  .running-dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: #ff590a;
    animation: blink 1.2s ease-in-out infinite;
    flex-shrink: 0;
  }
  @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.2; } }

  /* Detail area */
  .ex-detail {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .ex-placeholder {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    color: var(--on-surface-muted);
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.75rem;
  }
</style>
