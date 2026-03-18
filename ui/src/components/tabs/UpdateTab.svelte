<script lang="ts">
  import { startUpdateJob } from '../../lib/api';
  import { jobsStore } from '../../stores/jobs.svelte';
  import { dashStore } from '../../stores/dashboard.svelte';

  const {
    schemas,
    outputs,
  }: {
    schemas: Array<{ id: string; display_name: string }>;
    outputs: string[];
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
    if (!selectedInput || selectedInput.includes('no CSV')) {
      alert('No CSV file available');
      return;
    }
    loading = true;
    const body: { input: string; schema: string; filter?: string } = {
      input: selectedInput,
      schema: selectedSchema,
    };
    if (filter.trim()) body.filter = filter.trim();
    const res = await startUpdateJob(body);
    loading = false;
    await jobsStore.refresh();
    if (res.id) await dashStore.openJob(res.id);
  }
</script>

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

<label>Schema</label>
<select bind:value={selectedSchema}>
  {#each schemas as s}
    <option value={s.id}>{s.display_name}</option>
  {/each}
</select>

<label>Filter provider <span>(optional)</span></label>
<input type="text" bind:value={filter} placeholder="e.g. viac or tellco" />

<button disabled={loading} onclick={handleUpdate}>
  {loading ? 'Starting…' : 'Update'}
</button>
