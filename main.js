const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

// Directory per i salvataggi utenti: %APPDATA%/MyCalendar/userdata (o cartella locale)
function getUserDataDir() {
  const dir = path.join(app.getPath('userData'), 'user_profiles');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function sanitizeUsername(username) {
  return username.trim().toLowerCase().replace(/[^a-z0-9_-]/gi, '_');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    title: 'MyCalendar',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('index.html');
}

// IPC Handlers per la gestione dei dati utente su file system
ipcMain.handle('load-user-data', async (event, rawUsername) => {
  try {
    const safeUser = sanitizeUsername(rawUsername);
    if (!safeUser) return null;

    const filePath = path.join(getUserDataDir(), `dati_${safeUser}.json`);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    }
    return null; // Nessun salvataggio precedente trovato per questo utente
  } catch (err) {
    console.error('Errore durante la lettura dei dati utente:', err);
    return null;
  }
});

ipcMain.handle('save-user-data', async (event, { username, data }) => {
  try {
    const safeUser = sanitizeUsername(username);
    if (!safeUser) return false;

    const filePath = path.join(getUserDataDir(), `dati_${safeUser}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Errore durante il salvataggio dei dati utente:', err);
    return false;
  }
});

ipcMain.handle('get-saved-users', async () => {
  try {
    const dir = getUserDataDir();
    const files = fs.readdirSync(dir);
    return files
      .filter(f => f.startsWith('dati_') && f.endsWith('.json'))
      .map(f => f.replace(/^dati_/, '').replace(/\.json$/, ''));
  } catch (err) {
    return [];
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
