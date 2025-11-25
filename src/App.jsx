import React, { useState, useEffect, useMemo } from 'react'

const TIMER_MODES = {
  FOCUS: 'Focus',
  SHORT: 'Short break',
  LONG: 'Long break',
}

function formatMMSS(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatStopwatch(ms) {
  const totalSeconds = Math.floor(ms / 1000)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  const tenth = Math.floor((ms % 1000) / 100)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${tenth}`
}

function analyseProgress({ totalFocusMinutes, completedTasks, totalTasks }) {
  if (totalTasks === 0 && totalFocusMinutes === 0) {
    return "Today is still blank. Let’s add one small task and start a 15-minute focus block."
  }
  const completionRate = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100)
  if (completionRate >= 80 && totalFocusMinutes >= 120) {
    return "You’re doing great today. High completion and solid focus time. Consider a longer rest before bed."
  } else if (completionRate < 40 && totalFocusMinutes < 60) {
    return "Slow day so far. Try one tiny task and a 10–15 minute focus session to restart momentum."
  } else {
    return "You’re making progress. Let’s finish 1–2 more tasks and then you can relax guilt-free."
  }
}

function coachReply(message) {
  const lower = message.toLowerCase()
  if (lower.includes('tired') || lower.includes('exhausted')) {
    return "You sound tired. Let’s schedule a short 5–10 minute break, drink some water, then do just one small chunk of work."
  }
  if (lower.includes('exam') || lower.includes('test')) {
    return "For exams, split revision into small topics and use 25-minute focus blocks. Start with the hardest or most important topics first."
  }
  if (lower.includes('job') || lower.includes('office') || lower.includes('work')) {
    return "For work tasks, list 3 key items. Start with the one that moves things forward the most, even if it’s a bit uncomfortable."
  }
  if (lower.includes('sad') || lower.includes('anxious')) {
    return "I can’t replace real people, but I’m here to listen. Try to write exactly what’s bothering you in one line, then we’ll break it into smaller steps."
  }
  return "Got it. Tell me what you want to focus on in the next 30 minutes—study, chores, work, or rest—and I’ll suggest a tiny plan."
}

function App() {
  const [theme, setTheme] = useState('cute')
  const [activeTab, setActiveTab] = useState('timers')

  // Pomodoro
  const [focusMinutes, setFocusMinutes] = useState(25)
  const [shortBreakMinutes, setShortBreakMinutes] = useState(5)
  const [longBreakMinutes, setLongBreakMinutes] = useState(15)
  const [cyclesBeforeLong, setCyclesBeforeLong] = useState(4)

  const [pomodoroMode, setPomodoroMode] = useState(TIMER_MODES.FOCUS)
  const [pomodoroSeconds, setPomodoroSeconds] = useState(focusMinutes * 60)
  const [pomodoroRunning, setPomodoroRunning] = useState(false)
  const [completedFocusBlocks, setCompletedFocusBlocks] = useState(0)
  const [focusByHour, setFocusByHour] = useState({})

  // Stopwatch
  const [swRunning, setSwRunning] = useState(false)
  const [swElapsed, setSwElapsed] = useState(0)
  const [swLaps, setSwLaps] = useState([])

  // Timer
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)

  // Tasks
  const [tasks, setTasks] = useState([])
  const [taskTitle, setTaskTitle] = useState('')
  const [taskMinutes, setTaskMinutes] = useState(25)
  const [taskPriority, setTaskPriority] = useState(3)

  // Coach
  const [messages, setMessages] = useState([])
  const [chatInput, setChatInput] = useState('')

  // ----- POMODORO EFFECT -----
  useEffect(() => {
    let interval
    if (pomodoroRunning) {
      interval = setInterval(() => {
        setPomodoroSeconds(prev => {
          if (prev <= 1) {
            // session complete
            handlePomodoroComplete()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [pomodoroRunning, pomodoroMode, focusMinutes, shortBreakMinutes, longBreakMinutes, cyclesBeforeLong])

  const handlePomodoroComplete = () => {
    setPomodoroRunning(false)
    setPomodoroSeconds(0)
    if (pomodoroMode === TIMER_MODES.FOCUS) {
      setCompletedFocusBlocks(prev => prev + 1)
      const hour = new Date().getHours()
      setFocusByHour(prev => {
        const copy = { ...prev }
        copy[hour] = (copy[hour] || 0) + 1
        return copy
      })
      setPomodoroMode(prev => {
        const nextBlocks = completedFocusBlocks + 1
        if (nextBlocks % cyclesBeforeLong === 0) return TIMER_MODES.LONG
        return TIMER_MODES.SHORT
      })
    } else {
      setPomodoroMode(TIMER_MODES.FOCUS)
    }
  }

  useEffect(() => {
    if (!pomodoroRunning) {
      if (pomodoroMode === TIMER_MODES.FOCUS) {
        setPomodoroSeconds(focusMinutes * 60)
      } else if (pomodoroMode === TIMER_MODES.SHORT) {
        setPomodoroSeconds(shortBreakMinutes * 60)
      } else {
        setPomodoroSeconds(longBreakMinutes * 60)
      }
    }
  }, [pomodoroMode, focusMinutes, shortBreakMinutes, longBreakMinutes, pomodoroRunning])

  // ----- STOPWATCH EFFECT -----
  useEffect(() => {
    let interval
    if (swRunning) {
      interval = setInterval(() => {
        setSwElapsed(prev => prev + 100)
      }, 100)
    }
    return () => clearInterval(interval)
  }, [swRunning])

  // ----- TIMER EFFECT -----
  useEffect(() => {
    let interval
    if (timerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            setTimerRunning(false)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [timerRunning, timerSeconds])

  // ----- TASKS -----
  const prioritizedTasks = useMemo(() => {
    const copy = [...tasks]
    copy.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1
      if (!!a.due !== !!b.due) return a.due ? -1 : 1
      if (a.due && b.due) {
        const ad = new Date(a.due).getTime()
        const bd = new Date(b.due).getTime()
        if (ad !== bd) return ad - bd
      }
      return a.priority - b.priority
    })
    return copy
  }, [tasks])

  const totalFocusMinutes = completedFocusBlocks * focusMinutes
  const completedTasks = tasks.filter(t => t.completed).length

  const bestHour = useMemo(() => {
    const entries = Object.entries(focusByHour)
    if (!entries.length) return null
    entries.sort((a, b) => b[1] - a[1])
    return entries[0][0]
  }, [focusByHour])

  // ----- DAY SCHEDULE -----
  const generateSchedule = () => {
    const blocks = []
    blocks.push('07:30–08:00  Breakfast')
    blocks.push('13:00–13:30  Lunch')
    blocks.push('20:00–20:30  Dinner')
    blocks.push('23:30–07:00  Sleep')

    const activeTasks = prioritizedTasks.filter(t => !t.completed)
    const best = bestHour !== null ? Number(bestHour) : 10

    function block(hour, minutes, task) {
      const endHour = hour
      const endMinute = minutes + 25
      const startStr = `${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
      const endStr = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`
      return `${startStr}–${endStr}  Focus: ${task ? task.title : 'Deep work'}`
    }

    if (activeTasks[0]) blocks.push(block(best, 0, activeTasks[0]))
    if (activeTasks[1]) blocks.push(block(best + 1, 0, activeTasks[1]))
    if (activeTasks[2]) blocks.push(block(16, 0, activeTasks[2]))

    alert(blocks.join('\n'))
  }

  // ----- CHAT -----
  const sendMessage = () => {
    const text = chatInput.trim()
    if (!text) return
    setMessages(prev => [...prev, { from: 'you', text }])
    setChatInput('')
    const reply = coachReply(text)
    setTimeout(() => {
      setMessages(prev => [...prev, { from: 'bot', text: reply }])
    }, 300)
  }

  return (
    <div className={`app theme-${theme}`}>
      <header className="app-header">
        <div className="logo">
          <span className="logo-dot" />
          <span className="logo-text">ZENTRYX</span>
        </div>
        <nav className="tabs-main">
          <button
            className={activeTab === 'timers' ? 'active' : ''}
            onClick={() => setActiveTab('timers')}
          >
            Timers
          </button>
          <button
            className={activeTab === 'tasks' ? 'active' : ''}
            onClick={() => setActiveTab('tasks')}
          >
            Tasks
          </button>
          <button
            className={activeTab === 'stats' ? 'active' : ''}
            onClick={() => setActiveTab('stats')}
          >
            Stats
          </button>
          <button
            className={activeTab === 'coach' ? 'active' : ''}
            onClick={() => setActiveTab('coach')}
          >
            Coach
          </button>
        </nav>
        <div className="theme-switcher">
          <label>
            <input
              type="radio"
              name="theme"
              value="cute"
              checked={theme === 'cute'}
              onChange={() => setTheme('cute')}
            />
            Cute
          </label>
          <label>
            <input
              type="radio"
              name="theme"
              value="pro"
              checked={theme === 'pro'}
              onChange={() => setTheme('pro')}
            />
            Professional
          </label>
          <label>
            <input
              type="radio"
              name="theme"
              value="minimal"
              checked={theme === 'minimal'}
              onChange={() => setTheme('minimal')}
            />
            Minimal
          </label>
        </div>
      </header>

      <main className="app-main">
        {/* WIDGETS ROW */}
        <section className="widgets">
          <div className="widget">
            <h3>Pomodoro</h3>
            <div className="widget-time">{formatMMSS(pomodoroSeconds)}</div>
            <div className="widget-label">{pomodoroMode}</div>
          </div>
          <div className="widget">
            <h3>Stopwatch</h3>
            <div className="widget-time">{formatStopwatch(swElapsed)}</div>
          </div>
          <div className="widget">
            <h3>Timer</h3>
            <div className="widget-time">{formatMMSS(timerSeconds)}</div>
          </div>
        </section>

        {activeTab === 'timers' && (
          <section className="card">
            <h2>Timers</h2>
            <div className="timers-grid">
              {/* Pomodoro */}
              <div className="timer-block">
                <div className="card-header-row">
                  <h3>Pomodoro</h3>
                  <span className="badge">{pomodoroMode}</span>
                </div>
                <div className="big-timer">{formatMMSS(pomodoroSeconds)}</div>
                <div className="controls">
                  <button onClick={() => setPomodoroRunning(true)}>Start</button>
                  <button onClick={() => setPomodoroRunning(false)}>Pause</button>
                  <button
                    onClick={() => {
                      setPomodoroRunning(false)
                      if (pomodoroMode === TIMER_MODES.FOCUS) {
                        setPomodoroSeconds(focusMinutes * 60)
                      } else if (pomodoroMode === TIMER_MODES.SHORT) {
                        setPomodoroSeconds(shortBreakMinutes * 60)
                      } else {
                        setPomodoroSeconds(longBreakMinutes * 60)
                      }
                    }}
                  >
                    Reset
                  </button>
                </div>
                <div className="chips-row">
                  <button onClick={() => setPomodoroMode(TIMER_MODES.FOCUS)}>Focus</button>
                  <button onClick={() => setPomodoroMode(TIMER_MODES.SHORT)}>Short break</button>
                  <button onClick={() => setPomodoroMode(TIMER_MODES.LONG)}>Long break</button>
                </div>
                <div className="config-grid">
                  <label>
                    Focus (min)
                    <input
                      type="number"
                      min={5}
                      max={90}
                      value={focusMinutes}
                      onChange={e => setFocusMinutes(Number(e.target.value) || 0)}
                    />
                  </label>
                  <label>
                    Short break (min)
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={shortBreakMinutes}
                      onChange={e => setShortBreakMinutes(Number(e.target.value) || 0)}
                    />
                  </label>
                  <label>
                    Long break (min)
                    <input
                      type="number"
                      min={5}
                      max={60}
                      value={longBreakMinutes}
                      onChange={e => setLongBreakMinutes(Number(e.target.value) || 0)}
                    />
                  </label>
                  <label>
                    Cycles before long
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={cyclesBeforeLong}
                      onChange={e => setCyclesBeforeLong(Number(e.target.value) || 1)}
                    />
                  </label>
                </div>
                <p className="small-text">
                  Completed focus blocks today: <strong>{completedFocusBlocks}</strong>
                </p>
              </div>

              {/* Stopwatch */}
              <div className="timer-block">
                <div className="card-header-row">
                  <h3>Stopwatch</h3>
                </div>
                <div className="big-timer">{formatStopwatch(swElapsed)}</div>
                <div className="controls">
                  <button onClick={() => setSwRunning(true)}>Start</button>
                  <button onClick={() => setSwRunning(false)}>Pause</button>
                  <button
                    onClick={() => {
                      setSwRunning(false)
                      setSwElapsed(0)
                      setSwLaps([])
                    }}
                  >
                    Reset
                  </button>
                </div>
                <ul className="laps-list">
                  {swLaps.map((lap, idx) => (
                    <li key={idx}>
                      Lap {idx + 1}: {formatStopwatch(lap)}
                    </li>
                  ))}
                </ul>
                <button
                  className="secondary"
                  onClick={() => setSwLaps(prev => [...prev, swElapsed])}
                  disabled={swElapsed === 0}
                >
                  Lap
                </button>
              </div>

              {/* Timer */}
              <div className="timer-block">
                <div className="card-header-row">
                  <h3>Timer</h3>
                </div>
                <div className="big-timer">{formatMMSS(timerSeconds)}</div>
                <div className="controls">
                  <button onClick={() => { setTimerSeconds(5 * 60); setTimerRunning(true) }}>
                    5 min
                  </button>
                  <button onClick={() => { setTimerSeconds(10 * 60); setTimerRunning(true) }}>
                    10 min
                  </button>
                  <button onClick={() => { setTimerSeconds(25 * 60); setTimerRunning(true) }}>
                    25 min
                  </button>
                </div>
                <div className="controls">
                  <button onClick={() => setTimerRunning(true)}>Start</button>
                  <button onClick={() => setTimerRunning(false)}>Pause</button>
                  <button onClick={() => { setTimerRunning(false); setTimerSeconds(0) }}>
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'tasks' && (
          <section className="card">
            <h2>Tasks</h2>
            <div className="task-input-row">
              <input
                type="text"
                placeholder="Task title"
                value={taskTitle}
                onChange={e => setTaskTitle(e.target.value)}
              />
              <input
                type="number"
                min={5}
                max={240}
                value={taskMinutes}
                onChange={e => setTaskMinutes(Number(e.target.value) || 0)}
              />
              <select
                value={taskPriority}
                onChange={e => setTaskPriority(Number(e.target.value))}
              >
                <option value={1}>P1</option>
                <option value={2}>P2</option>
                <option value={3}>P3</option>
                <option value={4}>P4</option>
                <option value={5}>P5</option>
              </select>
              <button
                onClick={() => {
                  if (!taskTitle.trim()) return
                  setTasks(prev => [
                    ...prev,
                    {
                      id: Date.now(),
                      title: taskTitle.trim(),
                      minutes: taskMinutes,
                      priority: taskPriority,
                      completed: false,
                      due: null,
                    },
                  ])
                  setTaskTitle('')
                  setTaskMinutes(25)
                  setTaskPriority(3)
                }}
              >
                Add
              </button>
            </div>
            <ul className="task-list">
              {prioritizedTasks.map(task => (
                <li key={task.id} className={task.completed ? 'done' : ''}>
                  <label>
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() =>
                        setTasks(prev =>
                          prev.map(t =>
                            t.id === task.id ? { ...t, completed: !t.completed } : t,
                          ),
                        )
                      }
                    />
                    <span className="task-title">{task.title}</span>
                  </label>
                  <span className="task-meta">
                    {task.minutes} min • P{task.priority}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {activeTab === 'stats' && (
          <section className="card">
            <h2>Stats & Insights</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <h3>Today’s focus time</h3>
                <p>{totalFocusMinutes} min</p>
              </div>
              <div className="stat-card">
                <h3>Tasks completed</h3>
                <p>
                  {completedTasks} / {tasks.length}
                </p>
              </div>
              <div className="stat-card">
                <h3>Best productivity hour</h3>
                <p>
                  {bestHour === null
                    ? 'Not enough data yet'
                    : `${String(bestHour).padStart(2, '0')}:00`}
                </p>
              </div>
            </div>
            <p className="analysis-text">
              {analyseProgress({
                totalFocusMinutes,
                completedTasks,
                totalTasks: tasks.length,
              })}
            </p>
            <button onClick={generateSchedule}>Generate day schedule</button>
          </section>
        )}

        {activeTab === 'coach' && (
          <section className="card card-coach">
            <h2>Friend & Coach</h2>
            <div className="chat-box">
              {messages.map((m, idx) => (
                <div key={idx} className={`chat-message ${m.from}`}>
                  <div className="bubble">{m.text}</div>
                </div>
              ))}
            </div>
            <div className="chat-input-row">
              <input
                type="text"
                placeholder="Tell me about your day or a problem..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') sendMessage()
                }}
              />
              <button onClick={sendMessage}>Send</button>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
