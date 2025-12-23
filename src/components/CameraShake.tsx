import { useFrame, useThree } from '@react-three/fiber'
import { useGameStore } from '../store'
import * as THREE from 'three'
import { useRef } from 'react'

export const CameraShake = () => {
    const { camera } = useThree()
    const shakeIntensity = useGameStore(state => state.shakeIntensity)
    const triggerShake = useGameStore(state => state.triggerShake)

    // Store original position and rotation to return to
    const originalPos = useRef(new THREE.Vector3(0, 8, 16))
    const originalRotation = useRef(new THREE.Euler())

    useFrame((_state, delta) => {
        if (shakeIntensity > 0) {
            // Dynamic shake based on intensity - MORE DRAMATIC!
            const shake = shakeIntensity * 0.5 // Increased from 0.2 to 0.5
            camera.position.x = originalPos.current.x + (Math.random() - 0.5) * shake
            camera.position.y = originalPos.current.y + (Math.random() - 0.5) * shake
            camera.position.z = originalPos.current.z + (Math.random() - 0.5) * shake

            // Add rotation shake for more impact
            const rotationShake = shakeIntensity * 0.02
            camera.rotation.z = (Math.random() - 0.5) * rotationShake
            camera.rotation.x = originalRotation.current.x + (Math.random() - 0.5) * rotationShake * 0.5
            camera.rotation.y = originalRotation.current.y + (Math.random() - 0.5) * rotationShake * 0.5

            // Dynamic decay: stronger shakes last longer
            const decaySpeed = shakeIntensity > 5 ? 5 : 10
            triggerShake(Math.max(0, shakeIntensity - delta * decaySpeed))
        } else {
            // Return to original smoothly
            camera.position.lerp(originalPos.current, delta * 5)
            camera.rotation.z *= 0.9 // Smooth rotation return
        }
    })

    return null
}
