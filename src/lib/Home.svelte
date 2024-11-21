<script>
    import { onMount } from 'svelte';
    import { fade } from 'svelte/transition';
    import { gameState } from './stores.js';
    import { currentLang, translations } from './stores/lang';
    import { derived } from 'svelte/store';
    import Leaderboard from './Leaderboard.svelte';

    const TOTAL_STAGES = 6;
    let showLanguageSelect = false;

    // 번역 스토어 생성
    const t = derived(currentLang, ($currentLang) => (key) => {
        return translations[$currentLang][key] || key;
    });

    function toggleLanguageSelect() {
        showLanguageSelect = !showLanguageSelect;
    }

    function setLanguage(lang) {
        currentLang.set(lang);
        showLanguageSelect = false;
    }

    function startGame(stageNumber) {
        $gameState.currentStage = stageNumber;
        window.location.hash = '/game';
    }
</script>

<main>
    <div class="language-button" on:click={toggleLanguageSelect}>
        🌐
    </div>

    {#if showLanguageSelect}
        <div class="language-dropdown" transition:fade>
            <div class="select-option" on:click={() => setLanguage('ko')}>한국어</div>
            <div class="select-option" on:click={() => setLanguage('en')}>English</div>
            <div class="select-option" on:click={() => setLanguage('ja')}>日本語</div>
            <div class="select-option" on:click={() => setLanguage('de')}>Deutsch</div>
            <div class="select-option" on:click={() => setLanguage('fr')}>Français</div>
            <div class="select-option" on:click={() => setLanguage('es')}>Español</div>
            <div class="select-option" on:click={() => setLanguage('hi')}>हिन्दी</div>
            <div class="select-option" on:click={() => setLanguage('vi')}>Tiếng Việt</div>
        </div>
    {/if}

    <div class="home-container">
        <h1 class="game-title">{$t('title')}</h1>
        
        <div class="user-info">
            <div class="high-score">{$t('highScore')}: {$gameState.highScore}</div>
        </div>

        <div class="stages-container">
            {#each Array(TOTAL_STAGES) as _, index}
                <button 
                    class="stage-button {$gameState.clearedStages.includes(index + 1) ? 'cleared' : ''}"
                    disabled={index > 0 && !$gameState.clearedStages.includes(index)}
                    on:click={() => startGame(index + 1)}
                >
                    {$t('stage')} {index + 1}
                    {#if $gameState.clearedStages.includes(index + 1)}
                        <span class="clear-text">✓</span>
                    {/if}
                </button>
            {/each}
        </div>

        <div class="leaderboard-container">
            <Leaderboard />
        </div>
    </div>
</main>

<style>
    main {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        background: linear-gradient(180deg, #1a1a1a 0%, #4a4a4a 100%);
        color: white;
        position: relative;
        padding: 20px;
    }

    .home-container {
        text-align: center;
        width: 100%;
        max-width: 800px;
    }

    .game-title {
        font-size: 3em;
        margin-bottom: 1em;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
    }

    .user-info {
        margin-bottom: 2em;
        font-size: 1.2em;
    }

    .stages-container {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 1rem;
        margin-bottom: 2em;
        max-width: 800px;
        margin: 0 auto 2em;
    }

    .stage-button {
        font-size: 1.2em;
        padding: 15px;
        background: #4CAF50;
        border: none;
        border-radius: 5px;
        color: white;
        cursor: pointer;
        transition: transform 0.3s, background 0.3s;
        position: relative;
    }

    .stage-button:disabled {
        background: #666;
        cursor: not-allowed;
        opacity: 0.7;
    }

    .stage-button:not(:disabled):hover {
        transform: scale(1.05);
        background: #45a049;
    }

    .cleared {
        background: #45a049;
    }

    .clear-text {
        position: absolute;
        top: 5px;
        right: 5px;
        font-size: 0.8em;
        color: gold;
    }

    .language-button {
        position: absolute;
        top: 20px;
        left: 20px;
        padding: 10px 15px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 50%;
        cursor: pointer;
        transition: background 0.3s, transform 0.3s;
        font-size: 1.5em;
        width: 50px;
        height: 50px;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    }

    .language-button:hover {
        background: rgba(255, 255, 255, 0.2);
        transform: scale(1.1);
    }

    .language-dropdown {
        position: absolute;
        top: 80px;
        left: 20px;
        background: rgba(0, 0, 0, 0.8);
        border-radius: 10px;
        overflow: hidden;
        z-index: 1000;
        min-width: 150px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .select-option {
        padding: 12px 20px;
        cursor: pointer;
        transition: background 0.3s;
        text-align: left;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .select-option:last-child {
        border-bottom: none;
    }

    .select-option:hover {
        background: rgba(255, 255, 255, 0.2);
    }

    .leaderboard-container {
        margin-top: 1rem;
        max-width: 600px;
        margin: 1rem auto;
        max-height: 150px;
        overflow-y: auto;
        background: rgba(0, 0, 0, 0.3);
        padding: 0.8rem;
        border-radius: 10px;
    }

    @media (max-width: 600px) {
        .game-title {
            font-size: 2em;
            margin-top: 3em;
        }

        .stages-container {
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            margin-top: 1em;
        }

        .stage-button {
            font-size: 1em;
            padding: 10px;
        }

        .leaderboard-container {
            max-height: 120px;
            margin: 0.8rem auto;
            padding: 0.5rem;
        }
    }
</style>
