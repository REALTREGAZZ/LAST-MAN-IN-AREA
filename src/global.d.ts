import type { RapierRigidBody } from '@react-three/rapier'
import type { Scene } from 'three'

declare global {
    interface Window {
        scene?: Scene
        playerRB?: RapierRigidBody
        webkitAudioContext?: typeof AudioContext
    }
}

export {}
