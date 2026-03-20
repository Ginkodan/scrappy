<script lang="ts">
  import { getRecords } from '../lib/api';

  const { outputs }: { outputs: string[] } = $props();

  let selectedDataset = $state<string | null>(outputs[0] ?? null);
  let headers = $state<string[]>([]);
  let rows = $state<Record<string, unknown>[]>([]);
  let loading = $state(false);
  let error = $state<string | null>(null);

  function cellClass(h: string): string {
    if (h === '_dataSource') return 'col-source';
    if (h === '_lastUpdated') return 'col-date';
    if (h.startsWith('_')) return 'col-system';
    return 'col-data';
  }

  function rowClass(row: Record<string, unknown>): string {
    const src = String(row['_dataSource'] ?? '');
    if (src === 'comparison') return 'row-changed';
    return '';
  }

  $effect(() => {
    if (!selectedDataset) return;
    loading = true;
    error = null;
    getRecords(selectedDataset).then(data => {
      headers = data.headers ?? [];
      rows = data.rows ?? [];
      loading = false;
    }).catch(e => {
      error = String(e);
      loading = false;
    });
  });

  function handleSelectDataset(name: string) {
    selectedDataset = name;
  }
</script>

<div class="ds-root">
  <div class="ds-layout">

    <!-- Sidebar -->
    <aside class="ds-sidebar">
      <div class="ds-sidebar-header">Datasets</div>
      {#if outputs.length === 0}
        <div class="ds-sidebar-empty">No datasets yet</div>
      {:else}
        {#each outputs as name (name)}
          <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
          <div
            class="ds-card"
            class:ds-card--active={selectedDataset === name}
            onclick={() => handleSelectDataset(name)}
          >
            <div class="ds-card-icon">{name.slice(0,2).toUpperCase()}</div>
            <div class="ds-card-name">{name}</div>
          </div>
        {/each}
      {/if}
    </aside>

    <!-- Main -->
    <div class="ds-main">
      {#if !selectedDataset}
        <div class="ds-empty">Select a dataset from the sidebar</div>
      {:else}
        <!-- Top bar -->
        <div class="ds-topbar">
          <div class="ds-topbar-left">
            <div class="ds-topbar-icon">{selectedDataset.slice(0,2).toUpperCase()}</div>
            <div>
              <div class="ds-topbar-name">{selectedDataset}</div>
              <div class="ds-topbar-meta">{rows.length} records</div>
            </div>
          </div>
          <div class="ds-topbar-actions">
            <div class="change-legend">
              <div class="legend-item"><div class="legend-dot ld-new"></div> Official</div>
              <div class="legend-item"><div class="legend-dot ld-changed"></div> Comparison</div>
            </div>
            <a class="ds-btn" href="/outputs/{selectedDataset}" download>↓ Export CSV</a>
          </div>
        </div>

        <!-- Table -->
        {#if loading}
          <div class="ds-empty">Loading…</div>
        {:else if error}
          <div class="ds-empty ds-empty--error">{error}</div>
        {:else if rows.length === 0}
          <div class="ds-empty">No records in this dataset yet</div>
        {:else}
          <div class="ds-table-wrap">
            <table class="ds-table">
              <thead>
                <tr>
                  {#each headers as h}
                    <th class={cellClass(h)}>{h}</th>
                  {/each}
                </tr>
              </thead>
              <tbody>
                {#each rows as row}
                  <tr class={rowClass(row)}>
                    {#each headers as h}
                      {#if h === '_dataSource'}
                        <td class="col-source">
                          <span class="source-badge source-{String(row[h] ?? '')}">{row[h]}</span>
                        </td>
                      {:else}
                        <td class={cellClass(h)} title={String(row[h] ?? '')}>
                          {String(row[h] ?? '')}
                        </td>
                      {/if}
                    {/each}
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      {/if}
    </div>

  </div>
</div>

<style>
  /* Root — covers body's dark background */
  .ds-root {
    margin: -1.5rem;
    min-height: calc(100vh - 0px);
    background: #f5f3ee;
    font-family: 'DM Sans', sans-serif;
  }

  .ds-layout {
    display: flex;
    padding: 1.5rem;
    gap: 1.5rem;
    min-height: calc(100vh - 60px); /* 60px = nav height */
    align-items: flex-start;
  }

  /* ── Sidebar ── */
  .ds-sidebar {
    width: 220px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .ds-sidebar-header {
    font-family: 'Syne', sans-serif;
    font-weight: 700;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #6b6860;
    margin-bottom: 0.25rem;
    padding: 0 0.25rem;
  }

  .ds-sidebar-empty {
    font-size: 0.85rem;
    color: #9b9892;
    padding: 0.5rem 0.25rem;
  }

  .ds-card {
    background: #ffffff;
    border: 1px solid #dddbd5;
    border-radius: 10px;
    padding: 0.75rem 0.9rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.65rem;
    transition: border-color 0.12s, box-shadow 0.12s;
  }
  .ds-card:hover {
    border-color: #b8b6b0;
    box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  }
  .ds-card--active {
    border-color: #22d3ee;
    box-shadow: inset 3px 0 0 #22d3ee, 0 1px 6px rgba(34,211,238,0.12);
    background: #f0fdff;
  }

  .ds-card-icon {
    width: 32px;
    height: 32px;
    background: #0e0d0b;
    border-radius: 7px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Syne', sans-serif;
    font-weight: 800;
    font-size: 0.7rem;
    color: #f5f3ee;
    flex-shrink: 0;
    letter-spacing: 0.02em;
  }
  .ds-card--active .ds-card-icon { background: #22d3ee; color: #000; }

  .ds-card-name {
    font-size: 0.85rem;
    font-weight: 600;
    color: #0e0d0b;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* ── Main ── */
  .ds-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .ds-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 280px;
    font-size: 0.92rem;
    color: #9b9892;
    font-family: 'DM Sans', sans-serif;
    background: #fff;
    border: 1px solid #dddbd5;
    border-radius: 14px;
  }
  .ds-empty--error { color: #dc2626; }

  /* Top bar */
  .ds-topbar {
    background: #fff;
    border: 1px solid #dddbd5;
    border-bottom: none;
    border-radius: 14px 14px 0 0;
    padding: 1rem 1.25rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .ds-topbar-left {
    display: flex;
    align-items: center;
    gap: 0.85rem;
  }

  .ds-topbar-icon {
    width: 40px;
    height: 40px;
    background: #0e0d0b;
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Syne', sans-serif;
    font-weight: 800;
    font-size: 0.78rem;
    color: #f5f3ee;
    flex-shrink: 0;
    letter-spacing: 0.02em;
  }

  .ds-topbar-name {
    font-family: 'Syne', sans-serif;
    font-weight: 800;
    font-size: 1rem;
    color: #0e0d0b;
    letter-spacing: -0.02em;
  }

  .ds-topbar-meta {
    font-size: 0.78rem;
    color: #6b6860;
    margin-top: 0.05rem;
  }

  .ds-topbar-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-shrink: 0;
  }

  .change-legend {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    font-size: 0.78rem;
    color: #6b6860;
  }
  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-weight: 500;
  }
  .legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 2px;
    flex-shrink: 0;
  }
  .ld-new     { background: #059669; }
  .ld-changed { background: #d97706; }

  .ds-btn {
    all: unset;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.38rem 0.9rem;
    border-radius: 7px;
    font-size: 0.82rem;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    border: 1.5px solid #dddbd5;
    background: #fff;
    color: #0e0d0b;
    text-decoration: none;
    transition: border-color 0.12s, background 0.12s;
  }
  .ds-btn:hover { border-color: #aaa; background: #f5f3ee; }

  /* Table */
  .ds-table-wrap {
    overflow-x: auto;
    background: #fff;
    border: 1px solid #dddbd5;
    border-radius: 0 0 14px 14px;
  }

  .ds-table {
    width: 100%;
    border-collapse: collapse;
  }

  .ds-table th {
    text-align: left;
    padding: 0.55rem 1.1rem;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: #6b6860;
    background: #faf9f6;
    border-bottom: 1px solid #eeece8;
    white-space: nowrap;
  }

  .ds-table td {
    padding: 0.6rem 1.1rem;
    border-bottom: 1px solid #f5f3f0;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.78rem;
    color: #0e0d0b;
    white-space: nowrap;
    max-width: 240px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ds-table tr:last-child td { border-bottom: none; }
  .ds-table tbody tr { transition: background 0.08s; }
  .ds-table tbody tr:hover td { background: #faf9f6 !important; }

  /* Column types */
  :global(.ds-table .col-date)   { color: #9b9892; font-size: 0.74rem; }
  :global(.ds-table .col-system) { color: #b8b6b0; font-size: 0.72rem; }

  /* Row states */
  .ds-table tbody tr.row-changed td { background: #fffbf0; }
  .ds-table tbody tr.row-changed td:first-child { box-shadow: inset 3px 0 0 #d97706; }

  /* Source badges */
  .source-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.15rem 0.5rem;
    border-radius: 10px;
    font-size: 0.68rem;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }
  .source-official   { background: #dcfce7; color: #15803d; }
  .source-comparison { background: #fef9c3; color: #a16207; }
</style>
