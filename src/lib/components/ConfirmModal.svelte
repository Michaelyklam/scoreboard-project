<script lang="ts">
  let { title, message, isOpen, onConfirm, onCancel, confirmText = "Confirm", cancelText = "Cancel" } = $props();
</script>

{#if isOpen}
  <div class="modal-backdrop animate-fade-in" onclick={onCancel} role="button" tabindex="0" onkeydown={(e) => e.key === 'Escape' && onCancel()}>
    <div class="modal-card" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
      <h2>{title}</h2>
      <p>{message}</p>
      
      <div class="actions">
        {#if cancelText}
          <button class="btn-secondary" onclick={onCancel}>{cancelText}</button>
        {/if}
        <button class="btn-primary" onclick={() => { onConfirm(); onCancel(); }}>{confirmText}</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(8px);
    z-index: 1000;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 1rem;
  }
  
  .modal-card {
    background: var(--surface-color);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    padding: 2rem;
    max-width: 400px;
    width: 100%;
    box-shadow: 0 10px 40px rgba(0,0,0,0.5);
    animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  h2 {
    color: var(--text-primary);
    margin-bottom: 1rem;
    font-size: 1.5rem;
  }

  p {
    color: var(--text-secondary);
    line-height: 1.5;
    margin-bottom: 2rem;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
  }

  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
</style>
