<script>
  import { createEventDispatcher } from 'svelte';

  // Props
  export let isOpen = false;
  export let label = '';
  export let isCondition = false;

  // Event dispatcher
  const dispatch = createEventDispatcher();

  // Local state
  let inputElement;
  let localLabel = '';
  let hasFocused = false;

  console.log('LabelEditDialog: isOpen =', isOpen);
  console.log('LabelEditDialog: label =', label);
  console.log('LabelEditDialog: isCondition =', isCondition);

  // Function to focus the input element
  function focusInput() {
    if (inputElement && !hasFocused) {
      console.log('LabelEditDialog: Focusing input element');
      inputElement.focus();
      inputElement.select();
      hasFocused = true;
    }
  }

  // Reset local label when props change
  $: if (isOpen) {
    console.log('LabelEditDialog: Dialog opened, setting localLabel =', label);
    localLabel = label;
    hasFocused = false;
    // Focus the input element when the dialog opens
    setTimeout(focusInput, 50);
  } else {
    // Reset focus state when dialog closes
    hasFocused = false;
  }

  // Event handlers
  function handleSave() {
    dispatch('save', localLabel);
    close();
  }

  function handleCancel() {
    close();
  }

  function close() {
    dispatch('close');
  }

  function handleKeyDown(event) {
    // Only save on Ctrl+Enter or Cmd+Enter for textarea
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      handleSave();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      handleCancel();
    }
  }

  function handleBackdropClick(event) {
    // Only close if the backdrop itself was clicked, not its children
    if (event.target === event.currentTarget) {
      handleCancel();
    }
  }
</script>

{#if isOpen}
  <div
    class="modal-backdrop"
    on:click={handleBackdropClick}
    on:keydown={handleKeyDown}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <div
      class="modal-content"
      on:click|stopPropagation
      on:keydown={handleKeyDown}
      role="document"
      tabindex="-1"
    >
      <h3>{isCondition ? 'Edit Condition' : 'Edit Label'}</h3>
      <textarea
        bind:this={inputElement}
        bind:value={localLabel}
        on:keydown={handleKeyDown}
        placeholder={isCondition ? 'Enter condition expression' : 'Enter label text'}
        rows="3"
      ></textarea>
      <small class="hint">Press Ctrl+Enter to save, Escape to cancel</small>
      <div class="button-group">
        <button class="cancel-button" on:click={handleCancel}>Cancel</button>
        <button class="save-button" on:click={handleSave}>Save</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }

  .modal-content {
    background-color: white;
    padding: 20px;
    border-radius: 5px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    width: 300px;
    max-width: 90%;
  }

  h3 {
    margin-top: 0;
    margin-bottom: 15px;
    color: #333;
  }

  textarea {
    width: 100%;
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 3px;
    margin-bottom: 5px;
    font-size: 14px;
    resize: vertical;
  }

  .hint {
    display: block;
    color: #666;
    font-size: 12px;
    margin-bottom: 15px;
  }

  .button-group {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }

  button {
    padding: 8px 15px;
    border: none;
    border-radius: 3px;
    cursor: pointer;
    font-size: 14px;
  }

  .cancel-button {
    background-color: #f1f1f1;
    color: #333;
  }

  .save-button {
    background-color: #3498db;
    color: white;
  }

  .save-button:hover {
    background-color: #2980b9;
  }

  .cancel-button:hover {
    background-color: #e1e1e1;
  }
</style>
