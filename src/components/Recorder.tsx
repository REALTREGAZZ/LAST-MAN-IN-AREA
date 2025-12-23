import { useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { useGameStore } from '../store'

export const Recorder = () => {
    const gl = useThree((state) => state.gl)
    const isGameOver = useGameStore((state) => state.isGameOver)
    const setReplayUrl = useGameStore((state) => state.setReplayUrl)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])
    const streamRef = useRef<MediaStream | null>(null)

    useEffect(() => {
        // Setup stream from canvas
        streamRef.current = gl.domElement.captureStream(30)
        
        const types = [
            'video/webm;codecs=vp9',
            'video/webm;codecs=vp8',
            'video/webm',
            'video/mp4'
        ]
        const supportedType = types.find(type => MediaRecorder.isTypeSupported(type)) || ''

        mediaRecorderRef.current = new MediaRecorder(streamRef.current, {
            mimeType: supportedType
        })

        mediaRecorderRef.current.ondataavailable = (e) => {
            if (e.data.size > 0) {
                chunksRef.current.push(e.data)
                // Keep only last ~5 seconds (assuming 1s chunks for simplicity, or just keep all for short sessions)
                if (chunksRef.current.length > 10) chunksRef.current.shift()
            }
        }

        mediaRecorderRef.current.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: 'video/webm' })
            const url = URL.createObjectURL(blob)
            setReplayUrl(url)
        }

        mediaRecorderRef.current.start(1000) // Chunk every second

        return () => {
            if (mediaRecorderRef.current?.state !== 'inactive') {
                mediaRecorderRef.current?.stop()
            }
        }
    }, [gl])

    useEffect(() => {
        if (isGameOver) {
            mediaRecorderRef.current?.stop()
        }
    }, [isGameOver])

    return null
}
