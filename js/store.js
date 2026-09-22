/**
 * Multi-User Storage & State Persistence for MyCalendar
 * Supports both Electron FS IPC and browser localStorage fallback with per-user scoping.
 */

const PRESET_COLORS = [
  { name: 'Blu Oceano', value: '#3b82f6' },
  { name: 'Smeraldo', value: '#10b981' },
  { name: 'Indaco', value: '#6366f1' },
  { name: 'Viola', value: '#8b5cf6' },
  { name: 'Rosa Fucsia', value: '#ec4899' },
  { name: 'Arancione', value: '#f97316' },
  { name: 'Rosso Corallo', value: '#ef4444' },
  { name: 'Ambra', value: '#f59e0b' },
  { name: 'Verde Lime', value: '#84cc16' },
  { name: 'Ciano', value: '#06b6d4' }
];

function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function sanitizeUsername(username) {
  return (username || '').trim().toLowerCase().replace(/[^a-z0-9_-]/gi, '_');
}

function getDefaultUserData(username = 'Utente') {
  return {
    username: username,
    calendars: [
      { id: 'cal_work', name: 'Lavoro', color: '#3b82f6', isVisible: true },
      { id: 'cal_personal', name: 'Personale', color: '#10b981', isVisible: true },
      { id: 'cal_study', name: 'Studio & Corsi', color: '#8b5cf6', isVisible: true },
      { id: 'cal_sport', name: 'Sport & Salute', color: '#f97316', isVisible: true }
    ],
    events: [], // Nuovo utente inizia pulito senza impegni altrui
    todos: [],   // Nuovo utente inizia con to-do vuota
    preferences: { currentView: 'month' }
  };
}

const Store = {
  currentUser: null,

  setCurrentUser(username) {
    this.currentUser = (username || '').trim();
    if (this.currentUser) {
      localStorage.setItem('mycalendar_last_active_user', this.currentUser);
    }
  },

  getCurrentUser() {
    return this.currentUser;
  },

  getLastActiveUser() {
    return localStorage.getItem('mycalendar_last_active_user') || '';
  },

  // Carica i dati dell'utente (prima da Electron FS se disponibile, altrimenti da localStorage)
  async loadUserData(username) {
    const rawUser = (username || '').trim();
    if (!rawUser) return null;
    const safeKey = sanitizeUsername(rawUser);

    // 1. Se siamo dentro Electron nativo
    if (window.electronAPI && typeof window.electronAPI.loadUserData === 'function') {
      try {
        const fileData = await window.electronAPI.loadUserData(rawUser);
        if (fileData) {
          return fileData;
        }
      } catch (err) {
        console.warn('Electron loadUserData fallback a storage:', err);
      }
    }

    // 2. Fallback su localStorage (chiave univoca per utente: mycalendar_user_<safeKey>)
    try {
      const stored = localStorage.getItem(`mycalendar_user_${safeKey}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Errore lettura localStorage:', e);
    }

    // Se l'utente non ha mai salvato dati, restituisce ambiente iniziale pulito per lui
    return getDefaultUserData(rawUser);
  },

  // Salva i dati dell'utente (sia su file JSON tramite Electron che su localStorage)
  async saveUserData(username, data) {
    const rawUser = (username || this.currentUser || '').trim();
    if (!rawUser) return false;
    const safeKey = sanitizeUsername(rawUser);

    const payload = {
      username: rawUser,
      calendars: data.calendars || [],
      events: data.events || [],
      todos: data.todos || [],
      preferences: data.preferences || { currentView: 'month' },
      updatedAt: Date.now()
    };

    // 1. Salvataggio su file JSON tramite Electron FS
    if (window.electronAPI && typeof window.electronAPI.saveUserData === 'function') {
      try {
        await window.electronAPI.saveUserData(rawUser, payload);
      } catch (err) {
        console.warn('Errore salvataggio Electron file:', err);
      }
    }

    // 2. Salvataggio anche in localStorage per consistenza locale immediata
    try {
      localStorage.setItem(`mycalendar_user_${safeKey}`, JSON.stringify(payload));
      
      // Tiene traccia dell'elenco utenti salvati
      const usersList = this.getKnownUsers();
      if (!usersList.includes(rawUser)) {
        usersList.push(rawUser);
        localStorage.setItem('mycalendar_known_users', JSON.stringify(usersList));
      }
      return true;
    } catch (e) {
      console.error('Errore salvataggio localStorage:', e);
      return false;
    }
  },

  getKnownUsers() {
    try {
      const list = localStorage.getItem('mycalendar_known_users');
      return list ? JSON.parse(list) : [];
    } catch (e) {
      return [];
    }
  },

  generateId,
  PRESET_COLORS,
  getDefaultUserData
};

window.AppStore = Store;
