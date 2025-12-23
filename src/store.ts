import { create } from 'zustand'

export type GameOverCause = 'goal' | 'bomb_explosion' | 'unknown'

interface GameState {
    isPlaying: boolean
    isGameOver: boolean
    gameOverCause: GameOverCause | null
    score: number
    replayUrl: string | null
    shakeIntensity: number
    activeEvent: string | null
    micVolume: number
    startGame: () => void
    endGame: (cause?: GameOverCause) => void
    resetGame: () => void
    incrementScore: () => void
    setScore: (score: number) => void
    setReplayUrl: (url: string | null) => void
    triggerShake: (intensity: number) => void
    setShakeIntensity: (intensity: number) => void
    setActiveEvent: (event: string | null) => void
    setMicVolume: (volume: number) => void
}

export const useGameStore = create<GameState>((set) => ({
    isPlaying: false,
    isGameOver: false,
    gameOverCause: null,
    score: 0,
    replayUrl: null,
    shakeIntensity: 0,
    activeEvent: null,
    micVolume: 0,
    startGame: () =>
        set({
            isPlaying: true,
            isGameOver: false,
            gameOverCause: null,
            score: 0,
            replayUrl: null,
            shakeIntensity: 0,
            activeEvent: null,
        }),
    endGame: (cause) =>
        set({
            isPlaying: false,
            isGameOver: true,
            gameOverCause: cause ?? 'unknown',
            activeEvent: null,
        }),
    resetGame: () =>
        set({
            isPlaying: false,
            isGameOver: false,
            gameOverCause: null,
            score: 0,
            replayUrl: null,
            shakeIntensity: 0,
            activeEvent: null,
        }),
    incrementScore: () => set((state) => ({ score: state.score + 1 })),
    setScore: (score) => set({ score }),
    setReplayUrl: (url) => set({ replayUrl: url }),
    triggerShake: (intensity) =>
        set((state) => ({
            shakeIntensity: Math.min(state.shakeIntensity + intensity, 10),
        })),
    setShakeIntensity: (intensity) => set({ shakeIntensity: intensity }),
    setActiveEvent: (event) => set({ activeEvent: event }),
    setMicVolume: (volume) => set({ micVolume: volume }),
}))
