<script lang="ts">
  import { startUpdateJob } from '../../lib/api';
  import { jobsStore } from '../../stores/jobs.svelte';
  import { dashStore } from '../../stores/dashboard.svelte';

  const {
    schemas,
    outputs,
    onStarted,
  }: {
    schemas: Array<{ id: string; display_name: string }>;
    outputs: string[];
    onStarted?: () => void;
  } = $props();

  let selectedInput = $state('');
  let selectedSchema = $state('');
  let filter = $state('');
  let loading = $state(false);

  $effect(() => {
    if (schemas.length && !selectedSchema) selectedSchema = schemas[0].id;
  });
  $effect(() => {
    if (outputs.length && !selectedInput) selectedInput = outputs[0];
  });

  async function handleUpdate() {
    if (!selectedInput) { alert('No dataset available'); return; }
    loading = true;
    const body: { input: string; schema: string; filter?: string } = {
      input: selectedInput,
      schema: selectedSchema,
    };
    if (filter.trim()) body.filter = filter.trim();
    const res = await startUpdateJob(body);
    loading = false;
    await jobsStore.refresh();
    if (res.id) {
      await dashStore.openJob(res.id);
      onStarted?.();
    }
  }
</script>

<div class="inline-form">
  <div class="field">
    <label>Dataset</label>
    <select bind:value={selectedInput}>
      {#if outputs.length === 0}
        <option value="">(no datasets yet)</option>
      {:else}
        {#each outputs as o}
          <option value={o}>{o}</option>
        {/each}
      {/if}
    </select>
  </div>
  <div class="field">
    <label>Schema</label>
    <select bind:value={selectedSchema}>
      {#each schemas as s}
        <option value={s.id}>{s.display_name}</option>
      {/each}
    </select>
  </div>
  <div class="field grow">
    <label>Filter provider <span style="color:#666">(optional)</span></label>
    <input type="text" bind:value={filter} placeholder="e.g. viac or tellco" />
  </div>
  <div class="field submit">
    <label>&nbsp;</label>
    <button disabled={loading} onclick={handleUpdate}>
      {loading ? '…' : '↻ Run'}
    </button>
  </div>
</div>

<style>
  .inline-form {
    display: flex;
    gap: 0.75rem;
    align-items: flex-end;
    flex-wrap: wrap;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 120px;
    flex: 1;
  }
  .field.grow { flex: 2; }
  .field.submit { flex: 0 0 auto; }
  label { font-size: 0.68rem; color: #888; margin: 0; }
  input, select { margin: 0; }
  button { margin: 0; white-space: nowrap; }
</style>
