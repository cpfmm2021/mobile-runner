import { writable } from 'svelte/store';

export const gameState = writable({
    currentStage: 1,
    currentScore: 0,
    highScore: 0,
    username: 'Player 1',
    clearedStages: [],
});

export const stages = writable([
    { id: 1, name: 'Stage 1', unlocked: true },
    { id: 2, name: 'Stage 2', unlocked: false },
    { id: 3, name: 'Stage 3', unlocked: false },
    { id: 4, name: 'Stage 4', unlocked: false },
    { id: 5, name: 'Stage 5', unlocked: false }
]);
