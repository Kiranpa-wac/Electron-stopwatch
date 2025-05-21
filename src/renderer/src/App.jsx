import { useState, useEffect } from 'react'
import ProjectList from './components/ProjectList'
import TaskList from './components/TaskList'
import './App.css'

function formatTime(totalSeconds) {
  const hrs = String(Math.floor(totalSeconds / 3600)).padStart(2, '0')
  const mins = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0')
  const secs = String(totalSeconds % 60).padStart(2, '0')
  return `${hrs}:${mins}:${secs}`
}

export default function App() {
  const [elapsed, setElapsed] = useState(0)
  const [activityPercent, setActivityPercent] = useState(0)
  const [selectedProjectId, setSelectedProjectId] = useState(null)
  const [selectedTask, setSelectedTask] = useState(null)

  useEffect(() => {
    window.timerApi.onTick((seconds) => {
      setElapsed(seconds)
    })

    window.activityApi.onActivityUpdate((percent) => {
      setActivityPercent(percent)
    })
  }, [])

  const handleStart = () => {
    window.timerApi.notify({ title: 'Stopwatch', body: 'Started' })
    window.timerApi.start()
  }

  const handleStop = () => {
    window.timerApi.stop()
    window.timerApi.notify({ title: 'Stopwatch', body: 'Stopped' })
  }

  const handleReset = () => {
    window.timerApi.reset()
    setElapsed(0)
  }

  return (
    <div className="app-container">
      {/* Header */}
      <div className="app-header">
        <h1>Timez</h1>
      </div>

      {/* Main content */}
      <div className="app-content">
        {/* Left sidebar */}
        <div className="app-sidebar">
          {/* Timer display */}
          <div className="timer-display">
            <h1>{formatTime(elapsed)}</h1>
          </div>

          {/* Search projects */}
          <div className="search-container">
            <div className="search-input-wrapper">
              <div className="search-icon">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </div>
              <input type="text" className="search-input" placeholder="Search Projects" />
            </div>
          </div>

          {/* Projects list */}
          <div className="projects-container">
            <ProjectList
              selectedProjectId={selectedProjectId}
              setSelectedProjectId={setSelectedProjectId}
              setSelectedTask={setSelectedTask}
            />
          </div>

          {/* Version number */}
          <div className="version-info">
            <div className="status-indicator">
              <div className="status-dot"></div>
            </div>
            <div className="version-number">v.2.0.0 (beta-2)</div>
          </div>
        </div>

        {/* Right content area */}
        <div className="app-main">
          {/* Search tasks */}
          <div className="task-search-container">
            <div className="search-input-wrapper">
              <div className="search-icon">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </div>
              <input type="text" className="search-input" placeholder="Search task" />
              <button className="menu-button">
                <svg
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="19" cy="12" r="1" />
                  <circle cx="5" cy="12" r="1" />
                </svg>
              </button>
            </div>
          </div>

          {/* Tasks list */}
          <div className="tasks-container">
            <TaskList
              projectId={selectedProjectId}
              selectedTask={selectedTask}
              setSelectedTask={setSelectedTask}
              handleStart={handleStart}
              handleStop={handleStop}
            />
          </div>

          {/* Task details area */}
          <div className="task-details">{selectedTask && <h2>{selectedTask}</h2>}</div>
        </div>
      </div>
    </div>
  )
}
