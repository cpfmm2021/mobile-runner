<script>
    import { onMount, onDestroy } from 'svelte';
    import { gameState } from './stores.js';

    // Base64로 인코딩된 펭귄 이미지
    const PENGUIN_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAA7AAAAOwBeShxvQAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAMFSURBVFiF7ZZNaBNBGIbfmd1sNt1NE5PWxlTB1l8QehHEkyge1INnEURBPAiCQkWkIF4EQQQp4kUQFBE8CaIHQQ9ePAgePAmKICIIIv5V26atkTY/m93ZHLLJJk26STcJevGDYXdnvp3ned+Z2dkF/vcw1QN3dYUDhmUeYYwdkEL0xGKxH9U6qiqAaZoHOOc3AawFACHEJ8bYwVgslquWRFUApmnuIqI7ADoWNH8C0B+Lxd5Xw+OqFDRN8wgR3UexeACIAtijado+n8/nrYZLxRkwDGM7ET0EEFjieAyAR0p5NhQKPV8tmYoykM/ntwF4AiCyjPsGgCQRnQiFQs9WQ8YxA4lEog3ALQADACpZ2XoA7BVCnA6Hw09XQsYxA0KIfQAuAGhfAXArgJ1SynOhUOjRcmQcA3DO9wI4B6B1FQG3ANgupTwfDAYfOJFxDEBEuwGcBdBcAXAzgK1CiIuhUOiuExnHAES0E8AZAE0rAG4CsFlKeSkYDN52IuMYgIh2ADgNoLEC4EYAvUKIy8Fg8KYTGccARLQNwEkAgQqA6wH0SCmvBIPB605kHAMQ0VYAxwHUVQBcB6BLSnktEAhccyLjGICINgM4BsBXAXAtgA4p5fVAIHDViYxjACLaBOAIAG8FwF4A7VLKG36//4oTGccARLQRwGEAngqAPQDapJQ3/X7/JScyjgGIaAOAgwBUB2AVQKuU8rbP57vgRMYxABGtB3AAgOoArABokVLe8fl85ysh4zgDRNQN4CQAhwUXAEBEzVLK+16v91wlZBwDEFEngOMAnAZcAAAiapJS9nk8np+VkHEMQETrAOwH4DSVCwAgokYp5YcFZM6sNgMdAI4CcHoEFwBARPVE9FFV1TOrzUAbgEMAnNbxAgCIqE5K+UlV1VOrzUAUwBEATjNZAAAR+YQQn1VVPbnaGYgAOAzA6TFbAAAReYUQX1RVPbHaDIQBHALg9CJaAAARuYUQ31RVPb7aDIQAHATg9CpeAAARuaSU31VVPbbaDDQDOADAaS0vAICIHEKIn6qqHl1tBgIA9gFwWskLAJBSOoQQv1RVPbLaDPgB7AXgtJoB4C9HZcHvMyL8UAAAAABJRU5ErkJggg==';

    let canvas;
    let ctx;
    let gameLoop;
    let isPaused = false;
    let showPauseMenu = false; // 일시정지 메뉴 표시 여부
    let showFailModal = false; // 실패 모달 표시 여부
    let showSuccessModal = false; // 성공 모달 표시 여부
    let countdownValue = 3;
    let isCountingDown = false;
    let gameStarted = false;
    let penguinImage;
    
    // Game constants
    let GAME_WIDTH = window.innerWidth;
    let GAME_HEIGHT = window.innerHeight;
    const PLAYER_WIDTH = 40;
    const PLAYER_HEIGHT = 40;
    const GROUND_HEIGHT = 50;
    const JUMP_HEIGHTS = [12, 11, 10]; // 각각 2씩 낮춤 (14,13,12 -> 12,11,10)
    const JUMP_COOLDOWN = 100; // ms
    const GRAVITY = 0.4; // 중력을 1에서 0.4으로 변경
    const SCROLL_SPEED = 3; // 속도를 5에서 3으로 줄임
    const JUMP_FORCE = 10; // 점프력
    
    // 화면 크기가 변경될 때마다 게임 크기 업데이트
    function handleResize() {
        GAME_WIDTH = window.innerWidth;
        GAME_HEIGHT = window.innerHeight;
        if (canvas) {
            canvas.width = GAME_WIDTH;
            canvas.height = GAME_HEIGHT;
        }
    }

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
        x: GAME_WIDTH * 0.2,  // 화면 너비의 20% 위치로 조정 (점프 버튼 우측)
        y: GAME_HEIGHT - GROUND_HEIGHT - PLAYER_HEIGHT,
        velocityY: 0,
        onGround: true,
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
        BRONZE: { value: 10, color: '#CD7F32', probability: 0.7, radius: 18 },
        SILVER: { value: 20, color: '#C0C0C0', probability: 0.2, radius: 18 },
        GOLD: { value: 50, color: '#FFD700', probability: 0.1, radius: 18 }
    };

    const STAGE_BACKGROUNDS = {
        1: {
            sky: '#87CEEB',  // 하늘색
            ground: '#90EE90',  // 연한 녹색
            obstacle: '#8B4513',  // 갈색
            player: '#FF1493'  // 진한 핑크
        },
        2: {
            sky: '#4B0082',  // 진한 보라색
            ground: '#9370DB',  // 중간 보라색
            obstacle: '#483D8B',  // 어두운 보라색
            player: '#FFD700'  // 금색
        },
        3: {
            sky: '#FFB6C1',  // 연한 분홍색
            ground: '#FFA07A',  // 연한 주황색
            obstacle: '#8B0000',  // 어두운 빨간색
            player: '#4169E1'  // 로얄 블루
        },
        4: {
            sky: '#20B2AA',  // 청록색
            ground: '#48D1CC',  // 밝은 청록색
            obstacle: '#008B8B',  // 어두운 청록색
            player: '#FFD700'  // 금색
        },
        5: {
            sky: '#E6E6FA',  // 연한 라벤더
            ground: '#DDA0DD',  // 자주색
            obstacle: '#8B6914',  // 어두운 골드
            player: '#32CD32'  // 라임 그린
        },
        6: {
            sky: '#FF69B4',  // 핫 핑크
            ground: '#FFB6C1',  // 연한 핑크
            obstacle: '#8B0A50',  // 어두운 핑크
            player: '#4169E1'  // 로얄 블루
        },
        7: {
            sky: '#98FB98',  // 연한 초록
            ground: '#32CD32',  // 라임그린
            obstacle: '#006400',  // 어두운 초록
            player: '#FF69B4'  // 핫 핑크
        },
        8: {
            sky: '#4169E1',  // 로얄블루
            ground: '#1E90FF',  // 밝은 파랑
            obstacle: '#00008B',  // 어두운 파랑
            player: '#FFD700'  // 금색
        },
        9: {
            sky: '#9932CC',  // 다크오키드
            ground: '#BA55D3',  // 중간 보라
            obstacle: '#4B0082',  // 진한 남색
            player: '#32CD32'  // 라임 그린
        },
        10: {
            sky: '#2F4F4F',  // 다크슬레이트그레이
            ground: '#696969',  // 딤그레이
            obstacle: '#000000',  // 검정
            player: '#FF69B4'  // 핫 핑크
        }
    };

    function getStageBackground(stage) {
        // 스테이지가 10을 넘어가면 마지막 스테이지의 배경을 사용
        const safeStage = Math.min(stage, 10);
        return STAGE_BACKGROUNDS[safeStage];
    }

    function initGame() {
        // 게임 상태 초기화
        resetGame();
        
        // 카운트다운 시작
        startCountdown();
    }

    function resetGame() {
        scrollOffset = 0;
        player = {
            x: GAME_WIDTH * 0.2,  // 화면 너비의 20% 위치로 조정 (점프 버튼 우측)
            y: GAME_HEIGHT - GROUND_HEIGHT - PLAYER_HEIGHT,
            velocityY: 0,
            onGround: true,
            jumpCount: 0,
            lastJumpTime: 0
        };
        const stageConfig = getStageConfig($gameState.currentStage);
        gameObjects = generateLevel(stageConfig);
        isPaused = false;
        gameStarted = false;
        isCountingDown = false;
        
        if (gameLoop) {
            cancelAnimationFrame(gameLoop);
            gameLoop = null;
        }

        // 스테이지 1은 0점에서 시작, 그 외에는 이전 스테이지까지의 누적 점수에서 시작
        if ($gameState.currentStage === 1) {
            $gameState.score = 0;  // currentScore를 score로 수정
            $gameState.accumulatedScore = 0;
        } else {
            $gameState.score = $gameState.accumulatedScore;  // currentScore를 score로 수정
        }
    }

    function startCountdown() {
        isCountingDown = true;
        gameStarted = false;
        let count = 3;
        countdownValue = count.toString();
        
        const countInterval = setInterval(() => {
            count--;
            if (count >= 1) {
                countdownValue = count.toString();
            } else {
                countdownValue = '';
                clearInterval(countInterval);
                isCountingDown = false;
                gameStarted = true;
                isPaused = false;
                startGame();
            }
        }, 1000);
    }

    function startGame() {
        if (!gameLoop) {
            gameLoop = requestAnimationFrame(update);
        }
    }

    function update(currentTime) {
        if (!gameLoop) {
            gameLoop = requestAnimationFrame(update);
        }

        if (isPaused) {
            render();  
            return;
        }

        if (isCountingDown) {
            render();
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
        if (player.velocityY !== 0) {
            player.velocityY += GRAVITY;
            player.y += player.velocityY;
        }
        
        // Ground collision
        if (player.y > GAME_HEIGHT - GROUND_HEIGHT - PLAYER_HEIGHT) {
            player.y = GAME_HEIGHT - GROUND_HEIGHT - PLAYER_HEIGHT;
            player.velocityY = 0;
            player.onGround = true;
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
                    $gameState.score += coin.value;  // currentScore를 score로 수정
                }
            }
        }
    }
    
    function handleJump(e) {
        // 이벤트 기본 동작 방지
        e?.preventDefault();
        
        if (isPaused || !gameStarted || showFailModal || showSuccessModal) return;

        const currentTime = Date.now();
        if (currentTime - player.lastJumpTime < JUMP_COOLDOWN) return;

        if (player.jumpCount < 3) {
            player.velocityY = -JUMP_HEIGHTS[player.jumpCount];
            player.jumpCount++;
            player.lastJumpTime = currentTime;
            player.onGround = false;
        }
    }

    onMount(() => {
        canvas.width = GAME_WIDTH;
        canvas.height = GAME_HEIGHT;
        ctx = canvas.getContext('2d');

        // 펭귄 이미지 로드
        penguinImage = new Image();
        penguinImage.onload = () => {
            console.log('Penguin image loaded successfully');
        };
        penguinImage.onerror = (e) => {
            console.error('Error loading penguin image:', e);
            penguinImage = null;
        };
        penguinImage.src = PENGUIN_BASE64;
        
        window.addEventListener('keydown', (e) => {
            if (!gameStarted || isCountingDown || isPaused) return;
            
            if (e.code === 'Space' || e.code === 'ArrowUp') {
                if (player.jumpCount < 3 && Date.now() - player.lastJumpTime > JUMP_COOLDOWN) {
                    player.velocityY = -JUMP_HEIGHTS[player.jumpCount];
                    player.onGround = false;
                    player.jumpCount++;
                    player.lastJumpTime = Date.now();
                }
            }
            if (e.code === 'Escape') togglePause();
        });
        
        window.addEventListener('resize', handleResize);
        handleResize(); // 초기 크기 설정
        
        // 게임 초기화 및 시작
        initGame();
        startCountdown();

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    });

    function handleGameOver() {
        cancelAnimationFrame(gameLoop);
        gameLoop = null;
        isPaused = true;
        showFailModal = true;
        
        // 점수를 로컬 스토리지에 저장
        const savedScores = localStorage.getItem('leaderboard') || '[]';
        const scores = JSON.parse(savedScores);
        scores.push({
            score: $gameState.score,  // currentScore를 score로 수정
            date: new Date().toISOString()
        });
        // 점수 순으로 정렬하고 상위 10개만 유지
        const topScores = scores
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);
        localStorage.setItem('leaderboard', JSON.stringify(topScores));
    }
    
    function handleRetry() {
        showFailModal = false;
        resetGame();  // 게임 초기화 및 카운트다운 시작
        startCountdown();
    }

    function handleHome() {
        window.location.href = '/';
    }
    
    function handleStageSuccess() {
        // 현재 스테이지의 점수를 저장
        const currentStageScore = $gameState.score - $gameState.accumulatedScore;  // currentScore를 score로 수정
        $gameState.stageScores[$gameState.currentStage] = currentStageScore;
        
        // 누적 점수 업데이트
        $gameState.accumulatedScore = $gameState.score;  // currentScore를 score로 수정
        if (!$gameState.clearedStages.includes($gameState.currentStage)) {
            $gameState.clearedStages = [...$gameState.clearedStages, $gameState.currentStage];
        }
        if ($gameState.score > $gameState.highScore) {  // currentScore를 score로 수정
            $gameState.highScore = $gameState.score;  // currentScore를 score로 수정
        }
        cancelAnimationFrame(gameLoop);
        gameLoop = null;
        showSuccessModal = true;
    }
    
    function handleNextStage() {
        showSuccessModal = false;
        $gameState.currentStage++;
        resetGame();
        startCountdown();
    }
    
    function togglePause() {
        isPaused = !isPaused;
        showPauseMenu = isPaused;
        if (!isPaused) {
            // 게임 재개
            if (!gameLoop) {
                gameLoop = requestAnimationFrame(update);
            }
        } else {
            // 게임 일시정지
            if (gameLoop) {
                cancelAnimationFrame(gameLoop);
                gameLoop = null;
            }
        }
    }
    
    function render() {
        if (!ctx) return;
        
        const background = getStageBackground($gameState.currentStage);
        
        // Clear canvas
        ctx.fillStyle = background.sky;
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        
        // Draw ground
        ctx.fillStyle = background.ground;
        ctx.fillRect(0, GAME_HEIGHT - GROUND_HEIGHT, GAME_WIDTH, GROUND_HEIGHT);
        
        // Draw obstacles and coins
        for (const obj of gameObjects) {
            const screenX = obj.x - scrollOffset;
            
            if (screenX > -100 && screenX < GAME_WIDTH + 100) {
                if (obj.type === 'obstacle') {
                    ctx.fillStyle = background.obstacle;
                    ctx.fillRect(screenX, obj.y, obj.width, obj.height);
                } else if (obj.type === 'coin' && !obj.collected) {
                    const coinX = screenX;
                    const coinY = obj.y;
                    
                    // Draw coin
                    ctx.beginPath();
                    ctx.arc(coinX + obj.radius, coinY + obj.radius, obj.radius, 0, Math.PI * 2);
                    ctx.fillStyle = '#FFD700';  // 금색으로 변경
                    ctx.fill();
                    ctx.strokeStyle = '#FFA500';  // 주황색 테두리
                    ctx.lineWidth = 2;
                    ctx.stroke();
                    ctx.closePath();

                    // Draw coin value - 크기 줄이고 위치 조정
                    ctx.fillStyle = 'white';
                    ctx.font = '12px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(obj.value.toString(), coinX + obj.radius, coinY + obj.radius);
                }
            }
        }

        // Draw player
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(player.x, player.y, PLAYER_WIDTH, PLAYER_HEIGHT);
        
        // 테두리 그리기
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.strokeRect(player.x, player.y, PLAYER_WIDTH, PLAYER_HEIGHT);
    }
    
    let retryStage = () => {
        showFailModal = false;
        showSuccessModal = false;
        resetGame();
        startCountdown();
    };

    let nextStage = () => {
        showSuccessModal = false;
        $gameState.currentStage++;
        resetGame();
        startCountdown();
    };

    let goHome = () => {
        window.location.hash = '/';
    };
    
    onDestroy(() => {
        if (gameLoop) {
            cancelAnimationFrame(gameLoop);
        }
    });
</script>

<style>
    .game-container {
        position: relative;
        width: 100%;
        height: 100%;
        overflow: hidden;
        position: fixed;
        top: 0;
        left: 0;
    }

    canvas {
        display: block;
        width: 100%;
        height: 100%;
        touch-action: none;
    }

    .hud {
        position: fixed;
        top: 20px;
        left: 20px;
        right: 120px;
        display: flex;
        align-items: center;
        gap: 20px;
        z-index: 10;
    }

    .stage-info {
        color: white;
        font-size: 24px;
        font-weight: bold;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
        white-space: nowrap;
    }

    .progress-container {
        position: absolute;
        top: 60px;
        left: 20px;
        right: 20px;
        height: 20px;
        background: rgba(0, 0, 0, 0.5);
        border-radius: 10px;
        overflow: hidden;
    }

    .progress {
        height: 100%;
        background: #4CAF50;
        transition: width 0.3s ease;
    }

    .score {
        position: absolute;
        top: 20px;
        right: 20px;
        color: white;
        font-size: 24px;
        font-weight: bold;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
        z-index: 10;
    }

    .pause-btn {
        position: fixed;
        top: 20px;
        right: 20px;
        width: 40px;
        height: 40px;
        background: rgba(255, 255, 255, 0.2);
        border: 2px solid white;
        border-radius: 50%;
        color: white;
        font-size: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 10;
    }

    .pause-btn:hover {
        background: rgba(255, 255, 255, 0.3);
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
        background: rgba(0, 0, 0, 0.9);
        padding: 2rem;
        border-radius: 1rem;
        text-align: center;
        color: white;
        box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
        min-width: 300px;
    }

    .modal h2 {
        color: white;
        margin-bottom: 1.5rem;
        font-size: 1.8rem;
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
        color: white;
    }

    .button-group {
        display: flex;
        flex-direction: column;
        gap: 0.8rem;
        margin-top: 1rem;
    }

    .button-group button {
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

    .button-group button:hover {
        opacity: 0.9;
    }

    .success-modal {
        background: rgba(0, 0, 0, 0.9) !important;
    }

    .success-modal h2 {
        color: #4CAF50 !important;
        font-size: 1.8rem !important;
        margin-bottom: 1.5rem;
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

    .success-modal .next-stage {
        background: #4CAF50 !important;
        color: white !important;
    }

    .jump-btn {
        position: absolute;
        bottom: 20px;
        width: 80px;
        height: 80px;
        background: rgba(255, 255, 255, 0.2);
        border: none;
        border-radius: 50%;
        color: white;
        font-size: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
        user-select: none;
        -webkit-user-select: none;
        -webkit-touch-callout: none;
    }

    .jump-btn:active {
        background: rgba(255, 255, 255, 0.4);
        transform: scale(0.95);
    }

    .jump-btn.left {
        left: 20px;
    }

    .jump-btn.right {
        right: 20px;
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
        background: rgba(0, 0, 0, 0.9);
        padding: 2rem;
        border-radius: 1rem;
        text-align: center;
        color: white;
        box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
        min-width: 300px;
    }

    .modal h2 {
        color: white;
        margin-bottom: 1.5rem;
        font-size: 1.8rem;
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
        color: white;
    }

    .button-group {
        display: flex;
        flex-direction: column;
        gap: 0.8rem;
        margin-top: 1rem;
    }

    .button-group button {
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

    .button-group button:hover {
        opacity: 0.9;
    }

    .success-modal {
        background: rgba(0, 0, 0, 0.9) !important;
    }

    .success-modal h2 {
        color: #4CAF50 !important;
        font-size: 1.8rem !important;
        margin-bottom: 1.5rem;
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

    .success-modal .next-stage {
        background: #4CAF50 !important;
        color: white !important;
    }

    .countdown {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 64px;
        color: white;
        font-weight: bold;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
        z-index: 1000;
    }
</style>

<div class="game-container">
    <canvas bind:this={canvas} width={GAME_WIDTH} height={GAME_HEIGHT}></canvas>
    
    <div class="hud">
        <div class="score">Score: {$gameState.score}</div>
        <div class="progress-container">
            <div class="progress" style="width: {(scrollOffset / getStageConfig($gameState.currentStage).LEVEL_LENGTH) * 100}%"></div>
        </div>
        <div class="stage-info">Stage {$gameState.currentStage}</div>
    </div>

    <button 
        class="jump-btn left" 
        on:touchstart|preventDefault|stopPropagation={handleJump}
        on:mousedown|preventDefault={handleJump}
    >↑</button>
    <button 
        class="jump-btn right" 
        on:touchstart|preventDefault|stopPropagation={handleJump}
        on:mousedown|preventDefault={handleJump}
    >↑</button>
    <button class="pause-btn" on:click={togglePause}>⏸</button>

    {#if showPauseMenu}
    <div class="modal-overlay" on:click|self={togglePause}>
        <div class="modal">
            <h2>일시정지</h2>
            <div class="score-display">
                <p>스테이지: {$gameState.currentStage}</p>
                <p>점수: {$gameState.score}</p>
            </div>
            <div class="button-group">
                <button on:click={togglePause}>계속하기</button>
                <button on:click={goHome}>홈으로</button>
            </div>
        </div>
    </div>
    {/if}

    {#if showFailModal}
    <div class="modal-overlay">
        <div class="modal">
            <h2>스테이지 실패</h2>
            <div class="score-display">
                <p>획득한 점수: {$gameState.score}</p>
            </div>
            <div class="button-group">
                <button on:click={retryStage}>재도전</button>
                <button on:click={goHome}>홈으로</button>
            </div>
        </div>
    </div>
    {/if}

    {#if showSuccessModal}
    <div class="modal-overlay">
        <div class="modal success-modal">
            <h2>스테이지 {$gameState.currentStage} 클리어!</h2>
            <div class="stats">
                <p>점수: {$gameState.score}</p>
            </div>
            <div class="button-group">
                <button on:click={retryStage}>재도전</button>
                <button on:click={goHome}>홈으로</button>
                <button class="next-stage" on:click={nextStage}>다음 스테이지</button>
            </div>
        </div>
    </div>
    {/if}
    
    {#if countdownValue !== ''}
        <div class="countdown">{countdownValue}</div>
    {/if}
</div>
