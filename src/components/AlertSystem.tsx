import { type MutableRefObject, useEffect, useMemo, useRef } from 'react'
import { useGameStore } from '../store'

const ALERT_LEAD_SECONDS = 1.5

const ORANGE = (alpha: number) => `rgba(255, 165, 0, ${alpha})`
const RED = (alpha: number) => `rgba(255, 0, 0, ${alpha})`

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

const ensureAudioContext = (ctxRef: MutableRefObject<AudioContext | null>) => {
    if (!ctxRef.current) {
        const AudioContextCtor = window.AudioContext ?? window.webkitAudioContext
        if (AudioContextCtor) ctxRef.current = new AudioContextCtor()
    }

    const ctx = ctxRef.current
    if (!ctx) return null

    if (ctx.state === 'suspended') {
        void ctx.resume()
    }

    return ctx
}

const playAirHorn = (ctx: AudioContext) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'square'
    osc.frequency.setValueAtTime(200, ctx.currentTime)

    gain.gain.setValueAtTime(0.7, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start()
    osc.stop(ctx.currentTime + 0.3)
}

const playDescendingSiren = (ctx: AudioContext) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sawtooth'
    gain.gain.setValueAtTime(0.7, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.6)

    osc.connect(gain)
    gain.connect(ctx.destination)

    const t0 = ctx.currentTime
    osc.frequency.setValueAtTime(1200, t0)
    osc.frequency.setValueAtTime(800, t0 + 0.5)
    osc.frequency.setValueAtTime(400, t0 + 1.0)

    osc.start(t0)
    osc.stop(t0 + 1.6)
}

type ContinuousSirenNodes = {
    osc: OscillatorNode
    gain: GainNode
    lfo: OscillatorNode
    lfoGain: GainNode
}

const startContinuousSiren = (ctx: AudioContext): ContinuousSirenNodes => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    const lfo = ctx.createOscillator()
    const lfoGain = ctx.createGain()

    osc.type = 'square'
    osc.frequency.setValueAtTime(800, ctx.currentTime)

    lfo.type = 'sine'
    lfo.frequency.setValueAtTime(2, ctx.currentTime)
    lfoGain.gain.setValueAtTime(500, ctx.currentTime)

    lfo.connect(lfoGain)
    lfoGain.connect(osc.frequency)

    gain.gain.setValueAtTime(0.7, ctx.currentTime)

    osc.connect(gain)
    gain.connect(ctx.destination)

    lfo.start()
    osc.start()

    return { osc, gain, lfo, lfoGain }
}

const stopContinuousSiren = (nodes: ContinuousSirenNodes | null) => {
    if (!nodes) return
    try {
        nodes.lfo.stop()
        nodes.osc.stop()
    } catch {
        // no-op
    }
}

const speak = (text: string) => {
    if (!('speechSynthesis' in window)) return
    const utter = new SpeechSynthesisUtterance(text)
    utter.rate = 1
    utter.pitch = 0.8
    utter.volume = 1
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utter)
}

const AlertFlash = ({ rgba, message }: { rgba: string; message: string }) => {
    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: rgba,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                pointerEvents: 'none',
                animation: 'alert-flash 0.3s ease-out forwards',
            }}
        >
            <div
                style={{
                    color: 'white',
                    fontFamily: 'Impact, sans-serif',
                    fontSize: '4rem',
                    textShadow: '3px 3px 0px #000',
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                    opacity: 0.9,
                }}
            >
                {message}
            </div>
            <style>{`
                @keyframes alert-flash {
                    0% { opacity: 1; }
                    100% { opacity: 0; }
                }
            `}</style>
        </div>
    )
}

const PulseOverlay = ({ rgba, message }: { rgba: string; message: string }) => {
    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: rgba,
                zIndex: 999,
                pointerEvents: 'none',
                animation: 'alert-pulse 0.4s steps(1, end) infinite',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <div
                style={{
                    color: 'white',
                    fontFamily: 'Impact, sans-serif',
                    fontSize: '3rem',
                    textShadow: '3px 3px 0px #000',
                    textTransform: 'uppercase',
                    opacity: 0.9,
                }}
            >
                {message}
            </div>
            <style>{`
                @keyframes alert-pulse {
                    0% { opacity: 1; }
                    49% { opacity: 1; }
                    50% { opacity: 0; }
                    100% { opacity: 0; }
                }
            `}</style>
        </div>
    )
}

export const AlertSystem = () => {
    const isPlaying = useGameStore(state => state.isPlaying)
    const isGameOver = useGameStore(state => state.isGameOver)
    const t = useGameStore(state => state.score)

    const audioCtxRef = useRef<AudioContext | null>(null)
    const continuousSirenRef = useRef<ContinuousSirenNodes | null>(null)

    const triggeredRef = useRef<{ [key: string]: boolean }>({})

    const isCriticalPhase = isPlaying && !isGameOver && t >= 90 && t < 120

    const phases = useMemo(
        () => [
            {
                key: 'PHASE_2',
                start: 30,
                rgba: ORANGE(0.2),
                message: 'BUILDING PRESSURE',
                sound: 'airhorn' as const,
            },
            {
                key: 'PHASE_3',
                start: 60,
                rgba: RED(0.15),
                message: 'ESCALATION',
                sound: 'descending' as const,
            },
            {
                key: 'PHASE_4',
                start: 90,
                rgba: RED(0.15),
                message: 'CRITICAL',
                sound: 'critical' as const,
            },
            {
                key: 'PHASE_5',
                start: 120,
                rgba: RED(0.15),
                message: 'CHAOS MAXIMUM',
                sound: 'maximum' as const,
            },
        ],
        [],
    )

    const activeFlash = useMemo(() => {
        if (!isPlaying || isGameOver) return null

        for (const p of phases) {
            const alertAt = p.start - ALERT_LEAD_SECONDS
            if (t >= alertAt && t < alertAt + 0.3) return p
        }

        return null
    }, [isPlaying, isGameOver, phases, t])

    useEffect(() => {
        if (!isPlaying || isGameOver) {
            triggeredRef.current = {}
            stopContinuousSiren(continuousSirenRef.current)
            continuousSirenRef.current = null
            return
        }

        for (const p of phases) {
            const alertAt = p.start - ALERT_LEAD_SECONDS
            if (t >= alertAt && !triggeredRef.current[p.key]) {
                triggeredRef.current[p.key] = true

                const ctx = ensureAudioContext(audioCtxRef)
                if (ctx) {
                    if (p.sound === 'airhorn') playAirHorn(ctx)
                    if (p.sound === 'descending') playDescendingSiren(ctx)

                    if (p.sound === 'critical' || p.sound === 'maximum') {
                        if (!continuousSirenRef.current) {
                            continuousSirenRef.current = startContinuousSiren(ctx)
                        }
                    }
                }

                if (p.sound === 'maximum') speak('CHAOS MAXIMUM')
            }
        }
    }, [isPlaying, isGameOver, phases, t])

    useEffect(() => {
        const shouldRunContinuous = isPlaying && !isGameOver && t >= 90 - ALERT_LEAD_SECONDS

        if (!shouldRunContinuous) {
            stopContinuousSiren(continuousSirenRef.current)
            continuousSirenRef.current = null
            return
        }

        const ctx = ensureAudioContext(audioCtxRef)
        if (!ctx) return

        if (!continuousSirenRef.current) {
            continuousSirenRef.current = startContinuousSiren(ctx)
        }
    }, [isPlaying, isGameOver, t])

    useEffect(() => {
        const ctx = audioCtxRef.current
        return () => {
            stopContinuousSiren(continuousSirenRef.current)
            continuousSirenRef.current = null
            void ctx?.close()
        }
    }, [])

    return (
        <>
            {isCriticalPhase && <PulseOverlay rgba={RED(clamp01(0.15))} message="CRITICAL" />}
            {flash && (
                <AlertFlash
                    key={flash.key}
                    rgba={flash.rgba}
                    message={flash.message}
                    onDone={() => setFlash(null)}
                />
            )}
        </>
    )
}
