<script lang="ts">
  import { getSchemas, deleteSchema } from '../../lib/api';

  const {
    onSchemaEdit,
    onNewSchema,
    onSelectsReload,
  }: {
    onSchemaEdit: (id: string) => void;
    onNewSchema: () => void;
    onSelectsReload: () => void;
  } = $props();

  let schemas = $state<Array<{ id: string; display_name: string }>>([]);

  async function load() {
    const { schemas: s } = await getSchemas();
    schemas = s;
  }

  $effect(() => { load(); });

  async function handleDelete(id: string) {
    if (!confirm(`Delete schema "${id}"? This cannot be undone.`)) return;
    const res = await fetch(`/schemas/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) { alert(data.error); return; }
    await load();
    onSelectsReload();
  }
</script>

<div style="margin-bottom:0.6rem">
  {#if schemas.length === 0}
    <div style="color:#666;font-size:0.78rem;margin-bottom:0.5rem">No schemas yet.</div>
  {:else}
    {#each schemas as s}
      <div style="display:flex;align-items:center;justify-content:space-between;padding:0.35rem 0;border-bottom:1px solid #1a1a1a">
        <span style="font-size:0.8rem;color:#ccc">
          {s.display_name}
          <span style="color:#666;font-size:0.7rem">{s.id}</span>
        </span>
        <div style="display:flex;gap:0.4rem">
          <button
            style="all:unset;font-size:0.65rem;color:#888;background:#1e1e1e;border:1px solid #333;border-radius:3px;padding:0.1rem 0.45rem;cursor:pointer"
            onclick={() => onSchemaEdit(s.id)}
          >edit</button>
          <button
            style="all:unset;font-size:0.65rem;color:#888;background:#1e1e1e;border:1px solid #333;border-radius:3px;padding:0.1rem 0.45rem;cursor:pointer"
            onclick={() => handleDelete(s.id)}
          >del</button>
        </div>
      </div>
    {/each}
  {/if}
</div>
<button style="width:100%" onclick={onNewSchema}>+ New Schema</button>
