<script>
  import { undoRedoManager } from '../services/UndoRedoManager';
  import { bpmnStore } from '../stores/bpmnStore';

  /**
   * Handler für Tastaturkürzel
   */
  function handleKeyDown(event) {
    // Undo: Strg+Z
    if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
      event.preventDefault();
      undoRedoManager.undo();
    }
    // Redo: Strg+Y oder Strg+Shift+Z
    else if (
      ((event.ctrlKey || event.metaKey) && event.key === 'y') ||
      ((event.ctrlKey || event.metaKey) && event.key === 'z' && event.shiftKey)
    ) {
      event.preventDefault();
      undoRedoManager.redo();
    }
    // Delete selected connection with Delete or Backspace key
    else if (event.key === 'Delete' || event.key === 'Backspace') {
      // Check if we have a selected connection
      const selectedConnection = $bpmnStore.find(el => el.type === 'connection' && el.isSelected);
      if (selectedConnection) {
        event.preventDefault();
        console.log('Deleting selected connection:', selectedConnection.id);
        bpmnStore.removeElement(selectedConnection.id);
      }
    }
  }
</script>

<svelte:window on:keydown={handleKeyDown} />

<!-- Diese Komponente hat keine sichtbare UI -->
