<script lang="ts">
  const {
    title,
    count,
    children,
  }: {
    title: string;
    count: number | string;
    children: import('svelte').Snippet;
  } = $props();
</script>

<div class="dash-panel">
  <div class="dash-panel-header">
    <span class="dash-panel-title">{title}</span>
    <span class="dash-panel-count">{count}</span>
  </div>
  <div class="dash-panel-body">
    {@render children()}
  </div>
</div>
