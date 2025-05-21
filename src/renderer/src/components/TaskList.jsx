import React from 'react'
import data from '../data/tasks.json'
import './TaskList.css'

const TaskList = ({ projectId, selectedTask, setSelectedTask, handleStart, handleStop }) => {
  const selectedProject = data.projects.find((proj) => proj.projectId === projectId)

  const handleTaskClick = (taskName) => {
    if (selectedTask === taskName) {
      handleStop()
      setSelectedTask(null)
      window.taskApi?.selectTask(null) // whatever your API requires
      return
    }
    setSelectedTask(taskName)
    handleStart()
    window.taskApi?.selectTask(taskName)
  }

  if (!selectedProject) {
    return null
  }

  return (
    <div className="task-list">
      {selectedProject.tasks.map((task) => (
        <div
          key={task.taskId}
          className={`task-item ${selectedTask === task.taskName ? 'selected' : ''}`}
          onClick={() => handleTaskClick(task.taskName)}
        >
          <div className="task-content">
            <span className="task-name">{task.taskName}</span>
            <span className="task-chevron">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

export default TaskList
