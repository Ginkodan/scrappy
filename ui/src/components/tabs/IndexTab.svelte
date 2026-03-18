<script lang="ts">
  import { startIndexJob } from '../../lib/api';
  import { jobsStore } from '../../stores/jobs.svelte';
  import { dashStore } from '../../stores/dashboard.svelte';

  const { schemas, onStarted }: { schemas: Array<{ id: string; display_name: string }>; onStarted?: () => void } = $props();

  let topic = $state('');
  let selectedSchema = $state('');
  let output = $state('');
  let maxIter = $state('');
  let loading = $state(false);

  $effect(() => {
    if (schemas.length && !selectedSchema) selectedSchema = schemas[0].id;
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
    if (res.id) {
      await dashStore.openJob(res.id);
      onStarted?.();
    }
  }
</script>

<div class="inline-form">
  <div class="field grow2">
    <label>Topic</label>
    <input type="text" bind:value={topic} placeholder="3A Fonds Konto Schweiz Zinssatz" />
  </div>
  <div class="field">
    <label>Schema</label>
    <select bind:value={selectedSchema}>
      {#each schemas as s}
        <option value={s.id}>{s.display_name}</option>
      {/each}
    </select>
  </div>
  <div class="field">
    <label>Dataset name</label>
    <input type="text" bind:value={output} placeholder="results" />
  </div>
  <div class="field narrow">
    <label>Iterations</label>
    <input type="number" bind:value={maxIter} placeholder="40" min="1" max="200" />
  </div>
  <div class="field submit">
    <label>&nbsp;</label>
    <button disabled={loading} onclick={handleIndex}>
      {loading ? '…' : '▶ Run'}
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
  .field.grow2 { flex: 2; }
  .field.narrow { flex: 0 0 80px; min-width: 0; }
  .field.submit { flex: 0 0 auto; }
  label { font-size: 0.68rem; color: #555; margin: 0; }
  input, select { margin: 0; }
  button { margin: 0; white-space: nowrap; }
</style>
