import { useEffect, useRef } from 'react'
import { useGameStore } from '../store'

export const AudioSystem = () => {
    const isGameOver = useGameStore(state => state.isGameOver)
    const shakeIntensity = useGameStore(state => state.shakeIntensity)

    const ctxRef = useRef<AudioContext | null>(null)

    useEffect(() => {
        ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
        return () => {
            ctxRef.current?.close()
        }
    }, [])

    const playSound = (type: 'impact' | 'whistle' | 'cheer') => {
        if (!ctxRef.current) return
        const ctx = ctxRef.current
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.connect(gain)
        gain.connect(ctx.destination)

        if (type === 'impact') {
            osc.type = 'square'
            osc.frequency.setValueAtTime(100, ctx.currentTime)
            osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.1)
            gain.gain.setValueAtTime(0.5, ctx.currentTime)
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)
            osc.start()
            osc.stop(ctx.currentTime + 0.1)
        } else if (type === 'whistle') {
            osc.type = 'triangle'
            osc.frequency.setValueAtTime(2000, ctx.currentTime)
            osc.frequency.linearRampToValueAtTime(1500, ctx.currentTime + 0.1)
            gain.gain.setValueAtTime(0.3, ctx.currentTime)
            gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.3)
            osc.start()
            osc.stop(ctx.currentTime + 0.3)
        }
    }

    // Trigger impact sound on shake
    useEffect(() => {
        if (shakeIntensity > 0.5) {
            playSound('impact')
        }
    }, [shakeIntensity])

    // Trigger whistle on game over
    useEffect(() => {
        if (isGameOver) {
            playSound('whistle')
        }
    }, [isGameOver])

    return null
}
