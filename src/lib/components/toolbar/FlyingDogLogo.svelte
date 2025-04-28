<script>
  // Function to open the link in a new window
  function openFlyingDogWebsite() {
    window.open('https://www.flyingdog.de', '_blank');
  }
</script>

<button
  class="flying-dog-logo"
  on:click={openFlyingDogWebsite}
  title="Visit Flying Dog Website"
  aria-label="Visit Flying Dog Website"
>
  <img src="/src/dogs/flyingdog.svg" alt="Flying Dog Logo" />
</button>

<style>
  .flying-dog-logo {
    position: absolute;
    top: 0;
    right: 20px;
    cursor: pointer;
    transition: transform 0.2s ease-in-out;
    z-index: 10;
    background: none;
    border: none;
    padding: 0;
    margin: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
  }

  .flying-dog-logo:hover {
    transform: scale(1.05);
  }

  .flying-dog-logo:focus {
    outline: 2px solid #1890ff;
    border-radius: 4px;
  }

  .flying-dog-logo img {
    width: auto;
    height: 80px; /* Full height of the toolbar */
  }
</style>
