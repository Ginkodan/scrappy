<script lang="ts">
  import IndexTab from './tabs/IndexTab.svelte';
  import UpdateTab from './tabs/UpdateTab.svelte';
  import SchemasTab from './tabs/SchemasTab.svelte';
  import RecordsTab from './RecordsTab.svelte';
  import { dashStore } from '../stores/dashboard.svelte';
  import { getOutputs, deleteOutput } from '../lib/api';

  const {
    schemas,
    outputs: initialOutputs,
    onSchemaEdit,
    onNewSchema,
    onSelectsReload,
  }: {
    schemas: Array<{ id: string; display_name: string }>;
    outputs: string[];
    onSchemaEdit: (id: string) => void;
    onNewSchema: () => void;
    onSelectsReload: () => void;
  } = $props();

  let datasets = $state<string[]>(initialOutputs);
  let selectedDataset = $state<string | null>(null);
  let recordsTick = $state(0);
  let activePanel = $state<'index' | 'update' | 'schemas' | null>(null);

  $effect(() => { datasets = initialOutputs; });

  async function refreshDatasets() {
    const { outputs } = await getOutputs();
    datasets = outputs;
    onSelectsReload();
  }

  function openDataset(name: string) {
    selectedDataset = name;
    recordsTick++;
    activePanel = null;
  }

  function togglePanel(panel: 'index' | 'update' | 'schemas') {
    activePanel = activePanel === panel ? null : panel;
  }

  async function handleDelete(name: string) {
    if (!confirm(`Delete dataset "${name}"?`)) return;
    await deleteOutput(name);
    if (selectedDataset === name) selectedDataset = null;
    await refreshDatasets();
  }

  function onJobStarted() {
    activePanel = null;
  }

  const activeFile = $derived(selectedDataset ?? dashStore.recordsFile ?? null);
</script>

<!-- Dataset + action bar -->
<div class="top-bar">
  <div class="dataset-select-wrap">
    <select
      class="dataset-select"
      value={activeFile ?? ''}
      onchange={(e) => { const v = (e.target as HTMLSelectElement).value; if (v) openDataset(v); }}
    >
      {#if datasets.length === 0}
        <option value="">(no datasets yet)</option>
      {:else}
        <option value="">— select dataset —</option>
        {#each datasets as name (name)}
          <option value={name}>{name}</option>
        {/each}
      {/if}
    </select>
    {#if activeFile}
      <a class="ds-btn" href="/outputs/{activeFile}" title="Download CSV">↓</a>
      <button class="ds-btn del" onclick={() => handleDelete(activeFile!)} title="Delete dataset">✕</button>
    {/if}
  </div>

  <div class="action-btns">
    <button
      class="action-btn" class:active={activePanel === 'index'}
      onclick={() => togglePanel('index')} title="New index job"
    >+ Index</button>
    <button
      class="action-btn" class:active={activePanel === 'update'}
      onclick={() => togglePanel('update')} title="Update data"
    >↻ Update</button>
    <button
      class="action-btn" class:active={activePanel === 'schemas'}
      onclick={() => togglePanel('schemas')} title="Manage schemas"
    >⚙ Schemas</button>
    <button class="action-btn icon" onclick={refreshDatasets} title="Refresh datasets">↺</button>
  </div>
</div>

<!-- Inline panel -->
{#if activePanel}
  <div class="inline-panel">
    {#if activePanel === 'index'}
      <IndexTab {schemas} onStarted={onJobStarted} />
    {:else if activePanel === 'update'}
      <UpdateTab {schemas} outputs={datasets} onStarted={onJobStarted} />
    {:else if activePanel === 'schemas'}
      <SchemasTab {onSchemaEdit} {onNewSchema} {onSelectsReload} />
    {/if}
  </div>
{/if}

<!-- Records — full width -->
<div class="records-area">
  {#if activeFile}
    <RecordsTab file={activeFile} refreshTick={activeFile === selectedDataset ? recordsTick : dashStore.recordsRefreshTick} />
  {:else}
    <div class="dash-empty" style="height:300px">Select a dataset above to view records</div>
  {/if}
</div>

<style>
  .top-bar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
    min-width: 0;
  }

  .dataset-select-wrap {
    display: flex;
    align-items: center;
    gap: 0;
    flex: 1;
    min-width: 0;
    border: 1px solid #1e1e1e;
    border-radius: 4px;
    background: #0d0d0d;
    max-width: 320px;
  }

  .dataset-select {
    all: unset;
    flex: 1;
    min-width: 0;
    font-size: 0.75rem;
    font-family: monospace;
    color: #888;
    padding: 0.28rem 0.5rem;
    cursor: pointer;
    background: transparent;
    appearance: auto;
    -webkit-appearance: auto;
  }
  .dataset-select:focus { outline: none; color: #ccc; }

  .ds-btn {
    all: unset;
    cursor: pointer;
    font-size: 0.7rem;
    color: #666;
    padding: 0.28rem 0.35rem;
    text-decoration: none;
    transition: color 0.15s;
    border-left: 1px solid #1a1a1a;
    line-height: 1;
  }
  .ds-btn:hover { color: #aaa; }
  .ds-btn.del:hover { color: #ef5350; }

  .action-btns {
    display: flex;
    gap: 0.35rem;
    flex-shrink: 0;
  }

  .action-btn {
    all: unset;
    cursor: pointer;
    font-size: 0.72rem;
    color: #888;
    border: 1px solid #2a2a2a;
    border-radius: 4px;
    padding: 0.3rem 0.6rem;
    background: #0d0d0d;
    white-space: nowrap;
    transition: color 0.15s, border-color 0.15s, background 0.15s;
  }
  .action-btn:hover { color: #ccc; border-color: #444; }
  .action-btn.active { color: #00bcd4; border-color: #00bcd4; background: #001a1f; }
  .action-btn.icon { padding: 0.3rem 0.5rem; }

  .inline-panel {
    background: #0a0a0a;
    border: 1px solid #1e1e1e;
    border-radius: 6px;
    padding: 1rem 1.25rem;
    margin-bottom: 0.75rem;
  }

  .records-area {
    min-width: 0;
  }
</style>
