<script >
  import '../styles/global.css';
</script>

<div class="app">
  <main>
    <slot />
  </main>
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  main {
    flex: 1;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100vh;
    box-sizing: border-box;
    padding: 0;
    margin: 0;
    overflow: hidden;
  }
</style>
