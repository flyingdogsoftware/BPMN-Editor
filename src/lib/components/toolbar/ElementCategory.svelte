<script>
  import { createEventDispatcher } from 'svelte';
  import ElementPreview from './ElementPreview.svelte';
  
  export let name;
  export let elements = [];
  
  const dispatch = createEventDispatcher();
  
  function handleAdd(event) {
    dispatch('add', event.detail);
  }
</script>

<div class="element-category">
  <h3>{name}</h3>
  <div class="element-list">
    {#each elements as element}
      <ElementPreview 
        element={element}
        on:add={handleAdd}
      />
    {/each}
  </div>
</div>

<style>
  .element-category {
    margin-bottom: 20px;
  }
  
  h3 {
    color: #666;
    font-size: 14px;
    margin: 0 0 10px 0;
    padding-bottom: 6px;
    border-bottom: 1px solid #eee;
  }
  
  .element-list {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  @media (max-width: 400px) {
    .element-list {
      grid-template-columns: 1fr;
    }
  }
</style>
