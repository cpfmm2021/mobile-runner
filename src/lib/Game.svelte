<script>
    import { onMount, onDestroy } from 'svelte';
    import { gameState } from './stores.js';

    let canvas;
    let ctx;
    let gameLoop;
    let isPaused = false;
    let showPauseMenu = false;
    let showFailModal = false; // 실패 모달 상태 추가
    let showSuccessModal = false; // 성공 모달 상태 추가
    let countdownValue = 3;
    
    // Game constants
    const GAME_WIDTH = window.innerWidth;
    const GAME_HEIGHT = window.innerHeight;
    const PLAYER_WIDTH = 50;
    const PLAYER_HEIGHT = 50;
    const GROUND_HEIGHT = 50;
    const JUMP_HEIGHTS = [12, 11, 10]; // 각각 2씩 낮춤 (14,13,12 -> 12,11,10)
    const JUMP_COOLDOWN = 100; // ms
    const GRAVITY = 0.4; // 중력을 1에서 0.4으로 변경
    const SCROLL_SPEED = 3; // 속도를 5에서 3으로 줄임
    
    // Stage-specific constants
    function getStageConfig(stage) {
        const configs = {
            1: { // 매우 쉬움: 넓은 간격, 낮은 장애물
                LEVEL_LENGTH: GAME_WIDTH * 2,
                MIN_OBSTACLE_DISTANCE: 500,
                MAX_OBSTACLE_DISTANCE: 700,
                MIN_OBSTACLE_HEIGHT: 20,
                MAX_OBSTACLE_HEIGHT: 30,
                OBSTACLE_DENSITY: 0.5 // 장애물 수 비율 (0~1)
            },
            2: { // 매우 쉬움+
                LEVEL_LENGTH: GAME_WIDTH * 2.2,
                MIN_OBSTACLE_DISTANCE: 450,
                MAX_OBSTACLE_DISTANCE: 650,
                MIN_OBSTACLE_HEIGHT: 25,
                MAX_OBSTACLE_HEIGHT: 35,
                OBSTACLE_DENSITY: 0.6
            },
            3: { // 쉬움
                LEVEL_LENGTH: GAME_WIDTH * 2.4,
                MIN_OBSTACLE_DISTANCE: 400,
                MAX_OBSTACLE_DISTANCE: 600,
                MIN_OBSTACLE_HEIGHT: 30,
                MAX_OBSTACLE_HEIGHT: 40,
                OBSTACLE_DENSITY: 0.7
            },
            4: { // 쉬움+
                LEVEL_LENGTH: GAME_WIDTH * 2.6,
                MIN_OBSTACLE_DISTANCE: 350,
                MAX_OBSTACLE_DISTANCE: 550,
                MIN_OBSTACLE_HEIGHT: 30,
                MAX_OBSTACLE_HEIGHT: 45,
                OBSTACLE_DENSITY: 0.75
            },
            5: { // 보통
                LEVEL_LENGTH: GAME_WIDTH * 2.8,
                MIN_OBSTACLE_DISTANCE: 300,
                MAX_OBSTACLE_DISTANCE: 500,
                MIN_OBSTACLE_HEIGHT: 35,
                MAX_OBSTACLE_HEIGHT: 50,
                OBSTACLE_DENSITY: 0.8
            },
            6: { // 보통+
                LEVEL_LENGTH: GAME_WIDTH * 3,
                MIN_OBSTACLE_DISTANCE: 280,
                MAX_OBSTACLE_DISTANCE: 450,
                MIN_OBSTACLE_HEIGHT: 35,
                MAX_OBSTACLE_HEIGHT: 55,
                OBSTACLE_DENSITY: 0.85
            },
            7: { // 어려움
                LEVEL_LENGTH: GAME_WIDTH * 3.2,
                MIN_OBSTACLE_DISTANCE: 250,
                MAX_OBSTACLE_DISTANCE: 400,
                MIN_OBSTACLE_HEIGHT: 40,
                MAX_OBSTACLE_HEIGHT: 60,
                OBSTACLE_DENSITY: 0.9
            },
            8: { // 어려움+
                LEVEL_LENGTH: GAME_WIDTH * 3.4,
                MIN_OBSTACLE_DISTANCE: 220,
                MAX_OBSTACLE_DISTANCE: 370,
                MIN_OBSTACLE_HEIGHT: 40,
                MAX_OBSTACLE_HEIGHT: 65,
                OBSTACLE_DENSITY: 0.9
            },
            9: { // 매우 어려움
                LEVEL_LENGTH: GAME_WIDTH * 3.6,
                MIN_OBSTACLE_DISTANCE: 200,
                MAX_OBSTACLE_DISTANCE: 350,
                MIN_OBSTACLE_HEIGHT: 45,
                MAX_OBSTACLE_HEIGHT: 70,
                OBSTACLE_DENSITY: 0.95
            },
            10: { // 극악
                LEVEL_LENGTH: GAME_WIDTH * 4,
                MIN_OBSTACLE_DISTANCE: 180,
                MAX_OBSTACLE_DISTANCE: 330,
                MIN_OBSTACLE_HEIGHT: 45,
                MAX_OBSTACLE_HEIGHT: 75,
                OBSTACLE_DENSITY: 1
            }
        };
        return configs[stage] || configs[1];
    }
    
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
        obstacles: []
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
        
        const stageConfig = getStageConfig($gameState.currentStage);
        gameObjects = generateLevel(stageConfig);
        isPaused = true;  // 게임을 일시 정지 상태로 시작
        
        // 초기 렌더링
        render();
        
        // 카운트다운 시작
        startCountdown();
    }

    function startCountdown() {
        countdownValue = 3;
        isPaused = true;
        $gameState.currentScore = 0;  // 카운트다운 시작 시 점수 초기화
        
        if (!gameLoop) {
            gameLoop = requestAnimationFrame(update);
        }
        
        const countInterval = setInterval(() => {
            countdownValue -= 1;
            if (countdownValue === 0) {
                clearInterval(countInterval);
                countdownValue = null;
                isPaused = false;
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
        
        // Update progress
        const currentStageConfig = getStageConfig($gameState.currentStage);
        progress = (scrollOffset / currentStageConfig.LEVEL_LENGTH) * 100;
        
        // Check stage completion
        if (progress >= 100) {
            handleStageSuccess();
            return;
        }
        
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
    
    function generateLevel(stageConfig) {
        // Generate obstacles
        let lastObstacleX = GAME_WIDTH;
        let obstacles = [];
        while (lastObstacleX < stageConfig.LEVEL_LENGTH - PLAYER_WIDTH * 2) {
            const x = lastObstacleX + Math.random() * (stageConfig.MAX_OBSTACLE_DISTANCE - stageConfig.MIN_OBSTACLE_DISTANCE) + stageConfig.MIN_OBSTACLE_DISTANCE;
            const height = Math.random() * (stageConfig.MAX_OBSTACLE_HEIGHT - stageConfig.MIN_OBSTACLE_HEIGHT) + stageConfig.MIN_OBSTACLE_HEIGHT; 
            const width = Math.random() * 30 + 30;
            obstacles.push({ x, width, height });
            lastObstacleX = x;
        }

        // Generate coins
        let lastCoinX = GAME_WIDTH / 2;
        let coins = [];
        while (lastCoinX < stageConfig.LEVEL_LENGTH - PLAYER_WIDTH * 2) {
            const x = lastCoinX + Math.random() * 200 + 100;
            const y = GAME_HEIGHT - GROUND_HEIGHT - Math.random() * 200 - 30;
            const value = Math.random() < 0.2 ? 50 : 10;  // 20% chance for 50-point coins
            coins.push({ x, y, value, collected: false });
            lastCoinX = x;
        }
        
        return {
            coins,
            obstacles
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
    
    function handleStageSuccess() {
        if (!$gameState.clearedStages.includes($gameState.currentStage)) {
            $gameState.clearedStages = [...$gameState.clearedStages, $gameState.currentStage];
        }
        if ($gameState.currentScore > $gameState.highScore) {
            $gameState.highScore = $gameState.currentScore;
        }
        cancelAnimationFrame(gameLoop);
        gameLoop = null;
        showSuccessModal = true;
    }
    
    function handleNextStage() {
        showSuccessModal = false;
        $gameState.currentStage++;
        initGame();
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
    }
    
    function resetGame() {
        scrollOffset = 0;
        player = {
            x: 100,
            y: GAME_HEIGHT - GROUND_HEIGHT - PLAYER_HEIGHT,
            dy: 0,
            jumpCount: 0,
            lastJumpTime: 0
        };
        const stageConfig = getStageConfig($gameState.currentStage);
        gameObjects = generateLevel(stageConfig);
        isPaused = true;
        $gameState.currentScore = 0;
        
        if (gameLoop) {
            cancelAnimationFrame(gameLoop);
            gameLoop = null;
        }
        
        startCountdown();
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
    
    <!-- 성공 모달 -->
    {#if showSuccessModal}
        <div class="modal success-modal">
            <h2>스테이지 클리어!</h2>
            <div class="stats">
                <p>획득 점수: {$gameState.currentScore}</p>
            </div>
            <div class="button-group">
                <button on:click={resetGame}>재도전</button>
                <button on:click={() => {
                    window.location.hash = '/';
                }}>홈으로</button>
                <button class="next-stage" on:click={handleNextStage}>다음 스테이지</button>
            </div>
        </div>
    {/if}
    
    <div class="hud">
        <div class="stage-info">스테이지 {$gameState.currentStage}</div>
        <div class="progress-bar">
            <div class="progress" style="width: {(scrollOffset / getStageConfig($gameState.currentStage).LEVEL_LENGTH) * 100}%"></div>
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
                <p>거리: {Math.floor(scrollOffset/100)}m / {Math.floor(getStageConfig($gameState.currentStage).LEVEL_LENGTH/100)}m</p>
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
    
    .success-modal {
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 2rem;
        border-radius: 1rem;
        text-align: center;
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 1000;
        min-width: 300px;
    }

    .success-modal h2 {
        color: #4CAF50;
        margin-bottom: 1.5rem;
        font-size: 1.8rem;
    }

    .success-modal .stats {
        margin-bottom: 2rem;
        font-size: 1.2rem;
    }

    .success-modal .button-group {
        display: flex;
        flex-direction: column;
        gap: 0.8rem;
    }

    .success-modal button {
        padding: 1rem;
        border: none;
        border-radius: 0.5rem;
        font-size: 1.1rem;
        cursor: pointer;
        transition: opacity 0.2s;
        background: white;
        color: black;
        width: 100%;
    }

    .success-modal button:hover {
        opacity: 0.9;
    }

    .success-modal .next-stage {
        background: #4CAF50;
        color: white;
    }
</style>
