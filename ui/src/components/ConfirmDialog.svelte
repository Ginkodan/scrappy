<script lang="ts">
  import { Dialog } from 'bits-ui';

  let {
    open = $bindable(false),
    title,
    description = '',
    confirmLabel = 'Confirm',
    danger = false,
    onconfirm,
  }: {
    open?: boolean;
    title: string;
    description?: string;
    confirmLabel?: string;
    danger?: boolean;
    onconfirm: () => void;
  } = $props();
</script>

<Dialog.Root bind:open>
  <Dialog.Portal>
    <Dialog.Overlay class="dlg-overlay" />
    <Dialog.Content class="dlg-content">
      <Dialog.Title class="dlg-title">{title}</Dialog.Title>
      {#if description}
        <Dialog.Description class="dlg-desc">{description}</Dialog.Description>
      {/if}
      <div class="dlg-actions">
        <Dialog.Close class="dlg-btn dlg-btn--cancel">Cancel</Dialog.Close>
        <button
          class="dlg-btn"
          class:dlg-btn--danger={danger}
          onclick={() => { open = false; onconfirm(); }}
        >{confirmLabel}</button>
      </div>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

<style>
  :global(.dlg-overlay) {
    position: fixed;
    inset: 0;
    background: rgba(14, 13, 11, 0.4);
    backdrop-filter: blur(2px);
    z-index: 200;
  }
  :global(.dlg-content) {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: #fff;
    border: 1px solid #dddbd5;
    border-radius: 14px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.18);
    padding: 1.5rem 1.75rem;
    z-index: 201;
    min-width: 320px;
    max-width: 90vw;
    font-family: 'DM Sans', sans-serif;
  }
  :global(.dlg-title) {
    font-family: 'Syne', sans-serif;
    font-weight: 700;
    font-size: 1rem;
    color: #0e0d0b;
    margin: 0 0 0.5rem;
  }
  :global(.dlg-desc) {
    font-size: 0.85rem;
    color: #6b6860;
    margin: 0 0 1.25rem;
    line-height: 1.5;
  }
  .dlg-actions {
    display: flex;
    gap: 0.6rem;
    justify-content: flex-end;
    margin-top: 1.25rem;
  }
  :global(.dlg-btn) {
    all: unset;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    padding: 0.45rem 1.1rem;
    border-radius: 8px;
    font-size: 0.85rem;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    border: 1.5px solid #dddbd5;
    background: #fff;
    color: #0e0d0b;
    transition: background 0.12s, border-color 0.12s;
  }
  :global(.dlg-btn:hover) { background: #f5f3ee; border-color: #b8b6b0; }
  :global(.dlg-btn:focus-visible) { outline: 2px solid #22d3ee; outline-offset: 2px; }
  :global(.dlg-btn--cancel) { color: #6b6860; }
  :global(.dlg-btn--danger) { background: #dc2626; border-color: #dc2626; color: #fff; }
  :global(.dlg-btn--danger:hover) { background: #b91c1c; border-color: #b91c1c; }
</style>
