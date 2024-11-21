<script>
    import { onMount, onDestroy } from 'svelte';
    import { gameState } from './stores.js';

    let canvas;
    let ctx;
    let gameLoop;
    let isPaused = false;
    let showPauseMenu = false;
    let countdownValue = 3;
    
    // Game constants
    const GAME_WIDTH = window.innerWidth;
    const GAME_HEIGHT = window.innerHeight;
    const PLAYER_WIDTH = 50;
    const PLAYER_HEIGHT = 50;
    const GROUND_HEIGHT = 50;
    const JUMP_HEIGHTS = [14, 13, 12]; // 각각 1씩 낮춤 (15,14,13 -> 14,13,12)
    const JUMP_COOLDOWN = 100; // ms
    const LEVEL_LENGTH = GAME_WIDTH * 6; // 화면 너비의 6배로 수정 (3배에서 2배 증가)
    const GRAVITY = 0.4; // 중력을 1에서 0.4으로 변경
    const SCROLL_SPEED = 3; // 속도를 5에서 3으로 줄임
    
    // Game state
    let player = {
        x: 100,
        y: GAME_HEIGHT - GROUND_HEIGHT - PLAYER_HEIGHT,
        velocityY: 0,
        isJumping: false,
        jumpCount: 0,
        lastJumpTime: 0
    };
    
    let gameObjects = {
        coins: [],
        obstacles: [],
        finishLine: { 
            x: LEVEL_LENGTH - 200,  // 레벨 끝 부분에 결승선 배치
            width: 50,
            reached: false
        }
    };
    
    let progress = 0;
    let scrollOffset = 0;
    let stars = [];
    
    function initGame() {
        // Reset game state
        player = {
            x: 100,
            y: GAME_HEIGHT - GROUND_HEIGHT - PLAYER_HEIGHT,
            velocityY: 0,
            jumpCount: 0,
            lastJumpTime: 0
        };
        scrollOffset = 0;
        progress = 0;
        $gameState.currentScore = 0;
        
        // Generate stars
        stars = [];
        for (let i = 0; i < 200; i++) {
            stars.push({
                x: Math.random() * LEVEL_LENGTH,
                y: Math.random() * (GAME_HEIGHT - GROUND_HEIGHT),
                size: Math.random() * 2 + 1,
                brightness: Math.random()
            });
        }
        
        // Generate coins and obstacles
        gameObjects.coins = [];
        gameObjects.obstacles = [];
        gameObjects.finishLine = { x: LEVEL_LENGTH - GAME_WIDTH / 2, reached: false };
        
        generateLevel();
        
        // Sort obstacles and coins by x position
        gameObjects.coins.sort((a, b) => a.x - b.x);
        gameObjects.obstacles.sort((a, b) => a.x - b.x);
        
        // Start countdown
        startCountdown();
    }
    
    function generateLevel() {
        // Generate obstacles
        let lastObstacleX = GAME_WIDTH;
        while (lastObstacleX < gameObjects.finishLine.x - PLAYER_WIDTH * 2) {
            const x = lastObstacleX + Math.random() * 300 + 200;
            const height = Math.random() * 30 + 30; // 높이를 30~60으로 조정
            const width = Math.random() * 30 + 30;
            gameObjects.obstacles.push({ x, width, height });
            lastObstacleX = x;
        }

        // Generate coins
        let lastCoinX = GAME_WIDTH / 2;
        while (lastCoinX < gameObjects.finishLine.x - PLAYER_WIDTH * 2) {
            const x = lastCoinX + Math.random() * 200 + 100;
            const y = GAME_HEIGHT - GROUND_HEIGHT - Math.random() * 200 - 30;
            const value = Math.random() < 0.2 ? 50 : 10;  // 20% chance for 50-point coins
            gameObjects.coins.push({ x, y, value, collected: false });
            lastCoinX = x;
        }
    }
    
    function startCountdown() {
        countdownValue = 3;
        const countInterval = setInterval(() => {
            countdownValue--;
            if (countdownValue === 0) {
                clearInterval(countInterval);
                countdownValue = null;
                startGameLoop();
            }
        }, 1000);
    }
    
    function startGameLoop() {
        if (!gameLoop) {
            gameLoop = requestAnimationFrame(gameUpdate);
        }
    }
    
    function gameUpdate(currentTime) {
        const deltaTime = currentTime - performance.now();
        if (!isPaused) {
            updateGame(deltaTime);
            render();
        }
        gameLoop = requestAnimationFrame(gameUpdate);
    }
    
    function updateGame(deltaTime) {
        // Update player
        player.velocityY += GRAVITY;
        player.y += player.velocityY;
        
        // Ground collision
        if (player.y >= GAME_HEIGHT - GROUND_HEIGHT - PLAYER_HEIGHT) {
            player.y = GAME_HEIGHT - GROUND_HEIGHT - PLAYER_HEIGHT;
            player.velocityY = 0;
            player.jumpCount = 0; // 땅에 닿으면 점프 카운트 리셋
        }
        
        // Update scroll position
        scrollOffset += SCROLL_SPEED;
        progress = (scrollOffset / (LEVEL_LENGTH - GAME_WIDTH)) * 100;
        
        // Check collisions
        checkCollisions();
        
        // Check win condition
        if (!gameObjects.finishLine.reached && scrollOffset + player.x >= gameObjects.finishLine.x) {
            gameObjects.finishLine.reached = true;
            handleWin();
        }
    }
    
    function checkCollisions() {
        // Check coin collisions
        gameObjects.coins = gameObjects.coins.filter(coin => {
            const coinX = coin.x - scrollOffset;
            if (
                player.x < coinX + 30 &&
                player.x + PLAYER_WIDTH > coinX &&
                player.y < coin.y + 30 &&
                player.y + PLAYER_HEIGHT > coin.y
            ) {
                $gameState.currentScore += coin.value;
                return false;
            }
            return true;
        });
        
        // Check obstacle collisions
        gameObjects.obstacles.forEach(obstacle => {
            const obstacleX = obstacle.x - scrollOffset;
            if (
                player.x < obstacleX + obstacle.width &&
                player.x + PLAYER_WIDTH > obstacleX &&
                player.y + PLAYER_HEIGHT > GAME_HEIGHT - GROUND_HEIGHT - obstacle.height
            ) {
                handleGameOver();
            }
        });
    }
    
    function handleJump() {
        const currentTime = performance.now();
        if (player.jumpCount < 3 && currentTime - player.lastJumpTime > JUMP_COOLDOWN) {
            // 현재 속도에 새로운 점프 속도를 더해줍니다
            player.velocityY = Math.min(player.velocityY, 0) - JUMP_HEIGHTS[player.jumpCount];
            player.jumpCount++;
            player.lastJumpTime = currentTime;
        }
    }
    
    function handleGameOver() {
        cancelAnimationFrame(gameLoop);
        gameLoop = null;
        window.location.hash = '/';
    }
    
    function handleWin() {
        if (!$gameState.clearedStages.includes($gameState.currentStage)) {
            $gameState.clearedStages = [...$gameState.clearedStages, $gameState.currentStage];
        }
        if ($gameState.currentScore > $gameState.highScore) {
            $gameState.highScore = $gameState.currentScore;
        }
        cancelAnimationFrame(gameLoop);
        gameLoop = null;
        window.location.hash = '/';
    }
    
    function togglePause() {
        isPaused = !isPaused;
        showPauseMenu = isPaused;
    }
    
    function render() {
        if (!ctx) return;
        
        // Clear canvas
        ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        
        // Draw space background
        const gradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
        gradient.addColorStop(0, '#000022'); // 더 어두운 색상으로 변경
        gradient.addColorStop(1, '#000044'); // 더 어두운 색상으로 변경
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        
        // Draw stars with twinkling effect
        stars.forEach(star => {
            const screenX = star.x - scrollOffset * 0.5; // Parallax effect
            const wrappedX = screenX % GAME_WIDTH;
            const brightness = (Math.sin(Date.now() * 0.001 + star.brightness * 10) + 1) / 2;
            ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + brightness * 0.7})`;
            ctx.beginPath();
            ctx.arc(
                wrappedX >= 0 ? wrappedX : wrappedX + GAME_WIDTH,
                star.y,
                star.size,
                0,
                Math.PI * 2
            );
            ctx.fill();
        });
        
        // Draw ground with space platform look
        ctx.fillStyle = '#444444';
        ctx.fillRect(0, GAME_HEIGHT - GROUND_HEIGHT, GAME_WIDTH, GROUND_HEIGHT);
        
        // Add platform grid lines
        ctx.strokeStyle = '#666666';
        ctx.lineWidth = 1;
        const gridSize = 50;
        for (let x = 0; x < GAME_WIDTH; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, GAME_HEIGHT - GROUND_HEIGHT);
            ctx.lineTo(x, GAME_HEIGHT);
            ctx.stroke();
        }
        
        // Draw player
        ctx.fillStyle = 'red';
        ctx.fillRect(
            player.x,
            player.y,
            PLAYER_WIDTH,
            PLAYER_HEIGHT
        );
        
        // Draw obstacles
        ctx.fillStyle = '#666';
        gameObjects.obstacles.forEach(obstacle => {
            ctx.fillRect(
                obstacle.x - scrollOffset,
                GAME_HEIGHT - GROUND_HEIGHT - obstacle.height,
                obstacle.width,
                obstacle.height
            );
        });
        
        // Draw coins
        ctx.fillStyle = 'gold';
        gameObjects.coins.forEach(coin => {
            if (!coin.collected) {
                ctx.beginPath();
                ctx.arc(
                    coin.x - scrollOffset,
                    coin.y,
                    10,
                    0,
                    Math.PI * 2
                );
                ctx.fill();
            }
        });

        // Draw finish line
        const finishLineX = gameObjects.finishLine.x - scrollOffset;
        if (finishLineX >= 0 && finishLineX <= GAME_WIDTH) {
            ctx.fillStyle = 'white';
            ctx.fillRect(
                finishLineX,
                0,
                5,
                GAME_HEIGHT - GROUND_HEIGHT
            );
            // 체크무늬 패턴 추가
            const squareSize = 20;
            const rows = Math.floor((GAME_HEIGHT - GROUND_HEIGHT) / squareSize);
            for (let i = 0; i < rows; i++) {
                if (i % 2 === 0) {
                    ctx.fillStyle = 'black';
                } else {
                    ctx.fillStyle = 'white';
                }
                ctx.fillRect(
                    finishLineX,
                    i * squareSize,
                    5,
                    squareSize
                );
            }
        }
    }
    
    onMount(() => {
        canvas.width = GAME_WIDTH;
        canvas.height = GAME_HEIGHT;
        ctx = canvas.getContext('2d');
        
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space') handleJump();
            if (e.code === 'Escape') togglePause();
        });
        
        initGame();
    });
    
    onDestroy(() => {
        if (gameLoop) {
            cancelAnimationFrame(gameLoop);
        }
    });
</script>

<div class="game-container">
    <canvas
        bind:this={canvas}
        width={GAME_WIDTH}
        height={GAME_HEIGHT}
        on:click={handleJump}
        on:touchstart={handleJump}
    />
    
    <div class="hud">
        <div class="distance-info">
            <span class="distance">Distance: {Math.floor(scrollOffset/100)}m</span>
            <span class="total-distance">/ {Math.floor(LEVEL_LENGTH/100)}m</span>
        </div>
        <div class="progress-bar">
            <div class="progress" style="width: {progress}%"></div>
        </div>
        <div class="score">Coins: {$gameState.currentScore}</div>
        <button class="pause-button" on:click={togglePause}>
            {isPaused ? '▶' : '⏸'}
        </button>
    </div>
    
    {#if countdownValue !== null}
        <div class="countdown">{countdownValue}</div>
    {/if}
    
    {#if showPauseMenu}
        <div class="pause-menu">
            <h2>Paused</h2>
            <div class="stats">
                <p>Distance: {Math.floor(scrollOffset/100)}m / {Math.floor(LEVEL_LENGTH/100)}m</p>
                <p>Coins: {$gameState.currentScore}</p>
            </div>
            <button on:click={() => {
                isPaused = false;
                showPauseMenu = false;
                startCountdown();
            }}>Continue</button>
            <button on:click={() => {
                window.location.hash = '/';
            }}>Home</button>
        </div>
    {/if}
    
    <div class="jump-buttons">
        <button class="jump-button left" on:click={handleJump}>Jump</button>
        <button class="jump-button right" on:click={handleJump}>Jump</button>
    </div>
</div>

<style>
    .game-container {
        position: relative;
        width: 100vw;
        height: 100vh;
        overflow: hidden;
    }
    
    canvas {
        display: block;
    }
    
    .hud {
        position: absolute;
        top: 20px;
        left: 20px;
        right: 20px;
        display: flex;
        align-items: center;
        gap: 20px;
    }
    
    .distance-info {
        color: white;
        font-size: 1.2rem;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
    }
    
    .total-distance {
        opacity: 0.7;
    }
    
    .progress-bar {
        flex-grow: 1;
        height: 20px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 10px;
        overflow: hidden;
    }
    
    .progress {
        height: 100%;
        background: #4CAF50;
        transition: width 0.3s;
    }
    
    .score {
        font-size: 1.5rem;
        color: white;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
    }
    
    .pause-button {
        width: 40px;
        height: 40px;
        border: none;
        border-radius: 50%;
        background: white;
        cursor: pointer;
        font-size: 1.2rem;
    }
    
    .countdown {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 5rem;
        color: white;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
    }
    
    .pause-menu {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        padding: 2rem;
        border-radius: 10px;
        text-align: center;
        color: white;
    }
    
    .pause-menu .stats {
        margin: 1rem 0;
        font-size: 1.2rem;
    }
    
    .pause-menu button {
        display: block;
        width: 200px;
        margin: 1rem auto;
        padding: 0.5rem;
        font-size: 1.2rem;
        border: none;
        border-radius: 5px;
        background: white;
        cursor: pointer;
    }
    
    .jump-buttons {
        position: absolute;
        bottom: 20px;
        left: 20px;
        right: 20px;
        display: flex;
        justify-content: space-between;
    }
    
    .jump-button {
        width: 100px;
        height: 100px;
        border: none;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.3);
        color: white;
        font-size: 1.2rem;
        cursor: pointer;
    }
    
    .jump-button:active {
        background: rgba(255, 255, 255, 0.5);
    }
</style>
