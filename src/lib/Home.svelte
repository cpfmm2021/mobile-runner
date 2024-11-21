<script>
    import { gameState } from './stores.js';

    const TOTAL_STAGES = 5;
</script>

<div class="home-container">
    <h1 class="game-title">RUNNER GAME</h1>
    
    <div class="user-info">
        <div class="username">Player: {$gameState.username || 'Guest'}</div>
        <div class="high-score">High Score: {$gameState.highScore}</div>
    </div>

    <div class="stages-container">
        {#each Array(TOTAL_STAGES) as _, index}
            <button 
                class="stage-button"
                class:cleared={$gameState.clearedStages.includes(index + 1)}
                class:locked={index > 0 && !$gameState.clearedStages.includes(index)}
                on:click={() => {
                    if (index === 0 || $gameState.clearedStages.includes(index)) {
                        $gameState.currentStage = index + 1;
                        window.location.hash = '/game';
                    }
                }}
            >
                Stage {index + 1}
                {#if $gameState.clearedStages.includes(index + 1)}
                    <span class="clear-text">Clear!</span>
                {/if}
            </button>
        {/each}
    </div>
</div>

<style>
    .home-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        background: linear-gradient(to bottom, #87CEEB, #4682B4);
        padding: 20px;
    }

    .game-title {
        font-size: 3rem;
        color: white;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        margin-bottom: 2rem;
    }

    .user-info {
        background: rgba(255, 255, 255, 0.9);
        padding: 1rem 2rem;
        border-radius: 10px;
        margin-bottom: 2rem;
        text-align: center;
    }

    .username {
        font-size: 1.2rem;
        margin-bottom: 0.5rem;
    }

    .high-score {
        font-size: 1.2rem;
        color: #4CAF50;
    }

    .stages-container {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        width: 100%;
        max-width: 800px;
    }

    .stage-button {
        position: relative;
        padding: 1rem;
        font-size: 1.2rem;
        background: white;
        border: none;
        border-radius: 10px;
        cursor: pointer;
        transition: transform 0.2s, background-color 0.2s;
    }

    .stage-button:hover:not(.locked) {
        transform: translateY(-2px);
    }

    .stage-button.cleared {
        background: #4CAF50;
        color: white;
    }

    .stage-button.locked {
        background: #ccc;
        cursor: not-allowed;
        opacity: 0.7;
    }

    .clear-text {
        position: absolute;
        top: -10px;
        right: -10px;
        background: gold;
        color: black;
        padding: 0.2rem 0.5rem;
        border-radius: 15px;
        font-size: 0.8rem;
        transform: rotate(15deg);
    }
</style>
