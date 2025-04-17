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
    class="toolbar-button" 
    on:click={handleUndo} 
    disabled={!$canUndo}
    aria-label="Rückgängig"
    title="Rückgängig (Strg+Z)"
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 7v6h6"></path>
      <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path>
    </svg>
  </button>
  
  <button 
    class="toolbar-button" 
    on:click={handleRedo} 
    disabled={!$canRedo}
    aria-label="Wiederherstellen"
    title="Wiederherstellen (Strg+Y)"
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 7v6h-6"></path>
      <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"></path>
    </svg>
  </button>
</div>

<style>
  .undo-redo-controls {
    display: flex;
    gap: 4px;
  }
  
  .toolbar-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: 1px solid #ccc;
    background-color: white;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .toolbar-button:hover:not(:disabled) {
    background-color: #f0f0f0;
  }
  
  .toolbar-button:active:not(:disabled) {
    background-color: #e0e0e0;
  }
  
  .toolbar-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
