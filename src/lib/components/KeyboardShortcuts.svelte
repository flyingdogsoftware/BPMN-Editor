<script>
  import { undoRedoManager } from '../services/UndoRedoManager';
  
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
  }
</script>

<svelte:window on:keydown={handleKeyDown} />

<!-- Diese Komponente hat keine sichtbare UI -->
