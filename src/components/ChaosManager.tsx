import { useFrame } from '@react-three/fiber'
import { useGameStore } from '../store'
import { useRef } from 'react'

export const ChaosManager = () => {
    const isPlaying = useGameStore(state => state.isPlaying)
    const setActiveEvent = useGameStore(state => state.setActiveEvent)
    const setScore = useGameStore(state => state.setScore)

    const gameStartTime = useRef<number | null>(null)
    const lastScoreSent = useRef(0)
    const lastEventElapsed = useRef(0)
    const eventEndElapsed = useRef<number | null>(null)

    useFrame((state) => {
        if (!isPlaying) {
            gameStartTime.current = null
            lastScoreSent.current = 0
            lastEventElapsed.current = 0
            eventEndElapsed.current = null
            return
        }

        const now = state.clock.getElapsedTime()
        if (gameStartTime.current === null) gameStartTime.current = now

        const elapsed = now - gameStartTime.current
        if (Math.abs(elapsed - lastScoreSent.current) >= 0.05) {
            lastScoreSent.current = elapsed
            setScore(elapsed)
        }

        const eventInterval = elapsed >= 60 ? 20 : 15

        if (elapsed - lastEventElapsed.current > eventInterval) {
            lastEventElapsed.current = elapsed

            const events = ['MULTIBALL', 'LOW_GRAVITY', 'GIANT_BALL', 'WIND']
            const randomEvent = events[Math.floor(Math.random() * events.length)]

            setActiveEvent(randomEvent)
            eventEndElapsed.current = elapsed + 8
        }

        if (eventEndElapsed.current !== null && elapsed >= eventEndElapsed.current) {
            eventEndElapsed.current = null
            setActiveEvent(null)
        }
    })

    return null
}
