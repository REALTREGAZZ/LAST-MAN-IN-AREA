import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { useGameStore } from '../store'

export const Arena = () => {
    const endGame = useGameStore((state) => state.endGame)
    const triggerShake = useGameStore((state) => state.triggerShake)

    const handleWallCollision = (event: any) => {
        const impulse = event.totalForceMagnitude || 0
        if (impulse > 50) {
            triggerShake(Math.min(impulse / 100, 3))
        }
    }

    return (
        <group position={[0, -1, 0]}>
            {/* Floor - Asphalt */}
            <RigidBody type="fixed" colliders="hull" friction={2} restitution={0.1}>
                <mesh receiveShadow>
                    <cylinderGeometry args={[12, 12, 0.5, 64]} />
                    <meshStandardMaterial color="#333" roughness={1} />
                </mesh>

                {/* Cracks (Visual) */}
                <mesh position={[0, 0.26, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[0, 11, 64]} />
                    <meshStandardMaterial color="#222" wireframe opacity={0.3} transparent />
                </mesh>
            </RigidBody>

            {/* Brick Walls with Graffiti */}
            <group>
                {/* Back Wall */}
                <RigidBody type="fixed" position={[0, 2, -12]} onCollisionEnter={handleWallCollision}>
                    <mesh receiveShadow>
                        <boxGeometry args={[24, 4, 1]} />
                        <meshStandardMaterial color="#a52a2a" roughness={0.9} />
                    </mesh>
                    {/* Graffiti Decal */}
                    <mesh position={[0, 0, 0.51]}>
                        <planeGeometry args={[4, 2]} />
                        <meshStandardMaterial color="#ff00ff" opacity={0.6} transparent />
                    </mesh>
                    <mesh position={[5, 0.5, 0.51]}>
                        <planeGeometry args={[3, 1.5]} />
                        <meshStandardMaterial color="#00ffff" opacity={0.6} transparent />
                    </mesh>
                </RigidBody>
                {/* Side Walls */}
                <mesh position={[-12, 2, 0]} rotation={[0, Math.PI / 2, 0]}>
                    <boxGeometry args={[24, 4, 1]} />
                    <meshStandardMaterial color="#a52a2a" roughness={0.9} />
                </mesh>
                <mesh position={[12, 2, 0]} rotation={[0, Math.PI / 2, 0]}>
                    <boxGeometry args={[24, 4, 1]} />
                    <meshStandardMaterial color="#a52a2a" roughness={0.9} />
                </mesh>
            </group>

            {/* Chain-link Fence */}
            <group position={[0, 5, -12]}>
                <mesh>
                    <planeGeometry args={[24, 6]} />
                    <meshStandardMaterial color="#aaa" wireframe side={2} />
                </mesh>
            </group>
            <group position={[-12, 5, 0]} rotation={[0, Math.PI / 2, 0]}>
                <mesh>
                    <planeGeometry args={[24, 6]} />
                    <meshStandardMaterial color="#aaa" wireframe side={2} />
                </mesh>
            </group>
            <group position={[12, 5, 0]} rotation={[0, Math.PI / 2, 0]}>
                <mesh>
                    <planeGeometry args={[24, 6]} />
                    <meshStandardMaterial color="#aaa" wireframe side={2} />
                </mesh>
            </group>

            {/* Goal Structure - Rusty */}
            <group position={[0, 0, -9]}>
                {/* Posts */}
                <RigidBody type="fixed" colliders="hull" onCollisionEnter={handleWallCollision}>
                    <mesh position={[-3, 2, 0]} castShadow>
                        <cylinderGeometry args={[0.1, 0.1, 4]} />
                        <meshStandardMaterial color="#552200" roughness={0.8} />
                    </mesh>
                    <mesh position={[3, 2, 0]} castShadow>
                        <cylinderGeometry args={[0.1, 0.1, 4]} />
                        <meshStandardMaterial color="#552200" roughness={0.8} />
                    </mesh>
                    <mesh position={[0, 4, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
                        <cylinderGeometry args={[0.1, 0.1, 6]} />
                        <meshStandardMaterial color="#552200" roughness={0.8} />
                    </mesh>
                </RigidBody>
                {/* Net (Visual) */}
                <mesh position={[0, 2, -1]}>
                    <boxGeometry args={[6, 4, 0.1]} />
                    <meshStandardMaterial color="#333" wireframe opacity={0.5} transparent />
                </mesh>
            </group>

            {/* Goal Sensor */}
            <RigidBody type="fixed" sensor onIntersectionEnter={({ other }) => {
                if (other.rigidBodyObject?.name !== 'player') {
                    endGame()
                }
            }}>
                <CuboidCollider args={[3, 2, 0.5]} position={[0, 2, -9]} />
            </RigidBody>

            {/* Trash/Details (Cans) */}
            <RigidBody position={[4, 0.5, 4]} colliders="hull">
                <mesh castShadow>
                    <cylinderGeometry args={[0.2, 0.2, 0.5]} />
                    <meshStandardMaterial color="red" />
                </mesh>
            </RigidBody>
            <RigidBody position={[-4, 0.5, 2]} colliders="hull">
                <mesh castShadow>
                    <cylinderGeometry args={[0.2, 0.2, 0.5]} />
                    <meshStandardMaterial color="blue" />
                </mesh>
            </RigidBody>
        </group>
    )
}
