import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, RapierRigidBody, useRapier } from '@react-three/rapier'
import * as THREE from 'three'
import { v4 as uuidv4 } from 'uuid'
import { useGameStore } from '../store'

type BallType = 'standard' | 'beach' | 'heavy' | 'bomb'

type BallData = {
    id: string
    position: [number, number, number]
    type: BallType
    bornAt: number
}

type ExplosionData = {
    id: string
    position: THREE.Vector3
}

const BALL_PROPS: Record<BallType, { mass: number; radius: number; color: string; restitution: number }> = {
    standard: { mass: 1, radius: 0.3, color: 'white', restitution: 0.8 },
    beach: { mass: 0.2, radius: 0.5, color: '#ffeb3b', restitution: 0.9 },
    heavy: { mass: 5, radius: 0.4, color: '#455a64', restitution: 0.2 },
    bomb: { mass: 1, radius: 0.3, color: '#ff0000', restitution: 0.5 },
}

export const exponentialMultiplier = (elapsedSeconds: number) => {
    if (elapsedSeconds < 30) return 1
    if (elapsedSeconds < 60) return 2
    if (elapsedSeconds < 90) return 5
    if (elapsedSeconds < 120) return 15
    return 2 * Math.exp(0.05 * elapsedSeconds)
}

const hashString = (s: string) => {
    let h = 2166136261
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i)
        h = Math.imul(h, 16777619)
    }
    return h >>> 0
}

const mulberry32 = (seed: number) => {
    let a = seed
    return () => {
        a |= 0
        a = (a + 0x6d2b79f5) | 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t ^= t + Math.imul(t ^ (t >>> 7), 61 | t)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

type ExplosionParticle = { pos: THREE.Vector3; vel: THREE.Vector3; color: THREE.Color }

const createExplosionParticles = (seed: string, origin: THREE.Vector3): ExplosionParticle[] => {
    const rand = mulberry32(hashString(seed))
    const out: ExplosionParticle[] = []

    for (let i = 0; i < 60; i++) {
        const dir = new THREE.Vector3(rand() - 0.5, rand() * 0.9, rand() - 0.5).normalize()
        const speed = 8 + rand() * 10
        const offset = rand() * 1.5
        out.push({
            pos: new THREE.Vector3().copy(origin).addScaledVector(dir, offset),
            vel: new THREE.Vector3().copy(dir).multiplyScalar(speed),
            color: new THREE.Color(rand() > 0.6 ? '#222222' : '#ff6a00'),
        })
    }

    return out
}

const ExplosionBurst = ({ position, seed, onDone }: { position: THREE.Vector3; seed: string; onDone: () => void }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null!)
    const age = useRef(0)

    const particlesRef = useRef<ExplosionParticle[]>(createExplosionParticles(seed, position))
    const gravity = useRef(new THREE.Vector3(0, -12, 0))

    useFrame((_state, delta) => {
        const mesh = meshRef.current
        if (!mesh) return

        age.current += delta

        const particles = particlesRef.current
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i]
            p.pos.addScaledVector(p.vel, delta)
            p.vel.addScaledVector(gravity.current, delta)
            p.vel.multiplyScalar(0.98)

            const m = new THREE.Matrix4().setPosition(p.pos)
            mesh.setMatrixAt(i, m)
            mesh.setColorAt(i, p.color)
        }

        mesh.instanceMatrix.needsUpdate = true
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true

        if (age.current > 1) onDone()
    })

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, particlesRef.current.length]}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshStandardMaterial vertexColors />
        </instancedMesh>
    )
}

const Ball = ({ id, position, type, bornAt, onDespawn, onExplosion }: BallData & {
    onDespawn: (id: string) => void
    onExplosion: (pos: THREE.Vector3) => void
}) => {
    const rbRef = useRef<RapierRigidBody>(null)
    const didTarget = useRef(false)
    const exploded = useRef(false)

    const triggerShake = useGameStore(state => state.triggerShake)
    const endGame = useGameStore(state => state.endGame)

    const activeEvent = useGameStore(state => state.activeEvent)

    const { world, rapier } = useRapier()

    const props = BALL_PROPS[type] || BALL_PROPS.standard

    const explode = (causePlayer: boolean) => {
        if (exploded.current) return
        exploded.current = true

        const rb = rbRef.current
        if (!rb) {
            onDespawn(id)
            return
        }

        const bombPos = rb.translation()
        const bombVec = new THREE.Vector3(bombPos.x, bombPos.y, bombPos.z)

        onExplosion(bombVec)
        triggerShake(1.2)

        if (causePlayer) {
            endGame('bomb_explosion')
        }

        const radius = 5
        const shapePos = new rapier.Vector3(bombPos.x, bombPos.y, bombPos.z)
        const shapeRot = new rapier.Quaternion(0, 0, 0, 1)
        const shape = new rapier.Ball(radius)

        world.intersectionsWithShape(shapePos, shapeRot, shape, (collider) => {
            const parent = collider.parent()
            if (!parent || !parent.isDynamic()) return true

            const p = parent.translation()
            const rbVec = new THREE.Vector3(p.x, p.y, p.z)
            const delta = rbVec.sub(bombVec)
            const dist = delta.length()

            if (dist < 0.0001) {
                delta.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize()
            } else {
                delta.divideScalar(dist)
            }

            const mag = 100 / Math.pow(dist + 0.1, 2)
            const impulse = delta.multiplyScalar(mag)
            parent.applyImpulse({ x: impulse.x, y: impulse.y, z: impulse.z }, true)

            const torqueScale = mag * 0.03
            parent.applyTorqueImpulse(
                {
                    x: (Math.random() - 0.5) * torqueScale,
                    y: (Math.random() - 0.5) * torqueScale,
                    z: (Math.random() - 0.5) * torqueScale,
                },
                true,
            )

            return true
        })

        onDespawn(id)
    }

    const handleCollisionEnter = (event: unknown) => {
        if (type !== 'bomb') return
        const e = event as { other?: { rigidBodyObject?: { name?: string } } }
        const otherName = e.other?.rigidBodyObject?.name ?? ''

        if (otherName === 'ball') return

        const hitPlayer = otherName.startsWith('player')
        explode(hitPlayer)
    }

    useFrame((state, delta) => {
        const rb = rbRef.current
        if (!rb) return

        // Predictive Targeting (first frame after spawn)
        if (!didTarget.current) {
            didTarget.current = true

            const player = state.scene.getObjectByName('player')
            const playerRB = window.playerRB

            if (player && playerRB) {
                const playerVel = playerRB.linvel()
                const targetPos = new THREE.Vector3().copy(player.position).add(
                    new THREE.Vector3(playerVel.x, playerVel.y, playerVel.z).multiplyScalar(1),
                )

                const ballPos = rb.translation()
                const dir = new THREE.Vector3().subVectors(targetPos, new THREE.Vector3(ballPos.x, ballPos.y, ballPos.z)).normalize()
                const force = type === 'heavy' ? 50 : type === 'beach' ? 5 : 20

                rb.applyImpulse({ x: dir.x * force, y: dir.y * force, z: dir.z * force }, true)
            }
        }

        // Magnus Effect & Random Curvature
        const velocity = rb.linvel()
        const velVec = new THREE.Vector3(velocity.x, velocity.y, velocity.z)

        if (velVec.length() > 1) {
            const sideForce = new THREE.Vector3(0, 1, 0).cross(velVec).normalize()
            const randomCurve = (Math.random() - 0.5) * 2
            sideForce.multiplyScalar((2 + randomCurve) * props.mass * delta)
            rb.applyImpulse({ x: sideForce.x, y: sideForce.y, z: sideForce.z }, true)
        }

        if (activeEvent === 'WIND') {
            rb.applyImpulse({ x: (Math.random() - 0.5) * 2 * delta, y: 0, z: (Math.random() - 0.5) * 2 * delta }, true)
        }

        // Auto-detonation
        if (type === 'bomb') {
            const age = state.clock.getElapsedTime() - bornAt
            if (age > 8) {
                explode(false)
            }
        }
    })

    return (
        <RigidBody
            ref={rbRef}
            position={position}
            colliders="ball"
            mass={props.mass}
            restitution={props.restitution}
            name="ball"
            onCollisionEnter={handleCollisionEnter}
        >
            <mesh castShadow name={'ball-' + id} onUpdate={(self) => { self.userData.rb = rbRef.current }}>
                <sphereGeometry args={[props.radius, 16, 16]} />
                <meshStandardMaterial
                    color={props.color}
                    emissive={type === 'bomb' ? '#ff0000' : '#000'}
                    emissiveIntensity={type === 'bomb' ? 2 : 0}
                />
            </mesh>
        </RigidBody>
    )
}

export const BallSpawner = () => {
    const [balls, setBalls] = useState<BallData[]>([])
    const [explosions, setExplosions] = useState<ExplosionData[]>([])

    const isPlaying = useGameStore(state => state.isPlaying)
    const isGameOver = useGameStore(state => state.isGameOver)
    const elapsed = useGameStore(state => state.score)

    const activeEvent = useGameStore(state => state.activeEvent)

    const spawnAccumulator = useRef(0)
    const lastCleanupAt = useRef(0)

    useEffect(() => {
        if (isPlaying) return

        const raf = requestAnimationFrame(() => {
            setBalls([])
            setExplosions([])
        })

        spawnAccumulator.current = 0
        lastCleanupAt.current = 0

        return () => cancelAnimationFrame(raf)
    }, [isPlaying])

    useFrame((state, delta) => {
        if (!isPlaying || isGameOver) return

        spawnAccumulator.current += delta

        const multiplier = exponentialMultiplier(elapsed)
        const baseIntervalMs = Math.max(100, 2000 - elapsed * 10)
        const intervalMs = baseIntervalMs / multiplier
        const intervalSec = intervalMs / 1000

        const baseSpawns = Math.floor(spawnAccumulator.current / intervalSec)
        if (baseSpawns > 0) {
            spawnAccumulator.current -= baseSpawns * intervalSec

            // Phase 4+: spawn bursts to simulate simultaneous events
            const burst = elapsed >= 120 ? 3 : elapsed >= 90 ? 2 : 1
            const multiball = activeEvent === 'MULTIBALL' ? 2 : 1

            const spawns = Math.min(baseSpawns * burst * multiball, 8)

            const now = state.clock.getElapsedTime()

            const newBalls: BallData[] = []
            for (let i = 0; i < spawns; i++) {
                const side = Math.random() > 0.5 ? 1 : -1
                const x = side * (15 + Math.random() * 5)
                const y = 2 + Math.random() * 5
                const z = -5 + Math.random() * 10

                const rand = Math.random()
                let type: BallType = 'standard'

                if (activeEvent === 'GIANT_BALL' && Math.random() > 0.5) type = 'heavy'
                else if (elapsed >= 120 && rand > 0.75) type = 'bomb'
                else if (rand > 0.93) type = 'bomb'
                else if (rand > 0.75) type = 'heavy'
                else if (rand > 0.55) type = 'beach'

                newBalls.push({ id: uuidv4(), position: [x, y, z], type, bornAt: now })
            }

            setBalls(prev => {
                const combined = [...prev, ...newBalls]
                const MAX_BALLS = 220
                return combined.length > MAX_BALLS ? combined.slice(combined.length - MAX_BALLS) : combined
            })
        }

        if (state.clock.getElapsedTime() - lastCleanupAt.current > 0.5) {
            lastCleanupAt.current = state.clock.getElapsedTime()
            setBalls(prev => prev.filter(b => state.clock.getElapsedTime() - b.bornAt < 10))
        }
    })

    const despawnBall = (id: string) => {
        setBalls(prev => prev.filter(b => b.id !== id))
    }

    const addExplosion = (pos: THREE.Vector3) => {
        const id = uuidv4()
        setExplosions(prev => [...prev, { id, position: pos.clone() }])
    }

    return (
        <>
            {balls.map(ball => (
                <Ball
                    key={ball.id}
                    {...ball}
                    onDespawn={despawnBall}
                    onExplosion={addExplosion}
                />
            ))}
            {explosions.map(e => (
                <ExplosionBurst
                    key={e.id}
                    seed={e.id}
                    position={e.position}
                    onDone={() => setExplosions(prev => prev.filter(x => x.id !== e.id))}
                />
            ))}
        </>
    )
}
