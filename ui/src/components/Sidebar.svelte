<script lang="ts">
  import JobList from './JobList.svelte';
  import IndexTab from './tabs/IndexTab.svelte';
  import UpdateTab from './tabs/UpdateTab.svelte';
  import TestTab from './tabs/TestTab.svelte';
  import SchemasTab from './tabs/SchemasTab.svelte';
  import { jobsStore } from '../stores/jobs.svelte';
  import { dashStore } from '../stores/dashboard.svelte';
  import { cancelJob } from '../lib/api';

  const {
    schemas,
    outputs,
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

  function selectTab(t: 'index' | 'update' | 'test' | 'schemas') {
    activeTab = t;
  }

  async function handleCancel(id: string) {
    await cancelJob(id);
    await jobsStore.refresh();
  }

  async function handleJobClick(id: string) {
    await dashStore.openJob(id);
  }

  async function handleClearJobs() {
    await jobsStore.clear();
    dashStore.reset();
  }
</script>

<div style="display:flex;flex-direction:column;gap:1rem">
  <div class="card">
    <div class="tabs">
      {#each (['index', 'update', 'test', 'schemas'] as const) as tab}
        <div class="tab" class:active={activeTab === tab} onclick={() => selectTab(tab)}>
          {tab.charAt(0).toUpperCase() + tab.slice(1)}
        </div>
      {/each}
    </div>

    <div class="panel" class:active={activeTab === 'index'}>
      <IndexTab {schemas} />
    </div>
    <div class="panel" class:active={activeTab === 'update'}>
      <UpdateTab {schemas} selectedDataset={null} />
    </div>
    <div class="panel" class:active={activeTab === 'test'}>
      <TestTab {schemas} />
    </div>
    <div class="panel" class:active={activeTab === 'schemas'}>
      <SchemasTab {onSchemaEdit} {onNewSchema} {onSelectsReload} />
    </div>
  </div>

  <div class="card">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.4rem">
      <div class="section-title" style="margin-bottom:0">Jobs</div>
      <button
        style="all:unset;font-size:0.65rem;color:#666;background:#1e1e1e;border:1px solid #2a2a2a;border-radius:3px;padding:0.1rem 0.45rem;cursor:pointer;transition:color 0.15s,border-color 0.15s"
        title="Clear completed jobs"
        onclick={handleClearJobs}
      >clear</button>
    </div>
    <JobList
      jobs={jobsStore.jobs}
      selectedJobId={jobsStore.selectedJobId}
      onJobClick={handleJobClick}
      onCancel={handleCancel}
    />
  </div>
</div>
