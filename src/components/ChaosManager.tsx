import { useFrame } from '@react-three/fiber'
import { useGameStore } from '../store'
import { useRef } from 'react'

export const ChaosManager = () => {
    const isPlaying = useGameStore(state => state.isPlaying)
    const setActiveEvent = useGameStore(state => state.setActiveEvent)
    const lastEventTime = useRef(0)

    useFrame((state) => {
        if (!isPlaying) return

        const time = state.clock.getElapsedTime()

        // Trigger event every 15 seconds
        if (time - lastEventTime.current > 15) {
            lastEventTime.current = time

            const events = ['MULTIBALL', 'LOW_GRAVITY', 'GIANT_BALL', 'WIND']
            const randomEvent = events[Math.floor(Math.random() * events.length)]

            setActiveEvent(randomEvent)

            // Reset event after 8 seconds
            setTimeout(() => {
                setActiveEvent(null)
            }, 8000)
        }
    })

    return null
}
