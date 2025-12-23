import { useEffect, useRef } from 'react'
import { useGameStore } from '../store'

export const MicInput = () => {
    const setMicVolume = useGameStore(state => state.setMicVolume)
    const isPlaying = useGameStore(state => state.isPlaying)
    const audioContextRef = useRef<AudioContext | null>(null)
    const analyserRef = useRef<AnalyserNode | null>(null)
    const dataArrayRef = useRef<Uint8Array | null>(null)
    const requestRef = useRef<number | undefined>(undefined)

    useEffect(() => {
        if (!isPlaying) {
            if (requestRef.current !== undefined) cancelAnimationFrame(requestRef.current)
            return
        }

        const startMic = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
                const source = audioContextRef.current.createMediaStreamSource(stream)
                analyserRef.current = audioContextRef.current.createAnalyser()
                analyserRef.current.fftSize = 256
                source.connect(analyserRef.current)

                const bufferLength = analyserRef.current.frequencyBinCount
                dataArrayRef.current = new Uint8Array(bufferLength)

                const update = () => {
                    if (analyserRef.current && dataArrayRef.current) {
                        analyserRef.current.getByteFrequencyData(dataArrayRef.current as any)
                        let sum = 0
                        for (let i = 0; i < dataArrayRef.current.length; i++) {
                            sum += dataArrayRef.current[i]
                        }
                        const average = sum / dataArrayRef.current.length
                        // Normalize average (0-255) to 0-1
                        setMicVolume(average / 128)
                    }
                    requestRef.current = requestAnimationFrame(update)
                }
                update()
            } catch (err) {
                console.error('Error accessing microphone:', err)
            }
        }

        startMic()

        return () => {
            if (requestRef.current !== undefined) cancelAnimationFrame(requestRef.current)
            audioContextRef.current?.close()
        }
    }, [isPlaying, setMicVolume])

    return null
}
