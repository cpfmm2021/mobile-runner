<script>
  import { onMount } from 'svelte';
  import Home from './lib/Home.svelte';
  import Game from './lib/Game.svelte';

  let currentRoute = '/';

  onMount(() => {
    function handleHash() {
      currentRoute = window.location.hash.slice(1) || '/';
    }

    window.addEventListener('hashchange', handleHash);
    handleHash();

    return () => {
      window.removeEventListener('hashchange', handleHash);
    };
  });
</script>

<main>
  {#if currentRoute === '/'}
    <Home />
  {:else if currentRoute === '/game'}
    <Game />
  {/if}
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    overflow: hidden;
    position: fixed;
    width: 100%;
    height: 100%;
    touch-action: none;
  }

  :global(*) {
    box-sizing: border-box;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
  }

  main {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
  }
</style>
