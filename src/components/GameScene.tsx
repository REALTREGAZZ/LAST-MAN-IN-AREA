import { Suspense, useRef, useState } from 'react'
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

    const slowMoRemaining = useRef(0)
    const timeScaleRef = useRef(1)

    const gameOverStartTime = useRef<number | null>(null)
    const lastHeadPos = useRef(new THREE.Vector3())

    const setTimeScaleSafe = (v: number) => {
        if (timeScaleRef.current === v) return
        timeScaleRef.current = v
        setTimeScale(v)
    }

    // Dynamic Slow-Mo, FOV Distortion & Death Cam
    useFrame((state, delta) => {
        const balls = state.scene.getObjectsByProperty('name', 'ball') as THREE.Mesh[]
        const player = state.scene.getObjectByName('player')

        const { isGameOver, gameOverCause, score: elapsed } = useGameStore.getState()

        // FOV distortion (during play)
        if (!isGameOver) {
            let amplitude = 0
            let hz = 0

            if (elapsed >= 30 && elapsed < 60) {
                amplitude = 2
                hz = 0.8
            } else if (elapsed >= 60 && elapsed < 90) {
                amplitude = 5
                hz = 1.1
            } else if (elapsed >= 90 && elapsed < 120) {
                amplitude = 10
                hz = 1.6
            } else if (elapsed >= 120) {
                amplitude = 15
                hz = 2 // synced with the continuous siren LFO
            }

            const fov = 50 + amplitude * Math.sin(elapsed * hz * Math.PI * 2)
            state.camera.fov = THREE.MathUtils.clamp(fov, 35, 65)
            state.camera.updateProjectionMatrix()
        }

        if (!player) return

        // Zoom / DeathCam
        if (isGameOver) {
            const now = state.clock.getElapsedTime()
            if (gameOverStartTime.current === null) {
                gameOverStartTime.current = now
                const headObj = state.scene.getObjectByName('player-head')
                if (headObj) lastHeadPos.current.copy(headObj.position)
            }

            const head = state.scene.getObjectByName('player-head')
            if (!head) return

            if (gameOverCause === 'bomb_explosion') {
                const tSince = now - (gameOverStartTime.current ?? now)

                if (tSince < 2) {
                    const headPos = head.position

                    const movement = new THREE.Vector3().subVectors(headPos, lastHeadPos.current)
                    lastHeadPos.current.copy(headPos)

                    let dir = movement
                    if (dir.lengthSq() < 1e-6 && player) {
                        dir = new THREE.Vector3().subVectors(player.position, headPos)
                    }

                    if (dir.lengthSq() < 1e-6) dir = new THREE.Vector3(0, 0, -1)
                    dir.normalize()

                    const camPos = new THREE.Vector3().copy(headPos).add(new THREE.Vector3(0, 0.15, 0)).addScaledVector(dir, -0.25)
                    state.camera.position.lerp(camPos, 1)
                    state.camera.lookAt(new THREE.Vector3().copy(headPos).addScaledVector(dir, 10))

                    state.camera.fov = 30
                    state.camera.updateProjectionMatrix()
                    return
                }

                // After the 2s follow-cam: slow zoom-out
                const targetPos = new THREE.Vector3(0, 8, 16)
                state.camera.position.lerp(targetPos, delta * 0.5)
                state.camera.lookAt(head.position)

                state.camera.fov = THREE.MathUtils.lerp(state.camera.fov, 50, delta * 0.5)
                state.camera.updateProjectionMatrix()
                return
            }

            // Normal game over: keep the original zoom-to-head
            const targetPos = new THREE.Vector3().copy(head.position).add(new THREE.Vector3(0, 1, 3))
            state.camera.position.lerp(targetPos, delta * 2)
            state.camera.lookAt(head.position)
            state.camera.fov = THREE.MathUtils.lerp(state.camera.fov, 50, delta * 2)
            state.camera.updateProjectionMatrix()
            return
        }

        gameOverStartTime.current = null

        // Near-miss slow-mo (no setTimeout)
        if (slowMoRemaining.current > 0) {
            slowMoRemaining.current = Math.max(0, slowMoRemaining.current - delta)
            if (slowMoRemaining.current === 0) {
                setTimeScaleSafe(1)
            }
            return
        }

        if (balls.length === 0) return

        let nearMiss = false
        for (const ball of balls) {
            const dist = ball.position.distanceTo(player.position)
            if (dist < 1.5) {
                nearMiss = true
                break
            }
        }

        if (nearMiss && timeScaleRef.current === 1) {
            slowMoRemaining.current = 0.5
            setTimeScaleSafe(0.3)
        }
    })

    return (
        <Physics gravity={[0, activeEvent === 'LOW_GRAVITY' ? -2 : -9.81, 0]} timeStep={(1 / 60) * timeScale}>
            {children}
        </Physics>
    )
}

const ReactiveNoise = () => {
    const micVolume = useGameStore(state => state.micVolume)
    return <Noise opacity={0.1 + micVolume * 0.8} />
}

const ReactiveChromaticAberration = () => {
    const micVolume = useGameStore(state => state.micVolume)
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
                    onCreated={({ scene }) => { window.scene = scene }}
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
