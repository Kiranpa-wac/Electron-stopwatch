import { contextBridge, ipcRenderer } from "electron"

contextBridge.exposeInMainWorld('timerApi', {
  start: () => ipcRenderer.send('timer-start'),
  stop: () => ipcRenderer.send('timer-stop'),
  reset: () => ipcRenderer.send('timer-reset'),
  onTick: (cb) => ipcRenderer.on('timer-tick', (_e, sec) => cb(sec)),
  notify: (msg) => ipcRenderer.send('notify', msg)
})

contextBridge.exposeInMainWorld('activityApi', {
  onActivityUpdate: (cb) => ipcRenderer.on('activity-update', (_e, percent) => cb(percent))
})

contextBridge.exposeInMainWorld('taskApi',{
  selectTask : (taskName) => ipcRenderer.send('task-selected', taskName),
})