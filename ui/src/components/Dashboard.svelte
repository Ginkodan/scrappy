<script lang="ts">
  import { dashStore } from '../stores/dashboard.svelte';
  import StatsBar from './StatsBar.svelte';
  import MonitorPanel from './MonitorPanel.svelte';
  import RecordsTab from './RecordsTab.svelte';

  const job = $derived(dashStore.state.job);
  const hasJob = $derived(job !== null);
  const hasRecords = $derived(job?.type === 'index');
</script>

{#if !hasJob}
  <div class="dash-empty">Select a job to view</div>
{:else}
  <div class="dashboard">
    {#if hasRecords}
      <div class="rpanel-tabs">
        <div
          class="rpanel-tab"
          class:active={dashStore.activeRpTab === 'monitor'}
          onclick={() => dashStore.switchTab('monitor')}
        >Monitor</div>
        <div
          class="rpanel-tab"
          class:active={dashStore.activeRpTab === 'records'}
          onclick={() => dashStore.switchTab('records')}
        >Records</div>
      </div>
    {/if}

    {#if dashStore.activeRpTab === 'monitor' || !hasRecords}
      <StatsBar />
      <MonitorPanel />
    {:else}
      <RecordsTab file={dashStore.recordsFile} refreshTick={dashStore.recordsRefreshTick} />
    {/if}
  </div>
{/if}
