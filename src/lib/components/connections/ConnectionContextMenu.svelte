<script>
  // Props
  export let position = { x: 0, y: 0 };
  export let connection;
  export let onAction = (action) => {};

  // Handle menu item click
  function handleMenuItemClick(action) {
    onAction(action);
  }
</script>

<div
  class="context-menu"
  style="left: {position.x}px; top: {position.y}px;"
>
  <button class="menu-item" on:click={() => handleMenuItemClick('edit-label')}>
    Edit Label
  </button>

  <button class="menu-item" on:click={() => handleMenuItemClick('delete')}>
    Delete Connection
  </button>

  <div class="menu-separator"></div>

  <button class="menu-item" class:active={connection.connectionType === 'sequence'} on:click={() => handleMenuItemClick('change-type-sequence')}>
    Sequence Flow
  </button>

  <button class="menu-item" class:active={connection.connectionType === 'message'} on:click={() => handleMenuItemClick('change-type-message')}>
    Message Flow
  </button>

  <button class="menu-item" class:active={connection.connectionType === 'association'} on:click={() => handleMenuItemClick('change-type-association')}>
    Association
  </button>


</div>

<style>
  .context-menu {
    position: fixed;
    background: white;
    border: 1px solid #ddd;
    border-radius: 4px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    min-width: 150px;
    z-index: 1000;
  }

  .menu-item {
    padding: 8px 12px;
    cursor: pointer;
    font-size: 14px;
    background: none;
    border: none;
    text-align: left;
    width: 100%;
  }

  .menu-item:hover {
    background-color: #f5f5f5;
  }

  .menu-item.active {
    font-weight: bold;
    color: #3498db;
  }

  .menu-separator {
    height: 1px;
    background-color: #ddd;
    margin: 4px 0;
  }
</style>
