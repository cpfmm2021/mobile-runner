<script>
    import { gameState, stages } from './stores.js';

    function startGame(stageId) {
        if ($stages[stageId - 1].unlocked) {
            $gameState.currentStage = stageId;
            $gameState.currentScore = 0;
            window.location.hash = '/game';
        }
    }
</script>

<div class="home">
    <h1>Runner Game</h1>
    
    <div class="user-info">
        <h2>Welcome, {$gameState.username}!</h2>
        <p>High Score: {$gameState.highScore}</p>
    </div>
    
    <div class="stages">
        {#each $stages as stage}
            <button 
                class="stage-button" 
                class:unlocked={stage.unlocked}
                class:cleared={$gameState.clearedStages.includes(stage.id)}
                on:click={() => startGame(stage.id)}
                disabled={!stage.unlocked}
            >
                {stage.name}
                {#if $gameState.clearedStages.includes(stage.id)}
                    <span class="clear-badge">Clear!</span>
                {/if}
            </button>
        {/each}
    </div>
</div>

<style>
    .home {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 2rem;
        background: linear-gradient(to bottom, #1a1a1a, #2a2a2a);
        color: white;
    }

    h1 {
        font-size: 3rem;
        margin-bottom: 2rem;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
    }

    .user-info {
        text-align: center;
        margin-bottom: 2rem;
    }

    .stages {
        display: grid;
        gap: 1rem;
        width: 100%;
        max-width: 500px;
    }

    .stage-button {
        padding: 1rem;
        font-size: 1.2rem;
        border: none;
        border-radius: 8px;
        background: #333;
        color: white;
        cursor: pointer;
        position: relative;
        transition: transform 0.2s;
    }

    .stage-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .stage-button.unlocked {
        background: #4CAF50;
    }

    .stage-button.cleared {
        background: #2196F3;
    }

    .stage-button:hover:not(:disabled) {
        transform: translateY(-2px);
    }

    .clear-badge {
        position: absolute;
        right: 1rem;
        background: #FFD700;
        color: black;
        padding: 0.2rem 0.5rem;
        border-radius: 4px;
        font-size: 0.8rem;
    }
</style>
