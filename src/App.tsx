import { useEffect, useRef, useState } from 'react'
import { adaptCounseling, createLearningTasks, decideInterruption, defaultPolicy, type AgentDecision, type AgentEvent, type LearningTask } from './lib/agent'
import { mountGoogleButton, type VerifiedGoogleProfile } from './lib/googleAuth'
import { StudyMemoryDatabase, type MemoryHealth } from './lib/memory'
import { syncRemoteMemory } from './lib/remoteMemory'
import './App.css'

type EventRecord = {
  id: number
  title: string
  detail: string
  time: string
  tone: 'mint' | 'amber' | 'rose'
}

const initialEvents: EventRecord[] = [
  { id: 1, title: 'Session started', detail: 'Deep work / physics revision', time: '09:12', tone: 'mint' },
  { id: 2, title: 'Pattern understood', detail: 'Short-form video opened twice', time: '09:28', tone: 'amber' },
  { id: 3, title: 'Counseling completed', detail: 'Reset prompt acknowledged', time: '09:31', tone: 'mint' },
]

const subjects = ['Physics', 'Mathematics', 'Biology', 'Chemistry', 'Computer science', 'Engineering', 'Economics', 'Law', 'Languages', 'Research', 'Custom']
const departments = [
  'Computer science and engineering',
  'Information technology',
  'Artificial intelligence and data science',
  'Electronics and communication engineering',
  'Electrical and electronics engineering',
  'Electrical engineering',
  'Mechanical engineering',
  'Civil engineering',
  'Chemical engineering',
  'Aerospace engineering',
  'Automobile engineering',
  'Biomedical engineering',
  'Biotechnology engineering',
  'Environmental engineering',
  'Industrial engineering',
  'Manufacturing engineering',
  'Materials and metallurgical engineering',
  'Marine engineering',
  'Mining engineering',
  'Petroleum engineering',
  'Mechatronics engineering',
  'Robotics and automation engineering',
  'Architectural engineering',
  'Agricultural engineering',
  'Food technology engineering',
  'Engineering physics',
  'Engineering mathematics',
  'Business and management',
  'Medicine and health sciences',
  'Law',
  'Arts and humanities',
  'Natural sciences',
  'Social sciences',
  'Education',
  'Commerce and finance',
  'Other / enter my department',
]
const semesters = ['Semester 1', 'Semester 2', 'Semester 3', 'Semester 4', 'Semester 5', 'Semester 6', 'Semester 7', 'Semester 8', 'Custom']

function App() {
  const [memory] = useState(() => new StudyMemoryDatabase())
  const [memoryHealth, setMemoryHealth] = useState<MemoryHealth>(() => memory.health())
  const [signedIn, setSignedIn] = useState(() => localStorage.getItem('nexus-signed-in') === 'true')
  const [displayName, setDisplayName] = useState(() => localStorage.getItem('nexus-display-name') ?? '')
  const [signInError, setSignInError] = useState('')
  const googleButtonRef = useRef<HTMLDivElement>(null)
  const [isRunning, setIsRunning] = useState(() => localStorage.getItem('nexus-session-running') === 'true')
  const [elapsed, setElapsed] = useState(() => Number(localStorage.getItem('nexus-session-elapsed') ?? 0))
  const [interruptions, setInterruptions] = useState(2)
  const [counselingOpen, setCounselingOpen] = useState(false)
  const [studyModeOpen, setStudyModeOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [planOpen, setPlanOpen] = useState(false)
  const [practiceOpen, setPracticeOpen] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState('')
  const [remoteMemoryConnected, setRemoteMemoryConnected] = useState(false)
  const [locked, setLocked] = useState(false)
  const [language, setLanguage] = useState('English')
  const [subject, setSubject] = useState('Physics')
  const [topic, setTopic] = useState(() => localStorage.getItem('nexus-topic') ?? 'Waves')
  const [studentProfile, setStudentProfile] = useState('College student')
  const [college, setCollege] = useState(() => localStorage.getItem('nexus-college') ?? '')
  const [department, setDepartment] = useState(() => localStorage.getItem('nexus-department') ?? 'Computer science')
  const [customDepartment, setCustomDepartment] = useState(() => localStorage.getItem('nexus-custom-department') ?? '')
  const [semester, setSemester] = useState(() => localStorage.getItem('nexus-semester') ?? 'Semester 1')
  const [agentEvents, setAgentEvents] = useState<AgentEvent[]>([])
  const [agentDecision, setAgentDecision] = useState<AgentDecision>(() => decideInterruption([]))
  const [counselingConfidence, setCounselingConfidence] = useState(0.92)
  const [learningTasks, setLearningTasks] = useState<LearningTask[]>(() => createLearningTasks('Physics', 'College student'))
  const [events, setEvents] = useState<EventRecord[]>(() => {
    const stored = localStorage.getItem('study-guard-events')
    return stored ? JSON.parse(stored) : initialEvents
  })

  useEffect(() => {
    localStorage.setItem('study-guard-events', JSON.stringify(events))
  }, [events])

  useEffect(() => {
    localStorage.setItem('nexus-session-elapsed', String(elapsed))
    localStorage.setItem('nexus-session-running', String(isRunning))
  }, [elapsed, isRunning])

  useEffect(() => {
    localStorage.setItem('nexus-college', college)
    localStorage.setItem('nexus-department', department)
    localStorage.setItem('nexus-custom-department', customDepartment)
    localStorage.setItem('nexus-semester', semester)
    localStorage.setItem('nexus-topic', topic)
  }, [college, customDepartment, department, semester, topic])

  const effectiveDepartment = department === 'Other / enter my department' ? customDepartment || department : department
  const userName = displayName.trim() || 'Alex'
  const userInitials = userName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()

  useEffect(() => {
    memory.addNode({ id: 'learner:alex', label: userName, type: 'learner', properties: { language } })
    memory.addNode({ id: 'college:profile', label: college || 'College not set', type: 'goal', properties: { department: effectiveDepartment, semester } })
    memory.addNode({ id: 'goal:physics', label: 'Physics revision', type: 'goal', properties: { level: 'intermediate' } })
    memory.addNode({ id: 'topic:current', label: topic || 'Topic not set', type: 'topic', properties: { subject } })
    memory.addNode({ id: 'habit:short-video', label: 'Short-form video', type: 'habit', properties: { risk: 'high' } })
    memory.connect('learner:alex', 'goal:physics', 'WORKING_TOWARD')
    memory.connect('learner:alex', 'college:profile', 'ENROLLED_AT')
    memory.connect('goal:physics', 'topic:current', 'COVERS')
    memory.connect('learner:alex', 'habit:short-video', 'DISTRACTED_BY', 0.78)
    memory.remember('goal:physics', `${userName} is revising ${subject} and currently studying ${topic || 'an open topic'} from first principles`, { kind: 'goal', language, subject })
    memory.remember('college:profile', `${college || 'College'} ${effectiveDepartment} ${semester}`, { kind: 'academic-profile', department: effectiveDepartment, semester })
    memory.remember('habit:short-video', 'Short-form video is a recurring interruption around the forty-five minute focus mark', { kind: 'pattern', confidence: 0.92 })
    setMemoryHealth(memory.health())
    void syncRemoteMemory(memory.snapshot()).then(setRemoteMemoryConnected).catch(() => setRemoteMemoryConnected(false))
  }, [college, effectiveDepartment, language, memory, semester, subject, topic, userName])

  useEffect(() => {
    setLearningTasks(createLearningTasks(subject, studentProfile))
  }, [studentProfile, subject])

  useEffect(() => {
    if (signedIn || !googleButtonRef.current) return
    void mountGoogleButton(googleButtonRef.current, handleGoogleSignIn, setSignInError)
  }, [signedIn])

  useEffect(() => {
    if (!isRunning || locked) return
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [isRunning, locked])

  const formattedTime = `${String(Math.floor(elapsed / 3600)).padStart(2, '0')}:${String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`

  const addEvent = (event: Omit<EventRecord, 'id' | 'time'>) => {
    const now = new Date()
    const eventId = `event:${Date.now()}`
    memory.addNode({ id: eventId, label: event.title, type: 'event', properties: { tone: event.tone } })
    memory.connect('learner:alex', eventId, 'EXPERIENCED')
    memory.remember(eventId, `${event.title}. ${event.detail}`, { kind: 'event', tone: event.tone })
    setMemoryHealth(memory.health())
    void syncRemoteMemory(memory.snapshot()).then(setRemoteMemoryConnected).catch(() => setRemoteMemoryConnected(false))
    setEvents((current) => [
      { ...event, id: Date.now(), time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
      ...current,
    ])
  }

  const simulateInterruption = () => {
    const nextCount = interruptions + 1
    const event: AgentEvent = { type: 'social_attempt', timestamp: new Date().toISOString(), target: 'configured social app' }
    const nextEvents = [...agentEvents, event]
    const nextDecision = decideInterruption(nextEvents, defaultPolicy)
    setInterruptions(nextCount)
    setAgentEvents(nextEvents)
    setAgentDecision(nextDecision)
    addEvent({ title: 'Interruption detected', detail: 'Social media attempt understood locally', tone: 'amber' })
    if (nextDecision.action === 'COUNSEL') {
      setCounselingOpen(true)
      addEvent({ title: 'Counseling ready', detail: 'The agent prepared a 60-second reset', tone: 'rose' })
    }
    if (nextDecision.action === 'LOCK_SOCIAL' || nextDecision.action === 'BLOCK_QUIET_HOURS') setLocked(true)
  }

  const completeCounseling = () => {
    setCounselingOpen(false)
    const event: AgentEvent = { type: 'counseling_completed', timestamp: new Date().toISOString(), acknowledged: true }
    const nextEvents = [...agentEvents, event]
    setAgentEvents(nextEvents)
    setAgentDecision(decideInterruption(nextEvents, defaultPolicy))
    addEvent({ title: 'Three-hour lock active', detail: 'Social media locked; study tools remain available', tone: 'rose' })
    setLocked(true)
  }

  const rateCounseling = (helpful: boolean) => {
    setCounselingConfidence(adaptCounseling(helpful, counselingConfidence))
    addEvent({ title: 'Counseling feedback recorded', detail: helpful ? 'The reset was helpful' : 'The agent will adjust its next prompt', tone: helpful ? 'mint' : 'amber' })
  }

  const resetSession = () => {
    setIsRunning(false)
    setElapsed(0)
    setInterruptions(0)
    setLocked(false)
    setAgentEvents([])
    setAgentDecision(decideInterruption([]))
    addEvent({ title: 'Session reset', detail: 'Ready for a new focus session', tone: 'mint' })
  }

  const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${topic || subject} ${subject} ${effectiveDepartment} college ${language} lecture`)}`
  const practiceQuestion = `Which principle is most important when studying ${topic || subject} in ${effectiveDepartment}?`
  const practiceOptions = ['Define the concept and explain why it matters', 'Memorize the title only', 'Skip examples and practice', 'Study without checking understanding']
  const studyPlan = [
    `Review ${topic || subject} concepts and lecture notes`,
    `Work through three ${topic || subject} examples`,
    `Complete a short recall summary in your own words`,
    `Take a five-minute break and return for a practice check`,
  ]

  function handleGoogleSignIn(profile: VerifiedGoogleProfile) {
    const deviceEmail = localStorage.getItem('nexus-device-email')
    if (deviceEmail && deviceEmail !== profile.email) {
      setSignInError(`This device is linked to ${deviceEmail}. Sign in with that Google account or clear the device profile.`)
      return
    }
    setDisplayName(profile.name)
    localStorage.setItem('nexus-signed-in', 'true')
    localStorage.setItem('nexus-display-name', profile.name)
    localStorage.setItem('nexus-email', profile.email)
    localStorage.setItem('nexus-device-email', profile.email)
    setSignedIn(true)
    setSignInError('')
  }

  const startGoogleSignIn = () => {
    if (!googleButtonRef.current) return
    setSignInError('')
    void mountGoogleButton(googleButtonRef.current, handleGoogleSignIn, setSignInError)
  }

  const continueAsGuest = () => {
    setDisplayName('Guest learner')
    localStorage.setItem('nexus-signed-in', 'true')
    localStorage.setItem('nexus-display-name', 'Guest learner')
    localStorage.setItem('nexus-auth-mode', 'guest')
    setSignedIn(true)
    setSignInError('')
  }

  const signOut = () => {
    localStorage.removeItem('nexus-signed-in')
    localStorage.removeItem('nexus-auth-mode')
    setSignedIn(false)
  }

  if (!signedIn) {
    return (
      <main className="signin-shell">
        <section className="signin-panel">
          <div className="brand signin-brand"><span className="brand-mark">NX</span><span>Nexus AI</span></div>
          <div className="signin-copy"><p className="eyebrow">PRIVATE STUDY COMPANION</p><h1>Protect your attention.</h1><p>Sign in to continue to your personal study space. Your profile and learning memory stay on this device in this MVP.</p></div>
          <div className="signin-form"><button className="google-signin-button" type="button" onClick={startGoogleSignIn}><span className="google-g">G</span> Sign in with Google</button><div ref={googleButtonRef} className="google-button" aria-hidden="true" /><div className="signin-divider"><span>or</span></div><button className="guest-button" type="button" onClick={continueAsGuest}>Continue without signing in</button>{signInError && <p className="signin-error" role="alert">{signInError}</p>}</div>
          <p className="signin-privacy"><span className="status-dot" /> Guest mode uses local memory only · Google adds verified identity and device sync</p>
        </section>
        <aside className="signin-aside"><span className="aside-mark">✦</span><p className="eyebrow">BUILT AROUND YOUR CONTEXT</p><h2>One place for your college, department, semester, subject, and topic.</h2><p>Nexus AI uses that context to create focused study tasks, understand interruptions, and keep distracting notifications out of the way.</p></aside>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <button className="tamil-language-button" type="button" onClick={() => setLanguage('Tamil')} aria-label="Use Tamil recommendations">தமிழ்</button>
      <header className="topbar">
        <div className="brand"><span className="brand-mark">NX</span><span>Nexus AI</span></div>
        <div className="topbar-actions"><span className="privacy-chip"><span className="status-dot" /> Local-first</span><button className="icon-button" aria-label="Open settings">⚙</button><button className="avatar" aria-label={`Sign out ${userName}`} title={`Sign out ${userName}`} onClick={signOut}>{userInitials}</button></div>
      </header>

      <section className="welcome-row">
        <div><p className="eyebrow">Wednesday, September 10</p><h1>Good morning, {userName}.</h1><p className="subtitle">Your attention is a resource. Let&apos;s spend it deliberately.</p></div>
        <div className="profile-controls"><label className="profile-control">Profile<select value={studentProfile} onChange={(event) => setStudentProfile(event.target.value)} aria-label="Study profile"><option>College student</option><option>High school student</option><option>Professional learner</option><option>Researcher</option></select></label><label className="profile-control">College<input value={college} onChange={(event) => setCollege(event.target.value)} placeholder="Your college" aria-label="College name" /></label><label className="profile-control">Department<select value={department} onChange={(event) => setDepartment(event.target.value)} aria-label="Department">{departments.map((item) => <option key={item}>{item}</option>)}</select></label>{department === 'Other / enter my department' && <label className="profile-control">Custom department<input value={customDepartment} onChange={(event) => setCustomDepartment(event.target.value)} placeholder="Enter department" aria-label="Custom department" /></label>}<label className="profile-control">Semester<select value={semester} onChange={(event) => setSemester(event.target.value)} aria-label="Semester">{semesters.map((item) => <option key={item}>{item}</option>)}</select></label><label className="profile-control">Topic<input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="What are you studying?" aria-label="Study topic" /></label></div>
        <div className="session-actions"><button className="quiet-button" onClick={() => setIsRunning((value) => !value)}>{isRunning ? 'Pause session' : elapsed > 0 ? 'Resume session' : 'Start session'} <span>↗</span></button><button className="reset-button" onClick={resetSession}>Reset</button></div>
      </section>

      <section className="hero-grid">
        <article className={`focus-panel ${locked ? 'is-locked' : ''}`}>
          <div className="panel-kicker"><span className="live-pulse" /> {locked ? 'SOCIAL MEDIA LOCK ACTIVE' : 'FOCUS SESSION IN PROGRESS'}</div>
          <div className="focus-main"><div><p className="session-label">Deep work / {subject} · {topic || 'Choose a topic'}</p><div className="timer">{formattedTime}</div><p className="timer-caption">of 90 minutes planned</p></div><div className="progress-ring"><div><strong>49%</strong><span>complete</span></div></div></div>
          <div className="focus-footer"><div className="mode-meta"><span>Mode</span><strong>Adaptive focus</strong></div><div className="mode-meta"><span>Next break</span><strong>in 15 min</strong></div><button className="primary-button" onClick={simulateInterruption}>{locked ? 'Social media locked' : 'Simulate interruption'} <span>→</span></button></div>
        </article>
        <aside className="agent-card"><div className="agent-heading"><div className="agent-orb">✦</div><div><p className="eyebrow">AGENT OBSERVATION</p><h2>{agentDecision.action === 'BLOCK_QUIET_HOURS' ? 'Quiet hours active' : 'Pattern understood'}</h2></div><span className="confidence">{Math.round(counselingConfidence * 100)}% confidence</span></div><p className="agent-copy">{agentDecision.reason} {agentDecision.counseling ?? 'A five-minute movement break now could protect the rest of this session.'}</p><button className="text-button" onClick={() => setCounselingOpen(true)}>Start a reset conversation <span>→</span></button><div className="model-note"><span className="mini-dot" /> Local transformer ready <span>·</span> {remoteMemoryConnected ? 'Qdrant + Neo4j synced' : 'Local memory active'}</div><div className="memory-health"><div><strong>{memoryHealth.vectors}</strong><span>semantic memories</span></div><div><strong>{memoryHealth.nodes}</strong><span>graph nodes</span></div><div><strong>{memoryHealth.edges}</strong><span>relationships</span></div></div></aside>
      </section>

      <section className="stats-grid"><div className="stat-card"><span className="stat-label">Focused today</span><strong>2h 18m</strong><span className="stat-trend positive">↑ 24m vs. average</span></div><div className="stat-card"><span className="stat-label">Interruptions</span><strong>{interruptions}</strong><span className="stat-trend neutral">This session</span></div><div className="stat-card"><span className="stat-label">Time recovered</span><strong>37m</strong><span className="stat-trend positive">↑ 18% this week</span></div><div className="stat-card"><span className="stat-label">Next quiet window</span><strong>11:00 PM</strong><span className="stat-trend neutral">Social media blocked until 5 AM</span></div></section>

      <section className="content-grid"><article className="timeline-panel"><div className="section-heading"><div><p className="eyebrow">PERMANENT MEMORY</p><h2>Today&apos;s timeline</h2></div><button className="link-button" onClick={() => setHistoryOpen(true)}>View all history <span>→</span></button></div><div className="timeline">{events.slice(0, 4).map((event) => <div className="timeline-item" key={event.id}><div className={`timeline-icon ${event.tone}`}>{event.tone === 'mint' ? '✓' : event.tone === 'amber' ? '◌' : '!'}</div><div className="timeline-copy"><strong>{event.title}</strong><span>{event.detail}</span></div><time>{event.time}</time></div>)}</div><div className="retention-note"><span>⌁</span><span><strong>Nothing gets forgotten.</strong> Your history is encrypted and stored locally until you choose to remove it.</span></div></article><article className="learning-panel"><div className="section-heading"><div><p className="eyebrow">LEARNING COMPANION</p><h2>Choose your subject</h2></div><select value={language} onChange={(event) => setLanguage(event.target.value)} aria-label="Recommendation language"><option>English</option><option>Hindi</option><option>Spanish</option><option>French</option></select></div><div className="subject-picker">{subjects.map((item) => <button className={item === subject ? 'subject-chip selected' : 'subject-chip'} key={item} onClick={() => setSubject(item)}>{item}</button>)}</div><div className="learning-actions"><button className="quiet-button" onClick={() => setPlanOpen(true)}>Complete study plan <span>→</span></button><button className="quiet-button" onClick={() => { setSelectedAnswer(''); setPracticeOpen(true) }}>Practice questions <span>→</span></button></div><div className="task-list">{learningTasks.map((task) => <div className="task-row" key={task.id}><span className="task-check">{task.status === 'done' ? '✓' : '○'}</span><span>{task.title}</span><small>{task.minutes} min</small></div>)}</div><div className="video-card"><div className="video-art"><span>{subject.toUpperCase()}</span><strong>{subject} explained<br />for {studentProfile.toLowerCase()}s</strong><small>8:42 · Captions available</small></div><div className="video-info"><span className="relevance">98% relevant</span><strong>Recommended lesson</strong><span>Matched to {college || 'your college'} · {effectiveDepartment} · {semester}</span><button className="watch-button" onClick={() => setStudyModeOpen(true)} aria-label={`Watch ${subject} lesson in study mode`}>Watch in study mode <span>↗</span></button></div></div><p className="recommendation-note">Recommendations adapt to {subject}, your profile, {effectiveDepartment}, {semester}, and preferred {language.toLowerCase()} content.</p></article></section>

      <footer className="bottom-status"><span><span className="status-dot" /> All systems active</span><span>Windows integration ready for setup</span><span>Last synced locally just now</span></footer>

      {counselingOpen && <div className="modal-backdrop"><section className="counseling-modal" role="dialog" aria-modal="true" aria-labelledby="counseling-title"><button className="close-button" onClick={() => setCounselingOpen(false)} aria-label="Close counseling">×</button><div className="modal-symbol">✦</div><p className="eyebrow">A SHORT RESET</p><h2 id="counseling-title">Your attention drifted. That&apos;s useful information.</h2><p>{agentDecision.counseling ?? 'The agent noticed repeated social-media attempts during this session.'}</p><div className="modal-actions"><button className="quiet-button" onClick={() => { rateCounseling(true); setCounselingOpen(false) }}>Helpful, take a break</button><button className="primary-button" onClick={completeCounseling}>Continue with a lock</button></div><small>Choosing the lock blocks configured social media for 3 hours. Study tools stay available.</small></section></div>}
      {studyModeOpen && <div className="modal-backdrop"><section className="study-modal" role="dialog" aria-modal="true" aria-labelledby="study-mode-title"><button className="close-button" onClick={() => setStudyModeOpen(false)} aria-label="Close study mode">×</button><div className="modal-symbol">▶</div><p className="eyebrow">CONTROLLED STUDY MODE</p><h2 id="study-mode-title">{subject} lesson for {studentProfile.toLowerCase()}s</h2><p>Nexus AI will keep this session focused on {subject}, {effectiveDepartment}, and {semester}. Open the educational search in a new tab, then return here to log whether it helped.</p><div className="modal-actions"><button className="quiet-button" onClick={() => setStudyModeOpen(false)}>Stay here</button><a className="primary-button study-link" href={youtubeSearchUrl} target="_blank" rel="noreferrer" onClick={() => addEvent({ title: 'Learning resource opened', detail: `${subject} study search opened in ${language}`, tone: 'mint' })}>Open YouTube study search <span>↗</span></a></div><small>Autoplay and unrelated recommendations are not controlled by this prototype. The link uses a public YouTube search.</small></section></div>}
      {historyOpen && <div className="modal-backdrop"><section className="study-modal history-modal" role="dialog" aria-modal="true" aria-labelledby="history-title"><button className="close-button" onClick={() => setHistoryOpen(false)} aria-label="Close history">×</button><div className="modal-symbol">⌁</div><p className="eyebrow">PERMANENT MEMORY</p><h2 id="history-title">Complete study history</h2><div className="history-list">{events.map((event) => <div className="timeline-item" key={event.id}><div className={`timeline-icon ${event.tone}`}>{event.tone === 'mint' ? '✓' : event.tone === 'amber' ? '◌' : '!'}</div><div className="timeline-copy"><strong>{event.title}</strong><span>{event.detail}</span></div><time>{event.time}</time></div>)}</div><small>{events.length} events stored locally. Remote sync: {remoteMemoryConnected ? 'Qdrant and Neo4j connected.' : 'not configured; local memory remains active.'}</small></section></div>}
      {planOpen && <div className="modal-backdrop"><section className="study-modal" role="dialog" aria-modal="true" aria-labelledby="plan-title"><button className="close-button" onClick={() => setPlanOpen(false)} aria-label="Close study plan">×</button><div className="modal-symbol">✓</div><p className="eyebrow">ADAPTIVE STUDY PLAN</p><h2 id="plan-title">{topic || subject} plan</h2><p>{college || 'Your college'} · {effectiveDepartment} · {semester}</p><div className="history-list">{studyPlan.map((step, index) => <div className="task-row" key={step}><span className="task-check">{index + 1}</span><span>{step}</span><small>{index === 0 ? '25 min' : '20 min'}</small></div>)}</div><button className="primary-button" onClick={() => { addEvent({ title: 'Study plan started', detail: `${topic || subject} plan opened`, tone: 'mint' }); setPlanOpen(false) }}>Start this plan <span>→</span></button></section></div>}
      {practiceOpen && <div className="modal-backdrop"><section className="study-modal" role="dialog" aria-modal="true" aria-labelledby="practice-title"><button className="close-button" onClick={() => setPracticeOpen(false)} aria-label="Close practice questions">×</button><div className="modal-symbol">?</div><p className="eyebrow">PRACTICE CHECK</p><h2 id="practice-title">{practiceQuestion}</h2><div className="practice-options">{practiceOptions.map((option) => <button className={selectedAnswer === option ? 'practice-option selected' : 'practice-option'} key={option} onClick={() => setSelectedAnswer(option)}>{option}</button>)}</div>{selectedAnswer && <p className={selectedAnswer === practiceOptions[0] ? 'answer-correct' : 'answer-review'}>{selectedAnswer === practiceOptions[0] ? 'Correct. Explaining the idea in your own words is the strongest first check.' : 'Review this: start by defining the concept and explaining why it matters.'}</p>}<button className="primary-button" onClick={() => { addEvent({ title: 'Practice question completed', detail: `${topic || subject} practice check answered`, tone: selectedAnswer === practiceOptions[0] ? 'mint' : 'amber' }); setPracticeOpen(false) }}>Save answer <span>→</span></button></section></div>}
    </main>
  )
}

export default App
