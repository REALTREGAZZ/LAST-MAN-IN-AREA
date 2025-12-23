import { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { v4 as uuidv4 } from 'uuid'
import { useGameStore } from '../store'

type BallType = 'standard' | 'beach' | 'heavy' | 'bomb'

interface BallProps {
    id: string
    position: [number, number, number]
    type: BallType
}

const BALL_PROPS = {
    standard: { mass: 1, radius: 0.3, color: 'white', restitution: 0.8 },
    beach: { mass: 0.2, radius: 0.5, color: '#ffeb3b', restitution: 0.9 },
    heavy: { mass: 5, radius: 0.4, color: '#455a64', restitution: 0.2 },
    bomb: { mass: 1, radius: 0.3, color: '#ff0000', restitution: 0.5 },
}

const Ball = ({ id, position, type }: BallProps) => {
    const rbRef = useRef<RapierRigidBody>(null)
    const triggerShake = useGameStore(state => state.triggerShake)

    const props = BALL_PROPS[type] || BALL_PROPS.standard

    useFrame((state, delta) => {
        if (!rbRef.current) return

        // 1. Magnus Effect & Random Curvature
        const velocity = rbRef.current.linvel()
        const velVec = new THREE.Vector3(velocity.x, velocity.y, velocity.z)

        if (velVec.length() > 1) {
            // Magnus + Random side force
            const sideForce = new THREE.Vector3(0, 1, 0).cross(velVec).normalize()
            const randomCurve = (Math.random() - 0.5) * 2
            sideForce.multiplyScalar((2 + randomCurve) * props.mass * delta)
            rbRef.current.applyImpulse({ x: sideForce.x, y: sideForce.y, z: sideForce.z }, true)
        }

        // 2. Bomb Logic: Radial push on contact
        if (type === 'bomb') {
            const player = state.scene.getObjectByName('player')
            if (player) {
                const dist = rbRef.current.translation()
                const playerPos = player.position
                const d = new THREE.Vector3(dist.x, dist.y, dist.z).distanceTo(playerPos)
                if (d < 0.8) {
                    // EXPLOSION!
                    const dir = new THREE.Vector3().subVectors(playerPos, new THREE.Vector3(dist.x, dist.y, dist.z)).normalize()
                    // Apply huge impulse to player
                    // Actually, let's just find the player RB properly
                    const playerRB = (window as any).playerRB
                    if (playerRB) {
                        playerRB.applyImpulse(dir.multiplyScalar(50), true)
                        triggerShake(10)
                        // Despawn ball
                        rbRef.current.setTranslation({ x: 0, y: -100, z: 0 }, true)
                    }
                }
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
        >
            <mesh castShadow name={'ball-' + id} onUpdate={(self) => { self.userData.rb = rbRef.current }}>
                <sphereGeometry args={[props.radius, 16, 16]} />
                <meshStandardMaterial color={props.color} emissive={type === 'bomb' ? '#ff0000' : '#000'} emissiveIntensity={type === 'bomb' ? 2 : 0} />
            </mesh>
        </RigidBody>
    )
}

export const BallSpawner = () => {
    const [balls, setBalls] = useState<BallProps[]>([])
    const isPlaying = useGameStore(state => state.isPlaying)
    const score = useGameStore(state => state.score)
    const activeEvent = useGameStore(state => state.activeEvent)

    useEffect(() => {
        if (!isPlaying) {
            setBalls([])
            return
        }

        const spawnBall = () => {
            const id = uuidv4()
            const side = Math.random() > 0.5 ? 1 : -1
            const x = side * (15 + Math.random() * 5)
            const y = 2 + Math.random() * 5
            const z = -5 + Math.random() * 10

            // Random type based on weight
            const rand = Math.random()
            let type: BallType = 'standard'
            if (activeEvent === 'GIANT_BALL' && Math.random() > 0.5) type = 'heavy'
            else if (rand > 0.9) type = 'bomb'
            else if (rand > 0.7) type = 'heavy'
            else if (rand > 0.5) type = 'beach'

            const newBall: BallProps = { id, position: [x, y, z], type }
            setBalls(prev => [...prev, newBall])

            // Predictive Targeting: Apply impulse towards player's future position
            setTimeout(() => {
                const ballObj = (window as any).scene?.getObjectByName('ball-' + id)
                const player = (window as any).scene?.getObjectByName('player')
                if (ballObj && player && ballObj.userData.rb) {
                    const playerVel = player.userData.rb.linvel()
                    const targetPos = new THREE.Vector3().copy(player.position).add(
                        new THREE.Vector3(playerVel.x, playerVel.y, playerVel.z).multiplyScalar(1)
                    )
                    const dir = new THREE.Vector3().subVectors(targetPos, ballObj.position).normalize()
                    const force = type === 'heavy' ? 50 : type === 'beach' ? 5 : 20
                    ballObj.userData.rb.applyImpulse(dir.multiplyScalar(force), true)
                }
            }, 50)

            // Despawn after 10s
            setTimeout(() => {
                setBalls(prev => prev.filter(b => b.id !== id))
            }, 10000)
        }

        const interval = setInterval(spawnBall, Math.max(500, 2000 - score * 10))
        return () => clearInterval(interval)
    }, [isPlaying, score, activeEvent])

    return (
        <>
            {balls.map(ball => (
                <Ball key={ball.id} {...ball} />
            ))}
        </>
    )
}
