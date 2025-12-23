import { useGameStore } from '../store'

export const UI = () => {
    const { isPlaying, isGameOver, score, replayUrl, startGame, resetGame, activeEvent } = useGameStore()

    // Touch handlers (simulate key press)
    const handleTouchStart = (key: string) => {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: key }))
    }
    const handleTouchEnd = (key: string) => {
        window.dispatchEvent(new KeyboardEvent('keyup', { code: key }))
    }

    if (isPlaying && !isGameOver) {
        return (
            <>
                <div style={{ position: 'absolute', top: 20, left: 20, color: 'white', fontSize: '2rem', fontFamily: 'Impact, sans-serif' }}>
                    TIME: {score.toFixed(1)}s
                </div>

                {/* Giant Retro Timer */}
                <div style={{
                    position: 'absolute',
                    top: '10%',
                    width: '100%',
                    textAlign: 'center',
                    color: '#00ffcc',
                    fontSize: '8rem',
                    fontFamily: '"Courier New", Courier, monospace',
                    fontWeight: 'bold',
                    opacity: 0.2,
                    pointerEvents: 'none',
                    letterSpacing: '10px'
                }}>
                    {score.toFixed(1)}
                </div>

                {activeEvent && (
                    <div style={{
                        position: 'absolute', top: 80, width: '100%', textAlign: 'center',
                        color: '#ff00ff', fontSize: '3rem', fontFamily: 'Impact, sans-serif',
                        textShadow: '2px 2px 0px white', animation: 'pulse 0.5s infinite alternate'
                    }}>
                        ⚠ {activeEvent.replace('_', ' ')} ⚠
                    </div>
                )}

                {/* Touch Controls */}
                <div style={{ position: 'absolute', bottom: 40, left: 40, display: 'flex', gap: '20px' }}>
                    <button
                        onMouseDown={() => handleTouchStart('KeyA')} onMouseUp={() => handleTouchEnd('KeyA')}
                        onTouchStart={() => handleTouchStart('KeyA')} onTouchEnd={() => handleTouchEnd('KeyA')}
                        style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.3)', border: '2px solid white', color: 'white', fontSize: '24px', fontWeight: 'bold' }}
                    >
                        L
                    </button>
                </div>
                <div style={{ position: 'absolute', bottom: 40, right: 40, display: 'flex', gap: '20px' }}>
                    <button
                        onMouseDown={() => handleTouchStart('KeyD')} onMouseUp={() => handleTouchEnd('KeyD')}
                        onTouchStart={() => handleTouchStart('KeyD')} onTouchEnd={() => handleTouchEnd('KeyD')}
                        style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.3)', border: '2px solid white', color: 'white', fontSize: '24px', fontWeight: 'bold' }}
                    >
                        R
                    </button>
                </div>
            </>
        )
    }

    return (
        <div style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.8)', color: 'white', fontFamily: 'Impact, sans-serif'
        }}>
            <h1 style={{ fontSize: '4rem', margin: 0, color: '#ff0055', textTransform: 'uppercase', textShadow: '4px 4px 0px #000' }}>Last Man In Area</h1>

            {/* Twitch Overlay */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 10
            }}>
                {/* Webcam Frame */}
                <div style={{
                    position: 'absolute',
                    bottom: '20px',
                    right: '20px',
                    width: '200px',
                    height: '150px',
                    border: '4px solid #9146FF',
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#9146FF',
                    fontWeight: 'bold',
                    fontSize: '0.8rem'
                }}>
                    WEBCAM_OFF
                </div>

                {/* Fake Chat */}
                <div style={{
                    position: 'absolute',
                    bottom: '180px',
                    right: '20px',
                    width: '200px',
                    height: '300px',
                    background: 'rgba(0,0,0,0.3)',
                    padding: '10px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column-reverse',
                    fontSize: '0.7rem',
                    textAlign: 'left',
                    color: 'white'
                }}>
                    <div className="chat-msg" style={{ marginBottom: '5px' }}><span style={{ color: '#ff4444' }}>User123:</span> LUL HE FELL AGAIN</div>
                    <div className="chat-msg" style={{ marginBottom: '5px' }}><span style={{ color: '#44ff44' }}>PogChamp:</span> GOALLLLLLL</div>
                    <div className="chat-msg" style={{ marginBottom: '5px' }}><span style={{ color: '#4444ff' }}>ModBot:</span> Keep it clean guys</div>
                    <div className="chat-msg" style={{ marginBottom: '5px' }}><span style={{ color: '#ffff44' }}>NoobMaster:</span> KEKW</div>
                    <div className="chat-msg" style={{ marginBottom: '5px' }}><span style={{ color: '#ff44ff' }}>StreamFan:</span> !drop</div>
                </div>
            </div>

            {isGameOver && (
                <div style={{ textAlign: 'center', marginBottom: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '3rem', color: 'yellow', textShadow: '2px 2px 0px red' }}>YOU FAILED</h2>
                    <p style={{ fontSize: '1.5rem' }}>You survived {score.toFixed(1)} seconds</p>

                    {replayUrl && (
                        <div style={{ marginTop: '20px', border: '4px solid white', borderRadius: '10px', overflow: 'hidden' }}>
                            <video
                                src={replayUrl}
                                autoPlay
                                loop
                                muted
                                style={{ width: '320px', display: 'block' }}
                                onLoadedMetadata={(e) => (e.currentTarget.playbackRate = 0.5)}
                            />
                            <div style={{ background: 'white', color: 'black', padding: '5px', fontWeight: 'bold' }}>
                                CRINGE REPLAY 0.5x
                            </div>
                        </div>
                    )}
                    <p style={{ fontSize: '1rem', color: '#ccc', marginTop: '1rem' }}>Humiliating...</p>
                </div>
            )}

            <button
                onClick={isGameOver ? resetGame : startGame}
                style={{
                    padding: '1rem 3rem', fontSize: '2rem', fontWeight: 'bold',
                    backgroundColor: '#00ffcc', border: 'none', cursor: 'pointer',
                    transform: 'skew(-10deg)', boxShadow: '5px 5px 0px #ff00cc',
                    transition: 'transform 0.1s'
                }}
                onMouseDown={(e) => e.currentTarget.style.transform = 'skew(-10deg) scale(0.95)'}
                onMouseUp={(e) => e.currentTarget.style.transform = 'skew(-10deg) scale(1)'}
            >
                {isGameOver ? 'TRY AGAIN' : 'START RUN'}
            </button>

            <div style={{ marginTop: '2rem', textAlign: 'center', opacity: 0.7 }}>
                <p>CONTROLS: [A] Left Leg | [D] Right Leg</p>
                <p>Don't fall. Don't let balls in.</p>
            </div>

            <style>{`
                @keyframes pulse {
                    from { transform: scale(1); opacity: 0.8; }
                    to { transform: scale(1.1); opacity: 1; }
                }
            `}</style>
        </div>
    )
}
