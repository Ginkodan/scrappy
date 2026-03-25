<script lang="ts">
  import { startUpdateJob } from '../lib/api';
  import { Select } from 'bits-ui';

  const {
    dataset,
    schemas,
    initialSchema = '',
    onSubmit,
  }: {
    dataset: string;
    schemas: Array<{ id: string; display_name: string }>;
    initialSchema?: string;
    onSubmit: () => void;
  } = $props();

  let updateSchema = $state<string | undefined>(undefined);
  let updateFilter = $state('');
  let submitting = $state(false);

  // Sync initialSchema when it becomes available (resolved asynchronously from parent)
  $effect(() => {
    const s = initialSchema;
    if (s && !updateSchema) updateSchema = s;
  });

  async function startUpdate() {
    if (!dataset || !updateSchema) return;
    submitting = true;
    await startUpdateJob({ input: dataset, schema: updateSchema!, filter: updateFilter || undefined });
    submitting = false;
    onSubmit();
  }
</script>

<div class="ds-action-panel ds-panel--update">
  <div class="ds-panel-title">↻ Update · {dataset}</div>
  <div class="ds-panel-fields">
    <div class="ds-field">
      <label class="ds-label" for="update-schema">Schema</label>
      <Select.Root type="single" bind:value={updateSchema} name="update-schema">
        <Select.Trigger class="ds-select-trigger" id="update-schema" aria-label="Select schema">
          <span class:ds-select-placeholder={!updateSchema}>
            {updateSchema ? (schemas.find(s => s.id === updateSchema)?.display_name ?? updateSchema) : 'Select schema…'}
          </span>
          <span class="ds-select-chevron">▾</span>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content class="ds-select-content" sideOffset={4}>
            {#each schemas as s}
              <Select.Item class="ds-select-item" value={s.id} label={s.display_name}>
                {s.display_name}
              </Select.Item>
            {/each}
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </div>
    <div class="ds-field">
      <label class="ds-label" for="update-filter">Filter (optional)</label>
      <input id="update-filter" class="ds-input" bind:value={updateFilter} placeholder="e.g. provider name…" />
    </div>
  </div>
  <button class="ds-submit" onclick={startUpdate} disabled={submitting || !updateSchema || updateSchema === ''}>
    {submitting ? 'Starting…' : '↻ Run update'}
  </button>
</div>

<style>
  /* Action panel */
  .ds-action-panel {
    background: #fff; border: 1px solid #dddbd5; border-radius: 12px;
    padding: 1.25rem 1.5rem; margin-bottom: 0.75rem;
  }
  .ds-panel--update { border-top: 3px solid #f59e0b; }

  .ds-panel-title {
    font-family: 'Syne', sans-serif; font-weight: 700;
    font-size: 0.82rem; color: #0e0d0b; margin-bottom: 1rem;
    letter-spacing: -0.01em;
  }

  .ds-panel-fields {
    display: flex; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 1rem;
  }
  .ds-field { display: flex; flex-direction: column; gap: 0.3rem; min-width: 160px; }

  .ds-label {
    font-size: 0.72rem; font-weight: 600; color: #6b6860;
    text-transform: uppercase; letter-spacing: 0.07em;
    font-family: 'DM Sans', sans-serif;
  }

  .ds-input {
    all: unset;
    background: #f9f8f5; border: 1px solid #dddbd5; border-radius: 7px;
    padding: 0.45rem 0.75rem; font-size: 0.85rem; color: #0e0d0b;
    font-family: 'DM Sans', sans-serif; width: 100%; box-sizing: border-box;
    transition: border-color 0.12s;
  }
  .ds-input:focus { border-color: #22d3ee; outline: none; }
  .ds-input::placeholder { color: #b8b6b0; }

  /* bits-ui Select — same styles as DatasetCreatePanel */
  :global(.ds-select-trigger) {
    all: unset;
    display: flex; align-items: center; justify-content: space-between; gap: 0.4rem;
    background: #f9f8f5; border: 1px solid #dddbd5; border-radius: 7px;
    padding: 0.45rem 0.75rem; font-size: 0.85rem; color: #0e0d0b;
    font-family: 'DM Sans', sans-serif; width: 100%; box-sizing: border-box;
    cursor: pointer; transition: border-color 0.12s;
  }
  :global(.ds-select-trigger:hover) { border-color: #b8b6b0; }
  :global(.ds-select-trigger:focus-visible) { border-color: #22d3ee; outline: none; }
  .ds-select-placeholder { color: #b8b6b0; }
  .ds-select-chevron { font-size: 0.7rem; color: #9b9892; flex-shrink: 0; }
  :global(.ds-select-content) {
    background: #fff; border: 1px solid #dddbd5; border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.10); padding: 0.25rem 0;
    min-width: var(--bits-select-anchor-width);
    z-index: 150; font-family: 'DM Sans', sans-serif;
  }
  :global(.ds-select-item) {
    all: unset; display: block; width: 100%; box-sizing: border-box;
    padding: 0.45rem 0.85rem; font-size: 0.85rem; color: #0e0d0b;
    cursor: pointer; transition: background 0.1s;
  }
  :global(.ds-select-item[data-highlighted]) { background: #f5f3ee; }
  :global(.ds-select-item[data-selected]) { color: #0e7490; font-weight: 600; }

  .ds-submit {
    all: unset; cursor: pointer;
    display: inline-flex; align-items: center;
    background: #0e0d0b; color: #f5f3ee;
    padding: 0.5rem 1.25rem; border-radius: 8px;
    font-size: 0.85rem; font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    transition: opacity 0.12s, transform 0.12s;
  }
  .ds-submit:focus-visible { outline: 2px solid #22d3ee; outline-offset: 2px; }
  .ds-submit:hover:not(:disabled) { opacity: 0.85; transform: translateY(-1px); }
  .ds-submit:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
