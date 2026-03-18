<script lang="ts">
  import type { Job } from '../lib/types';
  import JobItem from './JobItem.svelte';

  const {
    jobs,
    selectedJobId,
    onJobClick,
    onCancel,
  }: {
    jobs: Job[];
    selectedJobId: string | null;
    onJobClick: (id: string) => void;
    onCancel: (id: string) => void;
  } = $props();

  const ITEM_HEIGHT = 62;
  const CONTAINER_HEIGHT = 420;
  const OVERSCAN = 3;

  let scrollTop = $state(0);
  let containerEl: HTMLDivElement | undefined = $state();

  const totalHeight = $derived(jobs.length * ITEM_HEIGHT);
  const useVirtual = $derived(totalHeight >= CONTAINER_HEIGHT);

  const startIndex = $derived(
    useVirtual ? Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN) : 0
  );
  const endIndex = $derived(
    useVirtual
      ? Math.min(jobs.length, Math.ceil((scrollTop + CONTAINER_HEIGHT) / ITEM_HEIGHT) + OVERSCAN)
      : jobs.length
  );

  const visibleJobs = $derived(jobs.slice(startIndex, endIndex));
  const topSpacer = $derived(useVirtual ? startIndex * ITEM_HEIGHT : 0);
  const bottomSpacer = $derived(useVirtual ? (jobs.length - endIndex) * ITEM_HEIGHT : 0);

  function handleScroll(e: Event) {
    scrollTop = (e.target as HTMLElement).scrollTop;
  }
</script>

{#if jobs.length === 0}
  <div class="empty">No jobs yet.</div>
{:else}
  <div
    bind:this={containerEl}
    class="jobs-list"
    style={useVirtual ? `height:${CONTAINER_HEIGHT}px;position:relative` : ''}
    onscroll={handleScroll}
  >
    {#if topSpacer > 0}
      <div style="height:{topSpacer}px;flex-shrink:0"></div>
    {/if}

    {#each visibleJobs as job (job.id)}
      <JobItem
        {job}
        selected={job.id === selectedJobId}
        onclick={() => onJobClick(job.id)}
        onCancel={() => onCancel(job.id)}
      />
    {/each}

    {#if bottomSpacer > 0}
      <div style="height:{bottomSpacer}px;flex-shrink:0"></div>
    {/if}
  </div>
{/if}
