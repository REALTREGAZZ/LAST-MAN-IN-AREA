import { useFrame, useThree } from '@react-three/fiber'
import { useGameStore } from '../store'
import * as THREE from 'three'
import { useRef } from 'react'

export const CameraShake = () => {
    const { camera } = useThree()

    const isPlaying = useGameStore(state => state.isPlaying)
    const isGameOver = useGameStore(state => state.isGameOver)
    const elapsed = useGameStore(state => state.score)

    const additionalIntensity = useGameStore(state => state.shakeIntensity)
    const setShakeIntensity = useGameStore(state => state.setShakeIntensity)

    const originalPos = useRef(new THREE.Vector3(0, 8, 16))
    const originalRotation = useRef(new THREE.Euler())

    const sampleAccumulator = useRef(0)
    const currentOffset = useRef(new THREE.Vector3())
    const currentRotOffset = useRef(new THREE.Euler())

    useFrame((_state, delta) => {
        if (isGameOver) {
            if (additionalIntensity > 0) setShakeIntensity(0)
            return
        }

        if (!isPlaying) {
            camera.position.lerp(originalPos.current, delta * 5)
            camera.rotation.set(camera.rotation.x, camera.rotation.y, camera.rotation.z * 0.9)
            if (additionalIntensity > 0) setShakeIntensity(0)
            return
        }

        const isMaximumChaos = elapsed >= 120
        const baseIntensity = isMaximumChaos ? 0.5 : 0

        const intensity = baseIntensity + additionalIntensity

        sampleAccumulator.current += delta
        const sampleInterval = 1 / 30
        if (sampleAccumulator.current >= sampleInterval) {
            sampleAccumulator.current = 0

            currentOffset.current.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
            currentRotOffset.current.set(
                (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.5) * 1,
            )
        }

        if (intensity > 0) {
            camera.position.set(
                originalPos.current.x + currentOffset.current.x * intensity,
                originalPos.current.y + currentOffset.current.y * intensity,
                originalPos.current.z + currentOffset.current.z * intensity,
            )

            const rotationShake = intensity * 0.02
            camera.rotation.set(
                originalRotation.current.x + currentRotOffset.current.x * rotationShake,
                originalRotation.current.y + currentRotOffset.current.y * rotationShake,
                originalRotation.current.z + currentRotOffset.current.z * rotationShake,
            )
        } else {
            camera.position.lerp(originalPos.current, delta * 5)
            camera.rotation.set(camera.rotation.x, camera.rotation.y, camera.rotation.z * 0.9)
        }

        if (additionalIntensity > 0) {
            const decayPerSecond = isMaximumChaos ? 0.92 : 0.6
            const next = additionalIntensity * Math.pow(decayPerSecond, delta)
            setShakeIntensity(next < 0.001 ? 0 : next)
        }
    })

    return null
}
