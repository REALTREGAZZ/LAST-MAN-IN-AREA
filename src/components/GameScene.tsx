import { Suspense, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { Environment, KeyboardControls } from '@react-three/drei'
import { EffectComposer, Noise, Pixelation, ChromaticAberration } from '@react-three/postprocessing'
import * as THREE from 'three'
import { Player } from './Player'
import { Arena } from './Arena'
import { BallSpawner } from './BallSpawner'
import { UI } from './UI'
import { AudioSystem } from './AudioSystem'
import { ChaosManager } from './ChaosManager'
import { Particles } from './Particles'
import { MicInput } from './MicInput'
import { Recorder } from './Recorder'
import { CameraShake } from './CameraShake'
import { useGameStore } from '../store'

const PhysicsWrapper = ({ children }: { children: React.ReactNode }) => {
    const activeEvent = useGameStore(state => state.activeEvent)
    const [timeScale, setTimeScale] = useState(1)

    // Dynamic Slow-Mo & Zoom of Death
    useFrame((state, delta) => {
        const balls = state.scene.getObjectsByProperty('name', 'ball') as THREE.Mesh[]
        const player = state.scene.getObjectByName('player')
        const isGameOver = useGameStore.getState().isGameOver

        if (!player) return

        // 1. Zoom of Death
        if (isGameOver) {
            const head = state.scene.getObjectByName('player-head')
            if (head) {
                const targetPos = new THREE.Vector3().copy(head.position).add(new THREE.Vector3(0, 1, 3))
                state.camera.position.lerp(targetPos, delta * 2)
                state.camera.lookAt(head.position)
            }
            return
        }

        if (balls.length === 0) return

        let nearMiss = false
        balls.forEach(ball => {
            const dist = ball.position.distanceTo(player.position)
            if (dist < 1.5) nearMiss = true // Near head/torso
        })

        if (nearMiss && timeScale === 1) {
            setTimeScale(0.3)
            setTimeout(() => setTimeScale(1), 500)
        }
    })

    return (
        <Physics gravity={[0, activeEvent === 'LOW_GRAVITY' ? -2 : -9.81, 0]} timeStep={1 / 60 * timeScale}>
            {children}
        </Physics>
    )
}

const ReactiveNoise = () => {
    const micVolume = useGameStore(state => state.micVolume)
    return <Noise opacity={0.1 + micVolume * 0.8} /> // Increased from 0.5 to 0.8 for more dramatic effect
}

const ReactiveChromaticAberration = () => {
    const micVolume = useGameStore(state => state.micVolume)
    // Only activate when screaming (volume > 0.4)
    const offset = micVolume > 0.4 ? [0.002 * micVolume, 0.002 * micVolume] as [number, number] : [0, 0] as [number, number]
    return <ChromaticAberration offset={offset} />
}

export const GameScene = () => {
    return (
        <>
            <UI />
            <AudioSystem />
            <MicInput />
            <KeyboardControls
                map={[
                    { name: 'leftLeg', keys: ['KeyA', 'ArrowLeft'] },
                    { name: 'rightLeg', keys: ['KeyD', 'ArrowRight'] },
                ]}
            >
                <Canvas
                    shadows
                    camera={{ position: [0, 5, 12], fov: 50 }}
                    onCreated={({ scene }) => { (window as any).scene = scene }}
                >
                    <ChaosManager />
                    <Recorder />
                    <CameraShake />
                    <Particles />
                    <color attach="background" args={['#111']} />

                    <Suspense fallback={null}>
                        <Environment preset="city" />
                    </Suspense>

                    <ambientLight intensity={0.5} />
                    <directionalLight position={[10, 10, 5]} intensity={2} color="#ffaa00" castShadow />

                    <Suspense fallback={null}>
                        <PhysicsWrapper>
                            <Arena />
                            <Player />
                            <BallSpawner />
                        </PhysicsWrapper>
                    </Suspense>

                    <EffectComposer>
                        <Pixelation granularity={4} />
                        <ReactiveNoise />
                        <ReactiveChromaticAberration />
                    </EffectComposer>
                </Canvas>
            </KeyboardControls>
        </>
    )
}
