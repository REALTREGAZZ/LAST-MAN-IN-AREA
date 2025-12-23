import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../store'

const PARTICLE_COUNT = 100

export const Particles = () => {
    const meshRef = useRef<THREE.InstancedMesh>(null!)
    const shakeIntensity = useGameStore((state) => state.shakeIntensity)
    const isGameOver = useGameStore((state) => state.isGameOver)

    const particles = useMemo(() => {
        const temp = []
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            temp.push({
                position: new THREE.Vector3(0, -10, 0),
                velocity: new THREE.Vector3(),
                life: 0,
                color: new THREE.Color()
            })
        }
        return temp
    }, [])

    useFrame((_state, delta) => {
        if (!meshRef.current) return

        particles.forEach((p, i) => {
            if (p.life > 0) {
                p.position.add(p.velocity.clone().multiplyScalar(delta))
                p.velocity.y -= 9.81 * delta
                p.life -= delta

                const matrix = new THREE.Matrix4()
                matrix.setPosition(p.position)
                meshRef.current.setMatrixAt(i, matrix)
                meshRef.current.setColorAt(i, p.color)
            } else if (shakeIntensity > 0.1 || isGameOver) {
                // Spawn new particle
                p.life = 1 + Math.random()
                p.position.set((Math.random() - 0.5) * 10, 0, (Math.random() - 0.5) * 10)
                p.velocity.set((Math.random() - 0.5) * 5, 5 + Math.random() * 5, (Math.random() - 0.5) * 5)

                if (isGameOver) {
                    // Confetti colors
                    p.color.setHSL(Math.random(), 1, 0.5)
                } else {
                    // Dust/Sweat colors
                    p.color.set(Math.random() > 0.5 ? '#ffffff' : '#aaaaaa')
                }
            } else {
                const matrix = new THREE.Matrix4()
                matrix.setPosition(0, -10, 0)
                meshRef.current.setMatrixAt(i, matrix)
            }
        })

        meshRef.current.instanceMatrix.needsUpdate = true
        if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true
    })

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]}>
            <boxGeometry args={[0.1, 0.1, 0.1]} />
            <meshStandardMaterial />
        </instancedMesh>
    )
}
