<script lang="ts">
  let { title = "Rename Team", initialValue = "", isOpen, onConfirm, onCancel, confirmText = "Save", cancelText = "Cancel", theme = "default" } = $props();
  
  let newValue = $state("");

  // Focus input when modal opens
  let inputRef = $state<HTMLInputElement>();
  $effect(() => {
    if (isOpen) {
      newValue = initialValue;
      setTimeout(() => inputRef?.focus(), 50);
    }
  });

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onCancel();
    } else if (e.key === 'Enter') {
      handleConfirm();
    }
  }

  function handleConfirm() {
    if (newValue.trim()) {
      onConfirm(newValue.trim());
      onCancel();
    }
  }
</script>

{#if isOpen}
  <div class="modal-backdrop animate-fade-in" onclick={onCancel} role="button" tabindex="0" onkeydown={handleKeydown}>
    <div class="modal-card theme-{theme}" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
      <h2>{title}</h2>
      
      <input 
        bind:this={inputRef}
        type="text" 
        bind:value={newValue} 
        class="rename-input" 
        placeholder="Enter new team name"
        onkeydown={handleKeydown}
      />
      
      <div class="actions">
        <button class="btn-secondary" onclick={onCancel}>{cancelText}</button>
        <button class="btn-primary" onclick={handleConfirm} disabled={!newValue.trim()}>{confirmText}</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(8px);
    z-index: 1000;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 1rem;
  }
  
  .modal-card {
    background: #1a1d24; /* match sports dashboard theme */
    border: 1px solid #2a2e38;
    border-radius: 16px;
    padding: 2.5rem;
    max-width: 450px;
    width: 100%;
    box-shadow: 0 20px 50px rgba(0,0,0,0.5);
    animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  h2 {
    color: white;
    margin-top: 0;
    margin-bottom: 1.5rem;
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  .rename-input {
    width: 100%;
    background: #0f1115;
    border: 1px solid #2a2e38;
    color: white;
    font-size: 1.25rem;
    padding: 1.25rem 1.5rem;
    border-radius: 12px;
    font-family: inherit;
    font-weight: 700;
    outline: none;
    margin-bottom: 2rem;
    box-sizing: border-box;
    transition: border-color 0.2s;
  }
  
  /* Theme handling for input focus */
  .theme-red .rename-input:focus { border-color: #ef4444; }
  .theme-blue .rename-input:focus { border-color: #3b82f6; } /* bright blue */
  .theme-default .rename-input:focus { border-color: #94a3b8; }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
  }

  /* Shared sports theme buttons */
  .btn-secondary {
    background: transparent;
    border: 1px solid #475569;
    color: #cbd5e1;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
    font-family: inherit;
  }
  .btn-secondary:hover {
    background: #334155;
    color: white;
  }
  
  .btn-primary {
    background: white;
    color: black;
    border: none;
    padding: 0.75rem 2rem;
    border-radius: 8px;
    font-weight: 800;
    cursor: pointer;
    transition: all 0.2s;
    font-family: inherit;
  }
  
  /* Theme handling for primary button */
  .theme-red .btn-primary:hover:not(:disabled) {
    background: #ef4444;
    color: white;
  }
  .theme-blue .btn-primary:hover:not(:disabled) {
    background: #3b82f6;
    color: white;
  }
  .theme-default .btn-primary:hover:not(:disabled) {
    background: #94a3b8;
    color: white;
  }
  
  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
</style>
