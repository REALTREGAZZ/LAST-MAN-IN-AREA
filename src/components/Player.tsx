import { RigidBody, useRevoluteJoint, RapierRigidBody } from '@react-three/rapier'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useKeyboardControls } from '@react-three/drei'
import * as THREE from 'three'
import { useGameStore } from '../store'

export const Player = () => {
    const torsoRef = useRef<RapierRigidBody>(null!)
    const headRef = useRef<RapierRigidBody>(null!)
    const leftLegRef = useRef<RapierRigidBody>(null!)
    const rightLegRef = useRef<RapierRigidBody>(null!)

    useFrame(() => {
        if (torsoRef.current) (window as any).playerRB = torsoRef.current
    })

    // Joints
    useRevoluteJoint(torsoRef, headRef, [
        [0, 0.7, 0], // Torso anchor
        [0, -0.6, 0], // Head anchor
        [1, 0, 0], // Axis
    ])

    useRevoluteJoint(torsoRef, leftLegRef, [[-0.4, -0.75, 0], [0, 0.75, 0], [1, 0, 0]])
    useRevoluteJoint(torsoRef, rightLegRef, [[0.4, -0.75, 0], [0, 0.75, 0], [1, 0, 0]])

    const [, getKeys] = useKeyboardControls()

    useFrame(() => {
        const { leftLeg, rightLeg } = getKeys()
        const impulseStrength = 200 * 0.016

        if (leftLeg && leftLegRef.current) {
            leftLegRef.current.applyTorqueImpulse({ x: -impulseStrength, y: 0, z: 0 }, true)
        }
        if (rightLeg && rightLegRef.current) {
            rightLegRef.current.applyTorqueImpulse({ x: -impulseStrength, y: 0, z: 0 }, true)
        }
    })

    const micVolume = useGameStore(state => state.micVolume)
    const isPlaying = useGameStore(state => state.isPlaying)
    const triggerShake = useGameStore(state => state.triggerShake)

    // Handle collisions for camera shake
    const handleCollision = (event: any) => {
        const impulse = event.totalForceMagnitude || 0
        const mass = torsoRef.current?.mass() || 1
        const intensity = impulse / mass
        if (intensity > 5) {
            triggerShake(Math.min(intensity / 10, 5))
        }
    }

    // Recovery force & Mic Jump
    useFrame((_state, delta) => {
        if (!isPlaying || !torsoRef.current || !headRef.current) return

        const { leftLeg, rightLeg } = getKeys()

        // 1. Clumsy Recovery (Spasm): Pressing both A+D
        if (leftLeg && rightLeg) {
            const spasmX = (Math.random() - 0.5) * 10
            const spasmY = 20 + Math.random() * 10 // Increased for "Anti-Gravity" feel
            const spasmZ = (Math.random() - 0.5) * 10
            torsoRef.current.applyImpulse({ x: spasmX, y: spasmY, z: spasmZ }, true)
            // Add a random torque to make it "clumsy"
            torsoRef.current.applyTorqueImpulse({
                x: (Math.random() - 0.5) * 10,
                y: (Math.random() - 0.5) * 10,
                z: (Math.random() - 0.5) * 10
            }, true)
        } else if (leftLeg || rightLeg) {
            // Anti-Gravity Recovery: Apply upward force on spine when struggling
            torsoRef.current.applyImpulse({ x: 0, y: 5, z: 0 }, true)
            torsoRef.current.applyTorqueImpulse({
                x: (Math.random() - 0.5) * 2,
                y: (Math.random() - 0.5) * 2,
                z: (Math.random() - 0.5) * 2
            }, true)
        }

        // Dynamic Friction: Increase friction when torso is on ground
        const torsoPos = torsoRef.current.translation()
        if (torsoPos.y < 0.8) {
            torsoRef.current.setLinearDamping(5)
            torsoRef.current.setAngularDamping(5)
        } else {
            torsoRef.current.setLinearDamping(0.5)
            torsoRef.current.setAngularDamping(0.5)
        }

        // Mic Jump: If volume is high, apply upward force
        if (micVolume > 0.5) {
            torsoRef.current.applyImpulse({ x: 0, y: 20 * micVolume, z: 0 }, true)

            // Audio Reactive: Scale head temporarily (handled in mesh scale)
        }

        // Recovery Force (Stiffness)
        // Try to keep torso upright by applying torque
        const rotation = torsoRef.current.rotation()
        const up = new THREE.Vector3(0, 1, 0)
        const currentUp = new THREE.Vector3(0, 1, 0).applyQuaternion(new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w))

        // Calculate angle between current up and world up
        const angle = currentUp.angleTo(up)
        if (angle > 0.1 && angle < Math.PI / 2) {
            const axis = new THREE.Vector3().crossVectors(currentUp, up).normalize()
            const torque = axis.multiplyScalar(angle * 50 * delta)
            torsoRef.current.applyTorqueImpulse({ x: torque.x, y: torque.y, z: torque.z }, true)
        }

        // 2. Head Sway: Sync head rotation with movement
        const velocity = torsoRef.current.linvel()
        const headRotation = headRef.current.rotation()
        const headQuat = new THREE.Quaternion(headRotation.x, headRotation.y, headRotation.z, headRotation.w)
        const targetSway = new THREE.Quaternion().setFromEuler(new THREE.Euler(
            velocity.z * 0.05,
            0,
            -velocity.x * 0.05
        ))
        headRef.current.setRotation(headQuat.slerp(targetSway, 0.1), true)
    })

    // Colors
    const skinColor = "#d2b48c" // Tan
    const jerseyColor = "white" // Mexico Home
    const shortsColor = "#336699" // Denim
    const shoeColor = "#333"

    return (
        <group position={[0, 4, 0]}>
            {/* Torso Group - FAT */}
            <RigidBody
                ref={torsoRef}
                colliders="cuboid"
                position={[0, 0, 0]}
                mass={8}
                name="player"
                onCollisionEnter={handleCollision}
            >
                {/* Shirt */}
                <mesh castShadow position={[0, 0, 0]}>
                    <boxGeometry args={[1.2, 1.4, 0.8]} /> {/* Wider */}
                    <meshStandardMaterial color={jerseyColor} />
                </mesh>
                {/* Mexico Stripe (Visual) */}
                <mesh position={[0, 0, 0.41]}>
                    <planeGeometry args={[1, 0.4]} />
                    <meshStandardMaterial color="green" />
                </mesh>

                {/* Arms (Visual) */}
                <mesh position={[-0.7, 0.2, 0]}>
                    <boxGeometry args={[0.3, 0.8, 0.3]} />
                    <meshStandardMaterial color={skinColor} />
                </mesh>
                <mesh position={[0.7, 0.2, 0]}>
                    <boxGeometry args={[0.3, 0.8, 0.3]} />
                    <meshStandardMaterial color={skinColor} />
                </mesh>
            </RigidBody>

            {/* Head - BOBBLEHEAD (1.5x Mass multiplier handled by making it a separate RigidBody or increasing torso mass) */}
            {/* For simplicity, we'll increase torso mass and make head visual, but user asked for Head mass multiplier */}
            {/* Let's make Head a separate RigidBody with a joint for the 'Flan' effect */}
            <RigidBody ref={headRef} position={[0, 1.2, 0]} mass={12} colliders="ball"> {/* 1.5x of Torso mass roughly */}
                <mesh castShadow name="player-head" scale={1 + micVolume * 0.5}>
                    <sphereGeometry args={[0.6, 32, 32]} /> {/* Big Head */}
                    <meshStandardMaterial color={skinColor} />
                </mesh>
                {/* Eyes - Angry */}
                <mesh position={[-0.2, 0.1, 0.5]}>
                    <sphereGeometry args={[0.12]} />
                    <meshStandardMaterial color="white" />
                </mesh>
                <mesh position={[-0.2, 0.1, 0.6]}>
                    <sphereGeometry args={[0.05]} />
                    <meshStandardMaterial color="black" />
                </mesh>
                <mesh position={[0.2, 0.1, 0.5]}>
                    <sphereGeometry args={[0.12]} />
                    <meshStandardMaterial color="white" />
                </mesh>
                <mesh position={[0.2, 0.1, 0.6]}>
                    <sphereGeometry args={[0.05]} />
                    <meshStandardMaterial color="black" />
                </mesh>
                {/* Eyebrows */}
                <mesh position={[-0.2, 0.3, 0.5]} rotation={[0, 0, -0.2]}>
                    <boxGeometry args={[0.3, 0.05, 0.05]} />
                    <meshStandardMaterial color="black" />
                </mesh>
                <mesh position={[0.2, 0.3, 0.5]} rotation={[0, 0, 0.2]}>
                    <boxGeometry args={[0.3, 0.05, 0.05]} />
                    <meshStandardMaterial color="black" />
                </mesh>
                {/* Mouth - Gritting teeth */}
                <mesh position={[0, -0.2, 0.55]}>
                    <boxGeometry args={[0.3, 0.1, 0.05]} />
                    <meshStandardMaterial color="white" />
                </mesh>
            </RigidBody>

            {/* Left Leg */}
            <RigidBody ref={leftLegRef} position={[-0.3, -1, 0]} colliders="cuboid" mass={2}>
                {/* Shorts */}
                <mesh position={[0, 0.3, 0]}>
                    <boxGeometry args={[0.5, 0.6, 0.5]} />
                    <meshStandardMaterial color={shortsColor} />
                </mesh>
                {/* Leg */}
                <mesh position={[0, -0.2, 0]}>
                    <boxGeometry args={[0.2, 0.6, 0.2]} />
                    <meshStandardMaterial color={skinColor} />
                </mesh>
                {/* Shoe */}
                <mesh position={[0, -0.6, 0.1]}>
                    <boxGeometry args={[0.25, 0.2, 0.5]} />
                    <meshStandardMaterial color={shoeColor} />
                </mesh>
            </RigidBody>

            {/* Right Leg */}
            <RigidBody ref={rightLegRef} position={[0.3, -1, 0]} colliders="cuboid" mass={2}>
                {/* Shorts */}
                <mesh position={[0, 0.3, 0]}>
                    <boxGeometry args={[0.5, 0.6, 0.5]} />
                    <meshStandardMaterial color={shortsColor} />
                </mesh>
                {/* Leg */}
                <mesh position={[0, -0.2, 0]}>
                    <boxGeometry args={[0.2, 0.6, 0.2]} />
                    <meshStandardMaterial color={skinColor} />
                </mesh>
                {/* Shoe */}
                <mesh position={[0, -0.6, 0.1]}>
                    <boxGeometry args={[0.25, 0.2, 0.5]} />
                    <meshStandardMaterial color={shoeColor} />
                </mesh>
            </RigidBody>
        </group>
    )
}
