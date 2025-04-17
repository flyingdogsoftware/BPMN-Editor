<script>
  import { undoRedoManager } from '../services/UndoRedoManager';

  // Reaktive Stores für Button-Status
  const canUndo = undoRedoManager.getCanUndoStore();
  const canRedo = undoRedoManager.getCanRedoStore();

  // Handler für Undo/Redo-Aktionen
  function handleUndo() {
    undoRedoManager.undo();
  }

  function handleRedo() {
    undoRedoManager.redo();
  }
</script>

<div class="undo-redo-controls">
  <button
    class="tool-button"
    on:click={handleUndo}
    disabled={!$canUndo}
    aria-label="Undo"
    title="Undo (Ctrl+Z)"
  >
    <div class="tool-icon">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 7v6h6"></path>
        <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path>
      </svg>
    </div>
    <span>Undo</span>
  </button>

  <button
    class="tool-button"
    on:click={handleRedo}
    disabled={!$canRedo}
    aria-label="Redo"
    title="Redo (Ctrl+Y)"
  >
    <div class="tool-icon">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 7v6h-6"></path>
        <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"></path>
      </svg>
    </div>
    <span>Redo</span>
  </button>
</div>

<style>
  .undo-redo-controls {
    display: flex;
    gap: 4px;
  }

  .tool-button {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 8px;
    border: 1px solid #ccc;
    background-color: white;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .tool-button:hover:not(:disabled) {
    background-color: #f0f0f0;
  }

  .tool-button:active:not(:disabled) {
    background-color: #e0e0e0;
  }

  .tool-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .tool-icon {
    width: 24px;
    height: 24px;
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  span {
    font-size: 12px;
  }
</style>
