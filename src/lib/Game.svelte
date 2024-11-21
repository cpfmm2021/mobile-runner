<script>
    import { onMount, onDestroy } from 'svelte';
    import { gameState } from './stores.js';

    let canvas;
    let ctx;
    let gameLoop;
    let isPaused = false;
    let showPauseMenu = false;
    let showFailModal = false; // 실패 모달 상태 추가
    let countdownValue = 3;
    
    // Game constants
    const GAME_WIDTH = window.innerWidth;
    const GAME_HEIGHT = window.innerHeight;
    const PLAYER_WIDTH = 50;
    const PLAYER_HEIGHT = 50;
    const GROUND_HEIGHT = 50;
    const JUMP_HEIGHTS = [12, 11, 10]; // 각각 2씩 낮춤 (14,13,12 -> 12,11,10)
    const JUMP_COOLDOWN = 100; // ms
    const LEVEL_LENGTH = GAME_WIDTH * 6; // 화면 너비의 6배로 수정 (3배에서 2배 증가)
    const GRAVITY = 0.4; // 중력을 1에서 0.4으로 변경
    const SCROLL_SPEED = 3; // 속도를 5에서 3으로 줄임
    
    // Game state
    let player = {
        x: 100,
        y: GAME_HEIGHT - GROUND_HEIGHT - PLAYER_HEIGHT,
        dy: 0,
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
        scrollOffset = 0;
        player = {
            x: 50,
            y: GAME_HEIGHT - GROUND_HEIGHT - PLAYER_HEIGHT,
            dy: 0,
            jumpCount: 0,
            lastJumpTime: 0
        };
        
        gameObjects = generateLevel();
        isPaused = true;  // 게임을 일시 정지 상태로 시작
        
        // 초기 렌더링
        render();
        
        // 카운트다운 시작
        startCountdown();
    }

    function startCountdown() {
        countdownValue = 3;
        const countInterval = setInterval(() => {
            countdownValue--;
            if (countdownValue === 0) {
                clearInterval(countInterval);
                setTimeout(() => {
                    countdownValue = null;
                    startGame();  // 카운트다운 후 게임 시작
                }, 1000);
            }
        }, 1000);
    }

    function startGame() {
        isPaused = false;  // 게임 시작 시 일시 정지 해제
        if (!gameLoop) {
            gameLoop = requestAnimationFrame(update);
        }
    }

    function update(currentTime) {
        if (isPaused) {
            render();  // 일시 정지 상태에서도 렌더링은 계속
            gameLoop = requestAnimationFrame(update);
            return;
        }

        // 게임 업데이트 로직
        scrollOffset += SCROLL_SPEED;
        
        // Update player
        if (player.dy !== 0) {
            player.dy += GRAVITY;
            player.y += player.dy;
        }
        
        // Ground collision
        if (player.y > GAME_HEIGHT - GROUND_HEIGHT - PLAYER_HEIGHT) {
            player.y = GAME_HEIGHT - GROUND_HEIGHT - PLAYER_HEIGHT;
            player.dy = 0;
            player.jumpCount = 0;
        }
        
        checkCollisions();
        render();
        gameLoop = requestAnimationFrame(update);
    }
    
    function generateLevel() {
        // Generate obstacles
        let lastObstacleX = GAME_WIDTH;
        let obstacles = [];
        while (lastObstacleX < LEVEL_LENGTH - PLAYER_WIDTH * 2) {
            const x = lastObstacleX + Math.random() * 300 + 200;
            const height = Math.random() * 30 + 30; // 높이를 30~60으로 조정
            const width = Math.random() * 30 + 30;
            obstacles.push({ x, width, height });
            lastObstacleX = x;
        }

        // Generate coins
        let lastCoinX = GAME_WIDTH / 2;
        let coins = [];
        while (lastCoinX < LEVEL_LENGTH - PLAYER_WIDTH * 2) {
            const x = lastCoinX + Math.random() * 200 + 100;
            const y = GAME_HEIGHT - GROUND_HEIGHT - Math.random() * 200 - 30;
            const value = Math.random() < 0.2 ? 50 : 10;  // 20% chance for 50-point coins
            coins.push({ x, y, value, collected: false });
            lastCoinX = x;
        }
        
        return {
            coins,
            obstacles,
            finishLine: { 
                x: LEVEL_LENGTH - 200,  // 레벨 끝 부분에 결승선 배치
                width: 50,
                reached: false
            }
        };
    }
    
    function checkCollisions() {
        // Check obstacle collisions
        for (const obstacle of gameObjects.obstacles) {
            const obstacleX = obstacle.x - scrollOffset;
            if (
                player.x < obstacleX + obstacle.width &&
                player.x + PLAYER_WIDTH > obstacleX &&
                player.y < GAME_HEIGHT - GROUND_HEIGHT - obstacle.height &&
                player.y + PLAYER_HEIGHT > GAME_HEIGHT - GROUND_HEIGHT - obstacle.height
            ) {
                handleGameOver();
                return;
            }
        }
        
        // Check coin collisions
        gameObjects.coins.forEach(coin => {
            if (!coin.collected) {
                const coinX = coin.x - scrollOffset;
                if (
                    player.x < coinX + 20 &&
                    player.x + PLAYER_WIDTH > coinX - 20 &&
                    player.y < coin.y + 20 &&
                    player.y + PLAYER_HEIGHT > coin.y - 20
                ) {
                    coin.collected = true;
                    $gameState.currentScore += coin.value;
                }
            }
        });
    }
    
    function handleJump() {
        const currentTime = performance.now();
        if (player.jumpCount < 3 && currentTime - player.lastJumpTime > JUMP_COOLDOWN) {
            // 현재 속도에 새로운 점프 속도를 더해줍니다
            player.dy = Math.min(player.dy, 0) - JUMP_HEIGHTS[player.jumpCount];
            player.jumpCount++;
            player.lastJumpTime = currentTime;
        }
    }
    
    function handleGameOver() {
        cancelAnimationFrame(gameLoop);
        gameLoop = null;  // gameLoop를 null로 설정하여 완전히 정지
        isPaused = true;  // 게임을 일시정지 상태로 설정
        showFailModal = true;
    }
    
    function handleRetry() {
        showFailModal = false;
        initGame();  // 게임 초기화 및 카운트다운 시작
    }

    function handleHome() {
        window.location.href = '/';
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
    
    <!-- 실패 모달 -->
    {#if showFailModal}
    <div class="modal-overlay">
        <div class="modal">
            <h2>스테이지 실패</h2>
            <div class="score-display">
                <p>획득한 점수: {$gameState.currentScore}</p>
            </div>
            <div class="modal-buttons">
                <button on:click={handleRetry}>재시도</button>
                <button on:click={handleHome}>홈으로</button>
            </div>
        </div>
    </div>
    {/if}
    
    <div class="hud">
        <div class="stage-info">스테이지 {$gameState.currentStage}</div>
        <div class="progress-bar">
            <div class="progress" style="width: {(scrollOffset / LEVEL_LENGTH) * 100}%"></div>
        </div>
        <div class="score">점수: {$gameState.currentScore}</div>
    </div>
    
    {#if countdownValue !== null}
        <div class="countdown">{countdownValue}</div>
    {/if}
    
    {#if showPauseMenu}
        <div class="pause-menu">
            <h2>일시정지</h2>
            <div class="stats">
                <p>거리: {Math.floor(scrollOffset/100)}m / {Math.floor(LEVEL_LENGTH/100)}m</p>
                <p>코인: {$gameState.currentScore}</p>
            </div>
            <button on:click={() => {
                isPaused = false;
                showPauseMenu = false;
                startCountdown();
            }}>계속하기</button>
            <button on:click={() => {
                window.location.hash = '/';
            }}>홈으로</button>
        </div>
    {/if}
    
    <div class="jump-buttons">
        <button class="jump-button left" on:click={handleJump}>점프</button>
        <button class="jump-button right" on:click={handleJump}>점프</button>
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
        top: 1rem;
        left: 1rem;
        right: 1rem;
        color: white;
        display: flex;
        align-items: center;
        gap: 20px;  
        padding: 0 20px;
    }
    
    .stage-info {
        font-size: 1.2rem;
        color: white;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
        white-space: nowrap;  
    }
    
    .progress-bar {
        flex: 1;  
        height: 10px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 5px;
        overflow: hidden;
        min-width: 200px;  
    }
    
    .progress {
        height: 100%;
        background: #4CAF50;
        transition: width 0.3s ease;
    }
    
    .score {
        font-size: 1.2rem;
        color: white;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
        white-space: nowrap;  
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
    
    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    }
    
    .modal {
        background: #1a1a1a;
        padding: 2rem;
        border-radius: 10px;
        text-align: center;
        color: white;
        box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
        min-width: 300px;
    }
    
    .score-display {
        margin: 1rem 0;
        padding: 1rem;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 5px;
    }
    
    .score-display p {
        margin: 0.5rem 0;
        font-size: 1.1rem;
    }
    
    .modal h2 {
        margin: 0 0 1.5rem 0;
        font-size: 1.5rem;
    }
    
    .modal-buttons {
        display: flex;
        gap: 1rem;
        justify-content: center;
    }
    
    .modal button {
        padding: 0.8rem 1.5rem;
        border: none;
        border-radius: 5px;
        background: #333;
        color: white;
        font-size: 1rem;
        cursor: pointer;
        transition: background 0.3s;
    }
    
    .modal button:hover {
        background: #444;
    }
    
    .progress-bar {
        width: 200px;
        height: 10px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 5px;
        overflow: hidden;
        margin: 10px 0;
    }
    
    .progress {
        height: 100%;
        background: #4CAF50;
        transition: width 0.3s ease;
    }
</style>
