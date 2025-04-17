<script>
  import { createEventDispatcher } from 'svelte';
  import ElementCreationDialog from './ElementCreationDialog.svelte';
  import { multiSelectionManager } from '../../services/MultiSelectionManager';
  import UndoRedoControls from '../UndoRedoControls.svelte';

  const dispatch = createEventDispatcher();
  let showElementDialog = false;

  // Get the selection mode store
  const selectionMode = multiSelectionManager.getSelectionModeStore();

  function addCommonElement(type, subtype) {
    // Default position when clicking from toolbar
    dispatch('add', { type, subtype, x: 300, y: 200 });
  }

  function toggleElementDialog() {
    showElementDialog = !showElementDialog;
  }

  function handleAddElement(event) {
    // Add default position if not provided
    const detail = event.detail;
    if (!detail.x || !detail.y) {
      detail.x = 300;
      detail.y = 200;
    }
    dispatch('add', detail);
    showElementDialog = false;
  }

  // Connection Points and Add Condition functionality removed

  function resetDiagram() {
    dispatch('reset');
  }

  // Export BPMN XML
  function exportBpmnXml() {
    dispatch('export');
  }

  // Zoom functionality
  function zoomIn() {
    dispatch('zoomIn');
  }

  function zoomOut() {
    dispatch('zoomOut');
  }

  // Toggle selection mode
  function toggleSelectionMode() {
    multiSelectionManager.toggleSelectionMode();
  }

  // Handle drag start for toolbar elements
  function handleDragStart(event, element) {
    console.log('Toolbar: Drag start with element:', element);
    const elementData = JSON.stringify(element);
    console.log('Toolbar: Element data being set:', elementData);

    try {
      // Set data with multiple MIME types for better compatibility
      event.dataTransfer.setData('application/bpmn-element', elementData);
      console.log('Toolbar: Set application/bpmn-element data');

      event.dataTransfer.setData('text/plain', elementData);
      console.log('Toolbar: Set text/plain data');

      event.dataTransfer.effectAllowed = 'copy';
      console.log('Toolbar: Set effectAllowed to copy');
    } catch (error) {
      console.error('Toolbar: Error setting drag data:', error);
    }

    // Create a custom drag image
    const dragIcon = document.createElement('div');
    dragIcon.innerHTML = `<div class="element-icon ${element.type}-icon"></div>`;
    dragIcon.style.position = 'absolute';
    dragIcon.style.top = '-1000px';
    document.body.appendChild(dragIcon);

    // Set the drag image with offset
    event.dataTransfer.setDragImage(dragIcon, 20, 20);

    // Clean up the drag icon after a short delay
    setTimeout(() => {
      document.body.removeChild(dragIcon);
    }, 0);
  }
</script>

<div class="toolbar">
  <!-- Common elements -->
  <div class="toolbar-section">
    <h3>Common Elements</h3>
    <div class="button-group">
      <button
        on:click={() => addCommonElement('task', 'task')}
        class="element-button"
        draggable="true"
        on:dragstart={(e) => handleDragStart(e, {type: 'task', subtype: 'task'})}
      >
        <div class="element-icon task-icon"></div>
        <span>Task</span>
      </button>
      <button
        on:click={() => addCommonElement('event', 'start')}
        class="element-button"
        draggable="true"
        on:dragstart={(e) => handleDragStart(e, {type: 'event', subtype: 'start'})}
      >
        <div class="element-icon start-event-icon"></div>
        <span>Start</span>
      </button>
      <button
        on:click={() => addCommonElement('event', 'end')}
        class="element-button"
        draggable="true"
        on:dragstart={(e) => handleDragStart(e, {type: 'event', subtype: 'end'})}
      >
        <div class="element-icon end-event-icon"></div>
        <span>End</span>
      </button>
      <button
        on:click={() => addCommonElement('gateway', 'exclusive')}
        class="element-button"
        draggable="true"
        on:dragstart={(e) => handleDragStart(e, {type: 'gateway', subtype: 'exclusive'})}
      >
        <div class="element-icon gateway-icon"></div>
        <span>Gateway</span>
      </button>
      <button on:click={toggleElementDialog} class="more-button">
        More Elements...
      </button>
    </div>
  </div>

  <!-- Tools section -->
  <div class="toolbar-section">
    <h3>Tools</h3>
    <div class="button-group">
      <!-- Undo/Redo Controls -->
      <UndoRedoControls />

      <!-- Selection button -->
      <button
        on:click={toggleSelectionMode}
        class="tool-button {$selectionMode ? 'active' : ''}"
        title="Toggle Selection Mode"
      >
        <div class="tool-icon selection-icon"></div>
        <span>Selection</span>
      </button>
      <!-- Zoom buttons -->
      <button on:click={zoomIn} class="zoom-button" title="Zoom In">
        <span class="zoom-icon">+</span>
        <span>Zoom In</span>
      </button>
      <button on:click={zoomOut} class="zoom-button" title="Zoom Out">
        <span class="zoom-icon">-</span>
        <span>Zoom Out</span>
      </button>
      <!-- Export button -->
      <button on:click={exportBpmnXml} class="export-button" title="Export BPMN XML">
        <div class="tool-icon export-icon"></div>
        <span>Export XML</span>
      </button>
      <!-- Reset button -->
      <button on:click={resetDiagram}>
        Reset
      </button>
    </div>
  </div>
</div>

{#if showElementDialog}
  <ElementCreationDialog
    on:close={toggleElementDialog}
    on:add={handleAddElement}
  />
{/if}

<style>
  .toolbar {
    background-color: #f5f5f5;
    border-bottom: 1px solid #ddd;
    padding: 10px;
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
  }

  .toolbar-section {
    display: flex;
    flex-direction: column;
  }

  .toolbar-section h3 {
    font-size: 14px;
    margin: 0 0 8px 0;
    color: #555;
  }

  .button-group {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  button {
    background-color: #fff;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 6px 12px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
  }

  button:hover {
    background-color: #f0f0f0;
    border-color: #ccc;
  }

  .element-button {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 8px;
  }

  .element-icon {
    width: 24px;
    height: 24px;
    margin-bottom: 4px;
    background-repeat: no-repeat;
    background-position: center;
    background-size: contain;
  }

  .task-icon {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect x='2' y='4' width='20' height='16' rx='2' ry='2' fill='white' stroke='black' stroke-width='1.5'/%3E%3C/svg%3E");
  }

  .start-event-icon {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='10' fill='white' stroke='black' stroke-width='1.5'/%3E%3C/svg%3E");
  }

  .end-event-icon {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='10' fill='white' stroke='black' stroke-width='3'/%3E%3C/svg%3E");
  }

  .gateway-icon {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpolygon points='12,2 22,12 12,22 2,12' fill='white' stroke='black' stroke-width='1.5'/%3E%3Cpath d='M7,12 L17,12 M12,7 L12,17' stroke='black' stroke-width='1.5'/%3E%3C/svg%3E");
  }

  .more-button {
    background-color: #e6f7ff;
    border-color: #91d5ff;
    color: #1890ff;
  }

  .more-button:hover {
    background-color: #bae7ff;
    border-color: #1890ff;
  }

  .zoom-button {
    display: flex;
    align-items: center;
    gap: 5px;
    background-color: #f0f0f0;
  }

  .zoom-icon {
    font-size: 16px;
    font-weight: bold;
  }

  .tool-button {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 8px;
  }

  .tool-button.active {
    background-color: #e6f7ff;
    border-color: #1890ff;
    color: #1890ff;
  }

  .tool-icon {
    width: 24px;
    height: 24px;
    margin-bottom: 4px;
    background-repeat: no-repeat;
    background-position: center;
    background-size: contain;
  }

  .selection-icon {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M3,3 h18 v18 h-18 z' fill='none' stroke='black' stroke-width='1.5' stroke-dasharray='4,2'/%3E%3Cpath d='M7,9 h10 M7,12 h10 M7,15 h10' stroke='black' stroke-width='1.5'/%3E%3C/svg%3E");
  }

  .export-icon {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M19,9 L15,9 L15,3 L9,3 L9,9 L5,9 L12,16 L19,9 Z M5,18 L5,20 L19,20 L19,18 L5,18 Z' fill='none' stroke='black' stroke-width='1.5'/%3E%3C/svg%3E");
  }

  .export-button {
    background-color: #e6f7ff;
    border-color: #91d5ff;
    color: #1890ff;
  }
</style>
