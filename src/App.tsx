import { useEffect, useState } from 'react'
import './App.css'

type SessionState = 'idle' | 'running' | 'paused' | 'complete'

type SessionRecord = {
  id: number
  duration: number
  completedAt: string
}

const DEFAULT_DURATION = 50 * 60

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0')
  const remainder = (seconds % 60).toString().padStart(2, '0')
  return `${minutes}:${remainder}`
}

function App() {
  const [state, setState] = useState<SessionState>(() => (localStorage.getItem('nexus-session-state') as SessionState) || 'idle')
  const [remaining, setRemaining] = useState(() => Number(localStorage.getItem('nexus-session-remaining') ?? DEFAULT_DURATION))
  const [duration, setDuration] = useState(DEFAULT_DURATION)
  const [soundOn, setSoundOn] = useState(() => localStorage.getItem('nexus-completion-sound') !== 'false')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sessions, setSessions] = useState<SessionRecord[]>(() => {
    const stored = localStorage.getItem('nexus-completed-sessions')
    return stored ? JSON.parse(stored) : []
  })

  useEffect(() => {
    localStorage.setItem('nexus-session-state', state)
    localStorage.setItem('nexus-session-remaining', String(remaining))
    localStorage.setItem('nexus-completion-sound', String(soundOn))
    localStorage.setItem('nexus-completed-sessions', JSON.stringify(sessions))
  }, [remaining, sessions, soundOn, state])

  useEffect(() => {
    if (state !== 'running') return
    const interval = window.setInterval(() => {
      setRemaining((value) => {
        if (value <= 1) {
          setState('complete')
          if (soundOn) playCompletionSound()
          return 0
        }
        return value - 1
      })
    }, 1000)
    return () => window.clearInterval(interval)
  }, [soundOn, state])

  const startSession = () => {
    if (state === 'idle' || state === 'complete') {
      setRemaining(duration)
    }
    setState('running')
  }

  const pauseSession = () => setState('paused')

  const stopSession = () => {
    setRemaining(duration)
    setState('idle')
  }

  const finishSession = () => {
    const completedDuration = duration - remaining
    if (completedDuration > 0) {
      setSessions((current) => [{ id: Date.now(), duration: completedDuration, completedAt: new Date().toISOString() }, ...current])
    }
    setRemaining(duration)
    setState('idle')
  }

  const progress = duration === 0 ? 0 : ((duration - remaining) / duration) * 100
  const todayMinutes = sessions.reduce((total, session) => total + Math.round(session.duration / 60), 0)

  return (
    <main className="tracker-shell">
      <header className="tracker-header">
        <div className="brand"><span className="brand-mark">N</span><span>Nexus</span></div>
        <div className="header-actions"><span className="today-label">{todayMinutes} min studied today</span><button className="settings-button" aria-label="Open session settings" onClick={() => setSettingsOpen((open) => !open)}>⚙</button></div>
      </header>

      <section className="tracker-content">
        <div className="intro"><p className="eyebrow">STUDY SESSION</p><h1>Make time<br />for focus.</h1><p>Set a session, settle in, and let the clock stay out of your way.</p></div>

        <section className={`timer-card ${state === 'complete' ? 'is-complete' : ''}`} aria-label="Study timer">
          <div className="timer-topline"><span className={`state-indicator ${state}`} /> <span>{state === 'running' ? 'Session in progress' : state === 'paused' ? 'Session paused' : state === 'complete' ? 'Session complete' : 'Ready when you are'}</span></div>
          <div className="timer-display">{formatTime(remaining)}</div>
          <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
          <div className="timer-meta"><span>{state === 'idle' ? `${Math.round(duration / 60)} minute session` : `${Math.round(progress)}% complete`}</span><button className="duration-button" onClick={() => setDuration((value) => value === 25 * 60 ? 50 * 60 : value === 50 * 60 ? 90 * 60 : 25 * 60)} disabled={state === 'running'}>{Math.round(duration / 60)} min ↻</button></div>
          <div className="timer-controls">{state === 'running' ? <button className="main-action pause-action" onClick={pauseSession}>Pause timer <span>Ⅱ</span></button> : state === 'complete' ? <button className="main-action" onClick={finishSession}>Save session <span>✓</span></button> : <button className="main-action" onClick={startSession}>{state === 'paused' ? 'Resume timer' : 'Start timer'} <span>▶</span></button>}<button className="stop-action" onClick={state === 'complete' ? finishSession : stopSession} disabled={state === 'idle'}>Stop</button></div>
          {state === 'complete' && <p className="completion-message">Nice work. Your session is complete{soundOn ? ' and your completion sound played.' : '.'}</p>}
  </section>
 
 
  </section>
 
+      {settingsOpen && <div className="settings-popover"><div className="popover-heading"><span>Settings</span><button onClick={() => setSettingsOpen(false)} aria-label="Close settings">×</button></div><label>Default session length<select value={duration} onChange={(event) => setDuration(Number(event.target.value))} disabled={state === 'running'}><option value={25 * 60}>25 minutes</option><option value={50 * 60}>50 minutes</option><option value={90 * 60}>90 minutes</option></select></label><label className="popover-toggle"><span>Completion sound</span><input type="checkbox" checked={soundOn} onChange={(event) => setSoundOn(event.target.checked)} /></label></div>}
  </main>
  )
}
 
function playCompletionSound() {
  const context = new AudioContext()
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.frequency.value = 660
  gain.gain.setValueAtTime(0.0001, context.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.16, context.currentTime + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.55)
  oscillator.connect(gain)
  gain.connect(context.destination)
  oscillator.start()
  oscillator.stop(context.currentTime + 0.6)
}
 
export default App
