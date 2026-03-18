<script lang="ts">
  import { jobsStore } from '../stores/jobs.svelte';

  const {
    screen,
    onScreenChange,
    onOpenSettings,
  }: {
    screen: 'monitor' | 'scrape';
    onScreenChange: (s: 'monitor' | 'scrape') => void;
    onOpenSettings: () => void;
  } = $props();

  const runningJob = $derived(jobsStore.jobs.find(j => j.status === 'running'));
  const runningLabel = $derived(
    runningJob
      ? runningJob.type === 'index'
        ? (runningJob.params.topic ?? 'index')
        : `update: ${runningJob.params.input ?? ''}`
      : null
  );
</script>

<div class="app-header">
  <div style="display:flex;align-items:center;gap:1.5rem">
    <h1>scrappy</h1>
    <nav class="app-nav">
      <button class="nav-link" class:active={screen === 'monitor'} onclick={() => onScreenChange('monitor')}>Monitor</button>
      <button class="nav-link" class:active={screen === 'scrape'} onclick={() => onScreenChange('scrape')}>Scrape</button>
    </nav>
    {#if runningLabel}
      <div class="running-indicator" title={runningLabel}>
        <span class="pulse"></span>
        <span class="running-label">{runningLabel}</span>
      </div>
    {/if}
  </div>
  <button class="gear-btn" title="Settings" onclick={onOpenSettings}>⚙</button>
</div>

<style>
  .app-nav {
    display: flex;
    gap: 0.1rem;
  }
  .nav-link {
    all: unset;
    cursor: pointer;
    font-size: 0.8rem;
    font-weight: 500;
    color: #555;
    padding: 0.25rem 0.65rem;
    border-radius: 4px;
    transition: color 0.15s, background 0.15s;
  }
  .nav-link:hover { color: #aaa; background: #1a1a1a; }
  .nav-link.active { color: #00bcd4; background: #0a2a2a; }

  .running-indicator {
    display: flex;
    align-items: center;
    gap: 0.45rem;
  }
  .pulse {
    display: inline-block;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #4caf50;
    box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.5);
    animation: pulse 1.4s ease-in-out infinite;
    flex-shrink: 0;
  }
  @keyframes pulse {
    0%   { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.5); }
    70%  { box-shadow: 0 0 0 6px rgba(76, 175, 80, 0); }
    100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
  }
  .running-label {
    font-size: 0.72rem;
    color: #4caf50;
    font-family: monospace;
    max-width: 260px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
