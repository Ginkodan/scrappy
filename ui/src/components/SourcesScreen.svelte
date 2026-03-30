<script lang="ts">
  import { getEntities, getEntityRecords, startUpdateJob, saveEntity, deleteEntity } from '../lib/api';
  import { jobsStore } from '../stores/jobs.svelte';
  import type { Entity, EntityDataset } from '../lib/types';
  import { timeAgo } from '../lib/format';

  let entities     = $state<Entity[]>([]);
  let selectedKey  = $state<string | null>(null);
  let loading      = $state(true);
  let search       = $state('');
  let statusFilter = $state<'all' | 'active' | 'idle' | 'error'>('all');

  // Detail state
  let datasets      = $state<EntityDataset[]>([]);
  let detailLoading = $state(false);
  let updating      = $state(false);

  // Edit state
  let editing  = $state(false);
  let editName = $state('');
  let editDesc = $state('');
  let editUrl  = $state('');
  let saving   = $state(false);

  const selected = $derived(entities.find(e => e.normalized_name === selectedKey) ?? null);

  const filteredEntities = $derived((() => {
    let list = entities;
    if (search.trim()) {
      list = list.filter(e => e.display_name.toLowerCase().includes(search.toLowerCase()));
    }
    if (statusFilter !== 'all') {
      list = list.filter(e => entityStatus(e) === statusFilter);
    }
    return list;
  })());

  function entityStatus(e: Entity): 'active' | 'idle' | 'error' {
    const jobs = jobsStore.jobs;
    for (const ds of e.datasets) {
      if (jobs.find(j => (j.params.input === ds || j.params.output === ds) && j.status === 'running')) return 'active';
      if (jobs.find(j => (j.params.input === ds || j.params.output === ds) && j.status === 'failed')) return 'error';
    }
    return 'idle';
  }

  function lastUpdated(e: Entity): string {
    const jobs = jobsStore.jobs.filter(j =>
      e.datasets.some(ds => j.params.input === ds || j.params.output === ds)
    );
    if (!jobs.length) return '—';
    const latest = jobs.reduce((a, b) => a.startedAt > b.startedAt ? a : b);
    return timeAgo(latest.startedAt);
  }

  async function load() {
    loading = true;
    try {
      const res = await getEntities();
      entities = res.entities;
    } finally {
      loading = false;
    }
  }

  async function selectEntity(key: string) {
    selectedKey = key;
    editing = false;
    detailLoading = true;
    datasets = [];
    try {
      const res = await getEntityRecords(key);
      datasets = res.datasets;
    } finally {
      detailLoading = false;
    }
    const e = entities.find(en => en.normalized_name === key);
    if (e) {
      editName = e.display_name;
      editDesc = e.description ?? '';
      editUrl  = e.external_url ?? '';
    }
  }

  async function handleUpdate() {
    if (!selected) return;
    updating = true;
    try {
      await Promise.all(
        datasets
          .filter(ds => ds.schema_id)
          .map(ds => startUpdateJob({ input: ds.dataset, schema: ds.schema_id! }))
      );
      await jobsStore.refresh();
    } finally {
      updating = false;
    }
  }

  async function handleSave() {
    if (!selected) return;
    saving = true;
    try {
      await saveEntity(selected.normalized_name, {
        display_name: editName,
        description: editDesc || undefined,
        external_url: editUrl || undefined,
      });
      await load();
      editing = false;
    } finally {
      saving = false;
    }
  }

  async function handleDelete() {
    if (!selected || !confirm(`Delete source "${selected.display_name}"?`)) return;
    await deleteEntity(selected.normalized_name);
    selectedKey = null;
    datasets = [];
    await load();
  }

  const allRecords = $derived(datasets.flatMap(ds => ds.records));

  const ICONS = ['trending_up', 'currency_exchange', 'account_balance_wallet', 'shield', 'storefront'];

  load();
</script>

<div class="sources-root">

  <!-- Left: provider list -->
  <div class="list-col">

    <div class="list-header">
      <div class="list-header-top">
        <div>
          <span class="eyebrow">Provider Index</span>
          <h1 class="page-title">Source Management</h1>
        </div>
        <select class="filter-select" bind:value={statusFilter}>
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="idle">Idle</option>
          <option value="error">Error</option>
        </select>
      </div>
      <div class="search-wrap">
        <span class="msicon search-icon">search</span>
        <input class="search-input" placeholder="Search providers..." bind:value={search} />
      </div>
    </div>

    <div class="table-head">
      <div class="col-url">Source</div>
      <div class="col-provider">Provider</div>
      <div class="col-status">Status</div>
      <div class="col-updated">Updated</div>
    </div>

    <div class="table-body">
      {#if loading}
        <div class="list-empty">Loading…</div>
      {:else if filteredEntities.length === 0}
        <div class="list-empty">
          {entities.length === 0
            ? 'No sources yet — add an entity_field to a schema to start tracking providers'
            : 'No matches for current filter'}
        </div>
      {:else}
        {#each filteredEntities as entity (entity.normalized_name)}
          {@const status = entityStatus(entity)}
          <button
            class="source-row"
            class:active={selectedKey === entity.normalized_name}
            onclick={() => selectEntity(entity.normalized_name)}
          >
            <div class="col-url">
              <span class="msicon" style="font-size:14px;color:var(--on-surface-muted);flex-shrink:0">link</span>
              <span class="url-text">{entity.external_url || entity.display_name}</span>
            </div>
            <div class="col-provider">{entity.display_name}</div>
            <div class="col-status">
              {#if status === 'active'}
                <span class="status-pill active"><span class="pill-dot pulse"></span>Active</span>
              {:else if status === 'error'}
                <span class="status-pill error"><span class="pill-dot"></span>Error</span>
              {:else}
                <span class="status-pill idle"><span class="pill-dot"></span>Idle</span>
              {/if}
            </div>
            <div class="col-updated">{lastUpdated(entity)}</div>
          </button>
        {/each}
      {/if}
    </div>
  </div>

  <!-- Right: detail pane -->
  {#if selected}
    <div class="detail-col">
      <div class="glass-card">

        <div class="card-hero">
          <div class="card-hero-content">
            <span class="eyebrow">Currently Inspecting</span>
            {#if editing}
              <input class="edit-name-input" bind:value={editName} />
            {:else}
              <h2 class="provider-name">{selected.display_name}</h2>
            {/if}
          </div>
          <div class="card-hero-actions">
            {#if editing}
              <button class="icon-btn" onclick={handleSave} disabled={saving}>
                <span class="msicon">check</span>
              </button>
              <button class="icon-btn" onclick={() => editing = false}>
                <span class="msicon">close</span>
              </button>
            {:else}
              <button class="icon-btn" onclick={() => editing = true}>
                <span class="msicon">edit</span>
              </button>
              <button class="icon-btn danger" onclick={handleDelete}>
                <span class="msicon">delete</span>
              </button>
            {/if}
          </div>
        </div>

        <div class="card-body">
          <div class="meta-grid">
            <div class="meta-item">
              <span class="meta-label">Provider URL</span>
              {#if editing}
                <input class="edit-input" bind:value={editUrl} placeholder="https://…" />
              {:else}
                <span class="meta-value">{selected.external_url || '—'}</span>
              {/if}
            </div>
            <div class="meta-item">
              <span class="meta-label">Datasets</span>
              <span class="meta-value">{selected.datasets.join(', ') || '—'}</span>
            </div>
          </div>

          <div>
            <span class="section-label">Description</span>
            {#if editing}
              <textarea class="edit-textarea" bind:value={editDesc} placeholder="Describe this provider…" rows="3"></textarea>
            {:else}
              <p class="desc-text">{selected.description || 'No description yet.'}</p>
            {/if}
          </div>

          <div>
            <div class="products-header">
              <span class="section-label" style="margin-bottom:0">Products / Records Indexed</span>
              <span class="products-count">{allRecords.length} records</span>
            </div>

            {#if detailLoading}
              <div class="products-empty">Loading…</div>
            {:else if allRecords.length === 0}
              <div class="products-empty">No records indexed yet</div>
            {:else}
              <div class="products-list">
                {#each allRecords.slice(0, 8) as record, i}
                  {@const values = Object.values(record).filter((v): v is string => typeof v === 'string' && v.length > 0 && v.length < 60)}
                  <div class="product-row">
                    <span class="msicon" style="font-size:16px;color:#ff590a">{ICONS[i % ICONS.length]}</span>
                    <span class="product-name">{values[0] ?? '—'}</span>
                    <span class="msicon product-chevron">chevron_right</span>
                  </div>
                {/each}
                {#if allRecords.length > 8}
                  <div class="products-more">+{allRecords.length - 8} more records</div>
                {/if}
              </div>
            {/if}
          </div>

          <div class="card-actions">
            <button class="action-btn primary" onclick={handleUpdate} disabled={updating}>
              {updating ? 'Updating…' : 'Update Source'}
            </button>
            <button class="action-btn secondary" onclick={handleUpdate} disabled={updating}>
              Force Refresh
            </button>
          </div>
        </div>
      </div>
    </div>
  {:else}
    <div class="detail-col detail-empty">
      <span class="msicon" style="font-size:3rem;color:var(--on-surface-muted)">corporate_fare</span>
      <p>Select a source provider to inspect</p>
    </div>
  {/if}
</div>

<style>
  .sources-root {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: 1fr 460px;
    overflow: hidden;
  }

  .list-col {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-right: 1px solid rgba(255,255,255,0.04);
  }

  .list-header {
    padding: 2rem 2rem 1rem;
    flex-shrink: 0;
  }
  .list-header-top {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  .eyebrow {
    display: block;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--primary-container);
    margin-bottom: 0.3rem;
  }
  .page-title {
    font-family: 'Inter', sans-serif;
    font-size: 1.75rem;
    font-weight: 800;
    color: var(--on-surface);
    letter-spacing: -0.03em;
    margin: 0;
  }
  .filter-select {
    background: var(--surface-container);
    border: none;
    outline: none;
    color: var(--on-surface);
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.65rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 0.45rem 0.75rem;
    cursor: pointer;
    appearance: none;
    flex-shrink: 0;
  }

  .search-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }
  .search-icon {
    position: absolute;
    left: 0.75rem;
    font-size: 16px;
    color: var(--on-surface-muted);
    pointer-events: none;
  }
  .search-input {
    width: 100%;
    background: var(--surface-container-low);
    border: none;
    outline: none;
    color: var(--on-surface);
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.72rem;
    padding: 0.55rem 0.75rem 0.55rem 2.25rem;
  }
  .search-input::placeholder { color: var(--on-surface-muted); }

  .table-head {
    display: grid;
    grid-template-columns: 1fr 160px 100px 80px;
    padding: 0.5rem 1.5rem;
    border-top: 1px solid rgba(255,255,255,0.04);
    border-bottom: 1px solid rgba(255,255,255,0.04);
    flex-shrink: 0;
  }
  .table-head > div {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.58rem;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--on-surface-muted);
  }

  .table-body { flex: 1; overflow-y: auto; }
  .list-empty {
    padding: 3rem 2rem;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.75rem;
    color: var(--on-surface-muted);
    text-align: center;
    line-height: 1.8;
  }

  .source-row {
    all: unset;
    display: grid;
    grid-template-columns: 1fr 160px 100px 80px;
    align-items: center;
    padding: 1rem 1.5rem;
    cursor: pointer;
    border-left: 4px solid transparent;
    border-bottom: 1px solid rgba(255,255,255,0.02);
    background: var(--surface-container);
    width: 100%;
    box-sizing: border-box;
    transition: background 0.15s, border-color 0.15s;
  }
  .source-row:hover { background: var(--surface-container-high); }
  .source-row.active { background: var(--surface-container-highest); border-left-color: #ff590a; }

  .col-url {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
  }
  .url-text {
    font-size: 0.75rem;
    color: var(--on-surface);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    transition: color 0.15s;
  }
  .source-row:hover .url-text,
  .source-row.active .url-text { color: #ff590a; }

  .col-provider {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.72rem;
    color: var(--on-surface-muted);
  }
  .col-status { display: flex; }
  .col-updated {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.65rem;
    color: var(--on-surface-muted);
    text-align: right;
  }

  .status-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.2rem 0.5rem;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    border-radius: 999px;
  }
  .status-pill.active { background: rgba(255,89,10,0.1); border: 1px solid rgba(255,89,10,0.2); color: #ff590a; }
  .status-pill.idle   { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: var(--on-surface-muted); }
  .status-pill.error  { background: rgba(147,0,10,0.15); border: 1px solid rgba(255,180,171,0.2); color: var(--error); }
  .pill-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
  .pill-dot.pulse { animation: blink 1.4s ease-in-out infinite; }
  @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.2; } }

  /* Detail column */
  .detail-col {
    overflow-y: auto;
    padding: 1.5rem;
    background: var(--surface-container-low);
  }
  .detail-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    color: var(--on-surface-muted);
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.75rem;
  }

  .glass-card {
    background: rgba(31,31,31,0.7);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255,255,255,0.05);
    overflow: hidden;
  }

  .card-hero {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    padding: 1.75rem;
    background: var(--surface-container-low);
    border-bottom: 1px solid rgba(255,255,255,0.04);
    gap: 1rem;
  }
  .provider-name {
    font-family: 'Inter', sans-serif;
    font-size: 1.75rem;
    font-weight: 800;
    color: var(--on-surface);
    letter-spacing: -0.03em;
    margin: 0;
  }
  .edit-name-input {
    background: var(--surface-container);
    border: none;
    border-bottom: 1px solid rgba(255,89,10,0.5);
    outline: none;
    color: var(--on-surface);
    font-family: 'Inter', sans-serif;
    font-size: 1.5rem;
    font-weight: 700;
    padding: 0.25rem 0;
    width: 100%;
    letter-spacing: -0.02em;
  }
  .card-hero-actions { display: flex; gap: 0.4rem; flex-shrink: 0; }
  .icon-btn {
    all: unset;
    cursor: pointer;
    display: flex;
    align-items: center;
    padding: 0.4rem;
    background: var(--surface-container-highest);
    border: 1px solid rgba(255,255,255,0.08);
    color: var(--on-surface);
    transition: border-color 0.15s, color 0.15s;
  }
  .icon-btn:hover { border-color: var(--primary-container); color: #ff590a; }
  .icon-btn.danger:hover { border-color: var(--error); color: var(--error); }
  .icon-btn:disabled { opacity: 0.4; pointer-events: none; }

  .card-body { padding: 1.5rem 1.75rem; display: flex; flex-direction: column; gap: 1.5rem; }

  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .meta-item { display: flex; flex-direction: column; gap: 0.3rem; }
  .meta-label {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.58rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--on-surface-muted);
  }
  .meta-value {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.75rem;
    color: var(--on-surface);
    word-break: break-all;
  }
  .edit-input {
    background: transparent;
    border: none;
    border-bottom: 1px solid rgba(255,89,10,0.4);
    outline: none;
    color: var(--on-surface);
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.75rem;
    padding: 0.25rem 0;
    width: 100%;
  }

  .section-label {
    display: block;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.58rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--on-surface-muted);
    margin-bottom: 0.5rem;
  }
  .desc-text {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.78rem;
    color: var(--on-surface-muted);
    line-height: 1.65;
    margin: 0;
    font-weight: 300;
  }
  .edit-textarea {
    background: var(--surface-container);
    border: 1px solid rgba(255,89,10,0.3);
    outline: none;
    color: var(--on-surface);
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.75rem;
    padding: 0.6rem 0.75rem;
    width: 100%;
    resize: vertical;
    line-height: 1.5;
    box-sizing: border-box;
  }

  .products-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.75rem;
  }
  .products-count {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.6rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #ff590a;
  }
  .products-empty {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.72rem;
    color: var(--on-surface-muted);
    padding: 0.5rem 0;
  }
  .products-list { display: flex; flex-direction: column; gap: 0.35rem; }
  .product-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.65rem 0.75rem;
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.05);
    transition: border-color 0.15s;
  }
  .product-row:hover { border-color: rgba(255,255,255,0.1); }
  .product-name {
    flex: 1;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.75rem;
    color: var(--on-surface);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .product-chevron { font-size: 16px; color: var(--on-surface-muted); }
  .products-more {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.65rem;
    color: var(--on-surface-muted);
    text-align: center;
    padding: 0.4rem;
    font-style: italic;
  }

  .card-actions { display: flex; gap: 0.75rem; }
  .action-btn {
    all: unset;
    cursor: pointer;
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.75rem 1rem;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    transition: opacity 0.15s, box-shadow 0.15s;
  }
  .action-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .action-btn.primary { background: var(--primary-container); color: var(--on-primary-fixed); }
  .action-btn.primary:not(:disabled):hover { box-shadow: 0 0 20px rgba(255,89,10,0.3); }
  .action-btn.secondary { background: var(--surface-container-highest); border: 1px solid rgba(255,255,255,0.08); color: var(--on-surface); }
  .action-btn.secondary:not(:disabled):hover { border-color: rgba(255,255,255,0.2); }
</style>
