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

  let gameCanvas;
  let ctx;
  let gameLoop;
  let gameState = {
    started: false,
    score: 0
  };

  function initializeGame() {
    if (!gameCanvas) return;
    
    ctx = gameCanvas.getContext('2d');
    
    // 캔버스 크기를 화면에 맞게 설정
    function resizeCanvas() {
      gameCanvas.width = window.innerWidth;
      gameCanvas.height = window.innerHeight;
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  }

  function startGame() {
    if (gameState.started) return;
    gameState.started = true;
    gameState.score = 0;
    animate();
  }

  function animate() {
    ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
    
    // 게임 상태 그리기
    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.fillText(`Score: ${gameState.score}`, 20, 40);
    
    // 게임 루프 계속 실행
    gameLoop = requestAnimationFrame(animate);
  }
</script>

<main>
  {#if currentRoute === '/'}
    <Home />
  {:else if currentRoute === '/game'}
    <Game>
      <canvas
        bind:this={gameCanvas}
        on:click={startGame}
      />
      {#if !gameState.started}
        <div class="start-screen">
          <h1>Mobile Game</h1>
          <button on:click={startGame}>Start Game</button>
        </div>
      {/if}
    </Game>
  {/if}
</main>

<style>
  main {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
  }

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

  canvas {
    display: block;
    background-color: #000;
  }

  .start-screen {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    color: white;
  }

  h1 {
    font-size: 2rem;
    margin-bottom: 1rem;
  }

  button {
    padding: 1rem 2rem;
    font-size: 1.2rem;
    background-color: #4CAF50;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    touch-action: manipulation;
  }

  button:hover {
    background-color: #45a049;
  }
</style>
