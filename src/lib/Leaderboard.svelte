<!-- Leaderboard.svelte -->
<script>
    import { onMount } from 'svelte';
    import { gameState } from './stores.js';

    let scores = [];
    
    // 로컬 스토리지에서 점수 불러오기
    onMount(() => {
        const savedScores = localStorage.getItem('leaderboard');
        if (savedScores) {
            scores = JSON.parse(savedScores);
        }
    });

    // 새로운 점수 추가
    export function addScore(score) {
        scores = [...scores, { score, date: new Date().toISOString() }]
            .sort((a, b) => b.score - a.score) // 높은 점수순으로 정렬
            .slice(0, 10); // 상위 10개만 유지

        // 로컬 스토리지에 저장
        localStorage.setItem('leaderboard', JSON.stringify(scores));
    }
</script>

<div class="leaderboard">
    <h2>Leaderboard</h2>
    <div class="scores">
        {#if scores.length === 0}
            <p>No scores yet!</p>
        {:else}
            {#each scores as {score, date}, i}
                <div class="score-item">
                    <span class="rank">#{i + 1}</span>
                    <span class="score">{score}</span>
                    <span class="date">{new Date(date).toLocaleDateString()}</span>
                </div>
            {/each}
        {/if}
    </div>
</div>

<style>
    .leaderboard {
        position: absolute;
        top: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.8);
        padding: 15px;
        border-radius: 10px;
        color: white;
        min-width: 200px;
        max-height: 400px;
        overflow-y: auto;
    }

    h2 {
        margin: 0 0 15px 0;
        text-align: center;
        font-size: 1.2em;
        color: #FFD700;
    }

    .scores {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .score-item {
        display: grid;
        grid-template-columns: auto 1fr auto;
        gap: 10px;
        align-items: center;
        padding: 5px;
        border-radius: 5px;
        background: rgba(255, 255, 255, 0.1);
    }

    .rank {
        font-weight: bold;
        color: #FFD700;
    }

    .score {
        font-weight: bold;
    }

    .date {
        font-size: 0.8em;
        color: #aaa;
    }

    /* 상위 3개 점수 강조 */
    .score-item:nth-child(1) {
        background: rgba(255, 215, 0, 0.2);
    }
    .score-item:nth-child(2) {
        background: rgba(192, 192, 192, 0.2);
    }
    .score-item:nth-child(3) {
        background: rgba(205, 127, 50, 0.2);
    }
</style>
