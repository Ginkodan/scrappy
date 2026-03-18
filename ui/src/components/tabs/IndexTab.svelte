<script lang="ts">
  import { startIndexJob } from '../../lib/api';
  import { jobsStore } from '../../stores/jobs.svelte';
  import { dashStore } from '../../stores/dashboard.svelte';

  const { schemas }: { schemas: Array<{ id: string; display_name: string }> } = $props();

  let topic = $state('');
  let selectedSchema = $state('');
  let output = $state('');
  let maxIter = $state('');
  let loading = $state(false);

  $effect(() => {
    if (schemas.length && !selectedSchema) {
      selectedSchema = schemas[0].id;
    }
  });

  async function handleIndex() {
    if (!topic.trim()) { alert('Enter a topic'); return; }
    loading = true;
    const cleanOutput = output.trim().replace(/\.csv$/i, '') || 'results';
    const res = await startIndexJob({
      topic: topic.trim(),
      schema: selectedSchema,
      output: cleanOutput,
      ...(maxIter.trim() ? { maxIterations: maxIter.trim() } : {}),
    });
    loading = false;
    await jobsStore.refresh();
    if (res.id) await dashStore.openJob(res.id);
  }
</script>

<label>Topic</label>
<input type="text" bind:value={topic} placeholder="3A Fonds Konto Schweiz Zinssatz" />

<label>Schema</label>
<select bind:value={selectedSchema}>
  {#each schemas as s}
    <option value={s.id}>{s.display_name}</option>
  {/each}
</select>

<label>Dataset name</label>
<input type="text" bind:value={output} placeholder="results" />

<label>Max iterations <span>(default 40)</span></label>
<input type="number" bind:value={maxIter} placeholder="40" min="1" max="100" style="margin-bottom:0.75rem" />

<button disabled={loading} onclick={handleIndex}>
  {loading ? 'Starting…' : 'Index'}
</button>
