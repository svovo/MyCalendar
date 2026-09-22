const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  loadUserData: (username) => ipcRenderer.invoke('load-user-data', username),
  saveUserData: (username, data) => ipcRenderer.invoke('save-user-data', { username, data }),
  getSavedUsers: () => ipcRenderer.invoke('get-saved-users')
});
