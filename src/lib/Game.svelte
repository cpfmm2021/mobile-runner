<script>
    import { onMount, onDestroy } from 'svelte';
    import { gameState, stages } from './stores.js';

    let canvas;
    let ctx;
    let gameLoop;
    let jumpCount = 0;
    let isJumping = false;
    let canJump = true;
    let player = {
        x: 100,
        y: 0,
        width: 40,
        height: 40,
        velocityY: 0,
        baseY: 0
    };

    const JUMP_HEIGHTS = [100, 90, 80];
    const GRAVITY = 0.8;
    const JUMP_COOLDOWN = 200;
    let progress = 0;
    let obstacles = [];
    let coins = [];
    let lastJumpTime = 0;
    let gameHeight;

    onMount(() => {
        initGame();
        window.addEventListener('keydown', handleKeydown);
        window.addEventListener('resize', handleResize);
        return () => {
            cancelAnimationFrame(gameLoop);
            window.removeEventListener('keydown', handleKeydown);
            window.removeEventListener('resize', handleResize);
        };
    });

    function handleResize() {
        if (!canvas) return;
        
        // 가로 모드로 강제 설정
        canvas.width = window.innerWidth;
        canvas.height = Math.min(window.innerHeight, window.innerWidth * 0.6); // 화면 높이를 가로의 60%로 제한
        gameHeight = canvas.height;
        
        // 플레이어 위치 재설정
        player.baseY = gameHeight - player.height - 20; // 바닥에서 약간 띄움
        if (!isJumping) {
            player.y = player.baseY;
        }
    }

    function handleKeydown(event) {
        if (event.code === 'Space' && !$gameState.isPaused) {
            event.preventDefault();
            handleJump();
        } else if (event.code === 'Escape') {
            togglePause();
        }
    }

    function handleJump() {
        const currentTime = Date.now();
        if (currentTime - lastJumpTime < JUMP_COOLDOWN) return;
        
        if (jumpCount < 3 && canJump) {
            isJumping = true;
            const jumpForce = Math.sqrt(2 * GRAVITY * JUMP_HEIGHTS[jumpCount]);
            player.velocityY = -jumpForce;
            jumpCount++;
            lastJumpTime = currentTime;

            if (jumpCount === 3) {
                canJump = false;
                setTimeout(() => {
                    canJump = true;
                }, 500);
            }
        }
    }

    function initGame() {
        if (!canvas) return;
        handleResize();
        generateLevel();
        animate();
    }

    function generateLevel() {
        obstacles = [];
        coins = [];
        const levelLength = 5000;
        
        // 장애물 생성
        for (let i = 0; i < 10; i++) {
            obstacles.push({
                x: 800 + Math.random() * levelLength,
                y: player.baseY,
                width: 40,
                height: 40
            });
        }
        
        // 코인 생성 - 각 점프 높이에 맞춰서 배치
        const coinHeights = [
            player.baseY - JUMP_HEIGHTS[0], // 1단 점프 높이
            player.baseY - JUMP_HEIGHTS[1], // 2단 점프 높이
            player.baseY - JUMP_HEIGHTS[2]  // 3단 점프 높이
        ];

        for (let i = 0; i < 30; i++) {
            const heightIndex = Math.floor(Math.random() * 3);
            const value = heightIndex === 2 ? 50 : 10;

            coins.push({
                x: 600 + Math.random() * levelLength,
                y: coinHeights[heightIndex],
                width: 20,
                height: 20,
                value: value,
                collected: false
            });
        }
    }

    function animate() {
        if ($gameState.isPaused) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 배경 그리기 - 하늘색 배경
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 바닥 그리기 - 땅
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(0, player.baseY + player.height, canvas.width, canvas.height - (player.baseY + player.height));

        // 플레이어 업데이트
        player.velocityY += GRAVITY;
        player.y += player.velocityY;

        if (player.y >= player.baseY) {
            player.y = player.baseY;
            player.velocityY = 0;
            isJumping = false;
            jumpCount = 0;
        }

        // 플레이어 그리기
        ctx.fillStyle = 'red';
        ctx.fillRect(player.x, player.y, player.width, player.height);

        // 장애물 그리기
        ctx.fillStyle = '#666';
        obstacles.forEach(obstacle => {
            ctx.fillRect(obstacle.x - progress, obstacle.y, obstacle.width, obstacle.height);
            
            if (checkCollision(player, { ...obstacle, x: obstacle.x - progress })) {
                gameOver();
            }
        });

        // 코인 그리기
        coins.forEach((coin, index) => {
            if (!coin.collected) {
                ctx.fillStyle = coin.value === 50 ? 'gold' : 'yellow';
                ctx.beginPath();
                ctx.arc(coin.x - progress, coin.y + Math.sin(Date.now() / 200) * 5,
                    coin.width/2, 0, Math.PI * 2);
                ctx.fill();
                
                if (checkCollision(player, { 
                    ...coin, 
                    x: coin.x - progress,
                    width: coin.width,
                    height: coin.height 
                })) {
                    coin.collected = true;
                    $gameState.currentScore += coin.value;
                }
            }
        });

        // 프로그레스 바 그리기
        const progressWidth = canvas.width * 0.6;
        const progressX = (canvas.width - progressWidth) / 2;
        const progressY = 20;
        
        ctx.fillStyle = '#333';
        ctx.fillRect(progressX, progressY, progressWidth, 10);
        
        const currentProgress = Math.min(progress / 5000, 1);
        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(progressX, progressY, progressWidth * currentProgress, 10);

        // 점수와 점프 카운트 표시
        ctx.fillStyle = 'white';
        ctx.font = '16px Arial';
        ctx.fillText(`Score: ${$gameState.currentScore}`, canvas.width - 100, 30);
        ctx.fillText(`Jumps: ${jumpCount}/3`, 20, 30);

        progress += 5;
        
        if (progress >= 5000) {
            levelComplete();
        }

        gameLoop = requestAnimationFrame(animate);
    }

    function checkCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }

    function gameOver() {
        $gameState.isPaused = true;
        if ($gameState.currentScore > $gameState.highScore) {
            $gameState.highScore = $gameState.currentScore;
        }
        setTimeout(() => {
            window.location.hash = '/';
        }, 1000);
    }

    function levelComplete() {
        $gameState.isPaused = true;
        if (!$gameState.clearedStages.includes($gameState.currentStage)) {
            $gameState.clearedStages = [...$gameState.clearedStages, $gameState.currentStage];
        }
        if ($gameState.currentStage < 5) {
            $stages[$gameState.currentStage].unlocked = true;
        }
        setTimeout(() => {
            window.location.hash = '/';
        }, 1000);
    }

    function togglePause() {
        $gameState.isPaused = !$gameState.isPaused;
        if (!$gameState.isPaused) {
            animate();
        }
    }

    function goHome() {
        window.location.hash = '/';
    }
</script>

<div class="game-container">
    <canvas
        bind:this={canvas}
        on:click={handleJump}
        on:touchstart|preventDefault={handleJump}
    ></canvas>
    
    <button class="pause-button" on:click={togglePause}>
        {$gameState.isPaused ? '▶' : '❚❚'}
    </button>
    
    {#if $gameState.isPaused}
        <div class="pause-menu">
            <h2>Paused</h2>
            <button on:click={togglePause}>Continue</button>
            <button on:click={goHome}>Home</button>
        </div>
    {/if}
    
    <div class="controls">
        <button class="jump-button" 
            on:click={handleJump}
            on:touchstart|preventDefault={handleJump}>
            Jump
        </button>
        <button class="jump-button right" 
            on:click={handleJump}
            on:touchstart|preventDefault={handleJump}>
            Jump
        </button>
    </div>
</div>

<style>
    .game-container {
        width: 100%;
        height: 100%;
        position: relative;
        overflow: hidden;
    }

    canvas {
        display: block;
    }

    .pause-button {
        position: absolute;
        top: 20px;
        right: 20px;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.8);
        border: none;
        cursor: pointer;
        font-size: 1.2rem;
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

    .pause-menu button {
        display: block;
        width: 200px;
        margin: 1rem auto;
        padding: 0.5rem;
        font-size: 1.2rem;
        background: #4CAF50;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
    }

    .controls {
        position: absolute;
        bottom: 20px;
        left: 0;
        right: 0;
        display: flex;
        justify-content: space-between;
        padding: 0 20px;
    }

    .jump-button {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.8);
        border: none;
        font-size: 1rem;
        cursor: pointer;
    }

    .jump-button.right {
        margin-left: auto;
    }
</style>
