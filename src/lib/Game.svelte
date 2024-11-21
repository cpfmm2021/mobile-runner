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
    
    // 코인 타입 정의
    const COIN_TYPES = {
        BRONZE: { value: 10, color: '#CD7F32', probability: 0.7, radius: 12 },
        SILVER: { value: 20, color: '#C0C0C0', probability: 0.2, radius: 12 },
        GOLD: { value: 50, color: '#FFD700', probability: 0.1, radius: 12 }
    };

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
        isPaused = true;

        // 스테이지 1은 0점에서 시작, 그 외에는 이전 스테이지까지의 누적 점수에서 시작
        if ($gameState.currentStage === 1) {
            $gameState.currentScore = 0;
            $gameState.accumulatedScore = 0;
        } else {
            $gameState.currentScore = $gameState.accumulatedScore;
        }
        
        // 초기 렌더링
        render();
        
        // 카운트다운 시작
        startCountdown();
    }

    function startCountdown() {
        countdownValue = 3;
        isPaused = true;
        
        if (!gameLoop) {
            gameLoop = requestAnimationFrame(update);
        }
        
        const countdownInterval = setInterval(() => {
            countdownValue--;
            if (countdownValue === 0) {
                setTimeout(() => {
                    countdownValue = null;
                    isPaused = false;
                }, 1000);
                clearInterval(countdownInterval);
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
        const objects = [];
        let currentX = 0;

        while (currentX < stageConfig.LEVEL_LENGTH) {
            // 장애물 생성 로직
            if (Math.random() < stageConfig.OBSTACLE_DENSITY) {
                const obstacleHeight = Math.random() * (stageConfig.MAX_OBSTACLE_HEIGHT - stageConfig.MIN_OBSTACLE_HEIGHT) + stageConfig.MIN_OBSTACLE_HEIGHT;
                objects.push({
                    type: 'obstacle',
                    x: currentX,
                    y: GAME_HEIGHT - GROUND_HEIGHT - obstacleHeight,
                    width: 30,
                    height: obstacleHeight
                });
                currentX += Math.random() * (stageConfig.MAX_OBSTACLE_DISTANCE - stageConfig.MIN_OBSTACLE_DISTANCE) + stageConfig.MIN_OBSTACLE_DISTANCE;
            }

            // 코인 생성 로직
            const coinRandom = Math.random();
            let selectedCoin = null;
            
            if (coinRandom < COIN_TYPES.BRONZE.probability) {
                selectedCoin = COIN_TYPES.BRONZE;
            } else if (coinRandom < COIN_TYPES.BRONZE.probability + COIN_TYPES.SILVER.probability) {
                selectedCoin = COIN_TYPES.SILVER;
            } else if (coinRandom < COIN_TYPES.BRONZE.probability + COIN_TYPES.SILVER.probability + COIN_TYPES.GOLD.probability) {
                selectedCoin = COIN_TYPES.GOLD;
            }

            if (selectedCoin) {
                // 코인의 높이를 플레이어가 점프해서 닿을 수 있는 범위로 제한
                const maxJumpHeight = PLAYER_HEIGHT * 3; // 플레이어가 점프로 도달할 수 있는 최대 높이
                const minCoinY = GAME_HEIGHT - GROUND_HEIGHT - maxJumpHeight;
                const maxCoinY = GAME_HEIGHT - GROUND_HEIGHT - PLAYER_HEIGHT;
                const coinY = Math.random() * (maxCoinY - minCoinY) + minCoinY;

                objects.push({
                    type: 'coin',
                    x: currentX,
                    y: coinY,
                    value: selectedCoin.value,
                    color: selectedCoin.color,
                    radius: selectedCoin.radius,
                    collected: false
                });
                currentX += 50; // 코인 간격
            } else {
                currentX += 30; // 코인이 생성되지 않은 경우의 간격
            }
        }

        return objects;
    }
    
    function checkCollisions() {
        // Check obstacle collisions
        for (const obstacle of gameObjects) {
            if (obstacle.type === 'obstacle') {
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
        }
        
        // Check coin collisions
        for (const coin of gameObjects) {
            if (coin.type === 'coin' && !coin.collected) {
                const coinX = coin.x - scrollOffset;
                if (
                    player.x < coinX + coin.radius &&
                    player.x + PLAYER_WIDTH > coinX - coin.radius &&
                    player.y < coin.y + coin.radius &&
                    player.y + PLAYER_HEIGHT > coin.y - coin.radius
                ) {
                    coin.collected = true;
                    $gameState.currentScore += coin.value;
                }
            }
        }
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
        // 현재 스테이지의 점수를 저장
        const currentStageScore = $gameState.currentScore - $gameState.accumulatedScore;
        $gameState.stageScores[$gameState.currentStage] = currentStageScore;
        
        // 누적 점수 업데이트
        $gameState.accumulatedScore = $gameState.currentScore;
        
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
        ctx.fillStyle = '#87CEEB';  // 하늘색 배경
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        
        // Draw ground with space platform look
        ctx.fillStyle = '#90EE90';  // 연한 녹색 지면
        ctx.fillRect(0, GAME_HEIGHT - GROUND_HEIGHT, GAME_WIDTH, GROUND_HEIGHT);
        
        // 게임 오브젝트 그리기
        for (const obj of gameObjects) {
            const screenX = obj.x - scrollOffset;
            
            if (screenX > -100 && screenX < GAME_WIDTH + 100) {
                if (obj.type === 'obstacle') {
                    ctx.fillStyle = '#8B4513';  // 갈색 장애물
                    ctx.fillRect(screenX, obj.y, obj.width, obj.height);
                } else if (obj.type === 'coin' && !obj.collected) {
                    // 코인 외곽선 그리기
                    ctx.beginPath();
                    ctx.arc(screenX, obj.y, obj.radius, 0, Math.PI * 2);
                    ctx.fillStyle = obj.color;
                    ctx.fill();
                    ctx.strokeStyle = 'black';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                    ctx.closePath();

                    // 코인 점수 표시
                    ctx.fillStyle = 'black';
                    ctx.font = 'bold 12px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(obj.value, screenX, obj.y);
                }
            }
        }

        // 플레이어 그리기
        ctx.fillStyle = '#FF6B6B';  // 붉은색 플레이어
        ctx.fillRect(player.x, player.y, PLAYER_WIDTH, PLAYER_HEIGHT);
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
        
        // 스테이지 1은 0점으로 리셋, 그 외에는 이전 스테이지까지의 누적 점수로 리셋
        if ($gameState.currentStage === 1) {
            $gameState.currentScore = 0;
            $gameState.accumulatedScore = 0;
        } else {
            $gameState.currentScore = $gameState.accumulatedScore;
        }
        
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
                <p>점수: {$gameState.currentScore}</p>
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
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .success-modal .stats p {
        margin: 0;
        padding: 0.5rem;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 0.5rem;
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
