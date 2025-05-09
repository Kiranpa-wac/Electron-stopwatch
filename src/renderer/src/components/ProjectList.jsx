import React, { useState } from 'react'
import data from '../data/tasks.json'


const ProjectList = () => {
  const [selectedProjectId, setSelectedProjectId] = useState(null)
  const [selectedTaskName, setSelectedTaskName] = useState(null)

  const selectedProject = data.projects.find((proj) => proj.projectId === selectedProjectId)

  const switchTask = (taskName) => {
    setSelectedTaskName(taskName)
    window.taskApi.selectTask(taskName)
  }

  return (
    <div>
      <div>
        <h2>Projects</h2>
        {data.projects.map((project) => (
          <div key={project.projectId} onClick={() => setSelectedProjectId(project.projectId)}>
            {project.projectName}
          </div>
        ))}
      </div>
      <div>
        <h2>Tasks</h2>
        {selectedProject ? (
          <ul>
            {selectedProject.tasks.map((task) => (
              <li key={task.taskId} onClick={() => switchTask(task.taskName)}>
                  
                <strong>{task.taskName}</strong> 
              </li>
            ))}
          </ul>
        ): (
          <p>Select a Project</p>
        )}
      </div>
    </div>
  )
}

export default ProjectList
