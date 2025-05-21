import React from 'react'
import data from '../data/tasks.json'
import './ProjectList.css'

const ProjectList = ({ selectedProjectId, setSelectedProjectId, setSelectedTask }) => {
  const selectProject = (projectId) => {
    setSelectedProjectId(projectId);
    // Reset selected task when changing projects
    setSelectedTask(null);
  };

  return (
    <div className="project-list">
      {data.projects.map((project) => (
        <div 
          key={project.projectId} 
          className={`project-item ${selectedProjectId === project.projectId ? 'selected' : ''}`}
          onClick={() => selectProject(project.projectId)}
        >
          <div className="project-content">
            <span className="project-name">{project.projectName}</span>
            {/* {selectedProjectId === project.projectId && (
              <span className="project-time">6:54</span>
            )} */}
          </div>
        </div>
      ))}
    </div>
  )
}

export default ProjectList