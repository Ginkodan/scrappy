<script lang="ts">
  import IndexTab from './tabs/IndexTab.svelte';
  import UpdateTab from './tabs/UpdateTab.svelte';
  import TestTab from './tabs/TestTab.svelte';
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

  let activeTab = $state<'index' | 'update' | 'test' | 'schemas'>('index');
  let datasets = $state<string[]>(initialOutputs);
  let selectedDataset = $state<string | null>(null);
  let recordsTick = $state(0);

  // Keep datasets in sync with parent outputs prop
  $effect(() => { datasets = initialOutputs; });

  async function refreshDatasets() {
    const { outputs } = await getOutputs();
    datasets = outputs;
    onSelectsReload();
  }

  function openDataset(name: string) {
    selectedDataset = name;
    recordsTick++;
  }

  async function handleDelete(name: string) {
    if (!confirm(`Delete dataset "${name}"? This cannot be undone.`)) return;
    await deleteOutput(name);
    if (selectedDataset === name) selectedDataset = null;
    await refreshDatasets();
  }
</script>

<div class="scrape-layout">
  <!-- Left: forms + datasets -->
  <div class="scrape-left">
    <div class="card">
      <div class="tabs">
        {#each (['index', 'update', 'test', 'schemas'] as const) as tab}
          <div class="tab" class:active={activeTab === tab} onclick={() => activeTab = tab}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </div>
        {/each}
      </div>
      <div class="panel" class:active={activeTab === 'index'}>
        <IndexTab {schemas} />
      </div>
      <div class="panel" class:active={activeTab === 'update'}>
        <UpdateTab {schemas} outputs={datasets} />
      </div>
      <div class="panel" class:active={activeTab === 'test'}>
        <TestTab {schemas} />
      </div>
      <div class="panel" class:active={activeTab === 'schemas'}>
        <SchemasTab {onSchemaEdit} {onNewSchema} {onSelectsReload} />
      </div>
    </div>

    <!-- Datasets -->
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.6rem">
        <div class="section-title" style="margin-bottom:0">Datasets</div>
        <button class="refresh-btn" onclick={refreshDatasets} title="Refresh">↺</button>
      </div>
      {#if datasets.length === 0}
        <div class="empty">No datasets yet.</div>
      {:else}
        <div class="dataset-list">
          {#each datasets as name (name)}
            <div class="dataset-row" class:selected={selectedDataset === name}>
              <button class="dataset-name" onclick={() => openDataset(name)}>{name}</button>
              <div class="dataset-actions">
                <a class="dl-link" href="/outputs/{name}" title="Download CSV">↓</a>
                <button class="del-btn" onclick={() => handleDelete(name)} title="Delete">✕</button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  <!-- Right: records -->
  <div class="scrape-right">
    {#if selectedDataset}
      <RecordsTab file={selectedDataset} refreshTick={recordsTick} />
    {:else if dashStore.recordsFile}
      <RecordsTab file={dashStore.recordsFile} refreshTick={dashStore.recordsRefreshTick} />
    {:else}
      <div class="dash-empty">Select a dataset to view records</div>
    {/if}
  </div>
</div>

<style>
  .scrape-layout {
    display: grid;
    grid-template-columns: 320px 1fr;
    gap: 1.25rem;
  }
  .scrape-left {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    min-width: 0;
  }
  .scrape-right {
    min-width: 0;
    overflow: hidden;
  }

  .dataset-list {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .dataset-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.35rem 0.5rem;
    border: 1px solid #1a1a1a;
    border-radius: 4px;
    background: #0d0d0d;
    transition: border-color 0.15s;
  }
  .dataset-row:hover { border-color: #2a2a2a; }
  .dataset-row.selected { border-color: #00bcd4; }

  .dataset-name {
    all: unset;
    cursor: pointer;
    font-size: 0.78rem;
    font-family: monospace;
    color: #bbb;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .dataset-name:hover { color: #00bcd4; }

  .dataset-actions {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex-shrink: 0;
  }
  .dl-link {
    font-size: 0.72rem;
    color: #444;
    text-decoration: none;
    transition: color 0.15s;
  }
  .dl-link:hover { color: #00bcd4; }
  .del-btn {
    all: unset;
    cursor: pointer;
    font-size: 0.75rem;
    color: #333;
    line-height: 1;
    transition: color 0.15s;
  }
  .del-btn:hover { color: #ef5350; }

  .refresh-btn {
    all: unset;
    cursor: pointer;
    font-size: 0.85rem;
    color: #444;
    transition: color 0.15s;
  }
  .refresh-btn:hover { color: #aaa; }
</style>
