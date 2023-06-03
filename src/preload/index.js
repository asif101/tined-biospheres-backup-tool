import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  getDefaultFolder: () => ipcRenderer.invoke('getDefaultFolder'),
  selectFolder: () => ipcRenderer.invoke('dialog:openDirectory'),
  startBackup: (path) => ipcRenderer.invoke('startBackup', path),
  onDownloadStatus: (func) => ipcRenderer.on('downloadStatus', func),
  offDownloadStatus: (func) => ipcRenderer.off('downloadStatus', func)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}
