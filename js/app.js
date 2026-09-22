/**
 * Main Application Logic for MyCalendar
 * Multi-user Desktop & Web Support with Vue 3 Composition API
 */

const { createApp, ref, computed, watch, onMounted, onUnmounted } = Vue;

const app = createApp({
  setup() {
    // --- Login / Multi-User Screen State ---
    const currentUser = ref('');
    const inputUsername = ref('');
    const isUserLoggedIn = ref(false);
    const isLoadingUserData = ref(false);
    const knownUsers = ref(AppStore.getKnownUsers());

    // --- Preferences & Current Date State ---
    const preferences = ref({ currentView: 'month' });
    const currentView = ref('month'); // 'month' | 'week' | 'day'
    const currentDate = ref(new Date());

    // --- Sidebars / Mobile Drawers ---
    const isLeftDrawerOpen = ref(false);
    const isRightDrawerOpen = ref(false);

    // --- Calendars State ---
    const calendars = ref([]);
    const presetColors = AppStore.PRESET_COLORS;

    // Modals for Calendar Management
    const showCalendarModal = ref(false);
    const isEditingCalendar = ref(false);
    const calendarForm = ref({
      id: '',
      name: '',
      color: presetColors[0].value
    });

    const showDeleteCalendarModal = ref(false);
    const calendarToDelete = ref(null);

    // Active (Visible) Calendar IDs Set
    const activeCalendarIds = computed(() => {
      return new Set(calendars.value.filter(c => c.isVisible).map(c => c.id));
    });

    const activeCalendarsCount = computed(() => activeCalendarIds.value.size);

    // --- Events State ---
    const events = ref([]);

    // --- To-Do List State ---
    const todos = ref([]);
    const newTodoText = ref('');
    const todoFilter = ref('all'); // 'all' | 'active' | 'completed'

    // --- Auto-Save Watcher (Per-User Scoped) ---
    const triggerAutoSave = () => {
      if (!isUserLoggedIn.value || !currentUser.value) return;
      AppStore.saveUserData(currentUser.value, {
        calendars: calendars.value,
        events: events.value,
        todos: todos.value,
        preferences: preferences.value
      });
    };

    watch(calendars, triggerAutoSave, { deep: true });
    watch(events, triggerAutoSave, { deep: true });
    watch(todos, triggerAutoSave, { deep: true });
    watch(preferences, triggerAutoSave, { deep: true });

    // --- User Login / Logout Logic ---
    const loginUser = async (targetUser = null) => {
      const user = (targetUser || inputUsername.value || '').trim();
      if (!user) return;

      isLoadingUserData.value = true;
      try {
        const userData = await AppStore.loadUserData(user);
        currentUser.value = user;
        AppStore.setCurrentUser(user);

        // Popola i dati dell'utente selezionato
        calendars.value = userData.calendars || [];
        events.value = userData.events || [];
        todos.value = userData.todos || [];
        preferences.value = userData.preferences || { currentView: 'month' };
        currentView.value = preferences.value.currentView || 'month';

        isUserLoggedIn.value = true;
        knownUsers.value = AppStore.getKnownUsers();
      } catch (err) {
        console.error('Errore durante il caricamento profilo utente:', err);
      } finally {
        isLoadingUserData.value = false;
      }
    };

    const logoutUser = () => {
      // Salva prima di uscire
      triggerAutoSave();
      currentUser.value = '';
      inputUsername.value = '';
      isUserLoggedIn.value = false;
      calendars.value = [];
      events.value = [];
      todos.value = [];
      knownUsers.value = AppStore.getKnownUsers();
    };

    // Filtered events based on active calendars
    const filteredEvents = computed(() => {
      return events.value.filter(evt => activeCalendarIds.value.has(evt.calendarId));
    });

    // Lookup table for calendar objects by ID
    const calendarMap = computed(() => {
      const map = {};
      calendars.value.forEach(c => {
        map[c.id] = c;
      });
      return map;
    });

    // Group filtered events by date "YYYY-MM-DD"
    const eventsByDate = computed(() => {
      const map = {};
      filteredEvents.value.forEach(evt => {
        if (!map[evt.date]) {
          map[evt.date] = [];
        }
        map[evt.date].push(evt);
      });
      for (const dateKey in map) {
        map[dateKey].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
      }
      return map;
    });

    // Event Modal (Create / Edit)
    const showEventModal = ref(false);
    const isEditingEvent = ref(false);
    const eventForm = ref({
      id: '',
      calendarId: '',
      title: '',
      date: '',
      startTime: '09:00',
      endTime: '10:00',
      notes: ''
    });

    const filteredTodos = computed(() => {
      if (todoFilter.value === 'active') {
        return todos.value.filter(t => !t.completed);
      }
      if (todoFilter.value === 'completed') {
        return todos.value.filter(t => t.completed);
      }
      return todos.value;
    });

    const activeTodosCount = computed(() => {
      return todos.value.filter(t => !t.completed).length;
    });

    // --- Calendar Navigation & Header Titles ---
    const viewTitle = computed(() => {
      const d = currentDate.value;
      if (currentView.value === 'month') {
        return CalendarUtils.formatMonthYear(d);
      } else if (currentView.value === 'week') {
        return CalendarUtils.formatWeekHeader(d);
      } else {
        return CalendarUtils.formatDayHeader(d);
      }
    });

    const goToday = () => {
      currentDate.value = new Date();
    };

    const goPrev = () => {
      const d = new Date(currentDate.value);
      if (currentView.value === 'month') {
        d.setMonth(d.getMonth() - 1);
      } else if (currentView.value === 'week') {
        d.setDate(d.getDate() - 7);
      } else {
        d.setDate(d.getDate() - 1);
      }
      currentDate.value = d;
    };

    const goNext = () => {
      const d = new Date(currentDate.value);
      if (currentView.value === 'month') {
        d.setMonth(d.getMonth() + 1);
      } else if (currentView.value === 'week') {
        d.setDate(d.getDate() + 7);
      } else {
        d.setDate(d.getDate() + 1);
      }
      currentDate.value = d;
    };

    const setView = (v) => {
      currentView.value = v;
      preferences.value.currentView = v;
      triggerAutoSave();
    };

    // Days grid for month view
    const monthDays = computed(() => {
      return CalendarUtils.getMonthDays(
        currentDate.value.getFullYear(),
        currentDate.value.getMonth()
      );
    });

    // Days for week view
    const weekDays = computed(() => {
      return CalendarUtils.getWeekDays(currentDate.value);
    });

    // Hours list (24 hours: 00:00 to 23:00)
    const hoursList = computed(() => {
      const list = [];
      for (let h = 0; h < 24; h++) {
        list.push(`${String(h).padStart(2, '0')}:00`);
      }
      return list;
    });

    // --- Calendar Management Functions ---
    const toggleCalendarVisibility = (id) => {
      const cal = calendars.value.find(c => c.id === id);
      if (cal) {
        cal.isVisible = !cal.isVisible;
      }
    };

    const setAllCalendars = (val) => {
      calendars.value.forEach(c => {
        c.isVisible = val;
      });
    };

    const openAddCalendar = () => {
      isEditingCalendar.value = false;
      calendarForm.value = {
        id: '',
        name: '',
        color: presetColors[Math.floor(Math.random() * presetColors.length)].value
      };
      showCalendarModal.value = true;
    };

    const openEditCalendar = (cal, event) => {
      if (event && event.stopPropagation) event.stopPropagation();
      isEditingCalendar.value = true;
      calendarForm.value = {
        id: cal.id,
        name: cal.name,
        color: cal.color
      };
      showCalendarModal.value = true;
    };

    const saveCalendar = () => {
      if (!calendarForm.value.name.trim()) return;

      if (isEditingCalendar.value) {
        const cal = calendars.value.find(c => c.id === calendarForm.value.id);
        if (cal) {
          cal.name = calendarForm.value.name.trim();
          cal.color = calendarForm.value.color;
        }
      } else {
        calendars.value.push({
          id: AppStore.generateId('cal'),
          name: calendarForm.value.name.trim(),
          color: calendarForm.value.color,
          isVisible: true
        });
      }
      showCalendarModal.value = false;
    };

    const promptDeleteCalendar = (cal, event) => {
      if (event && event.stopPropagation) event.stopPropagation();
      calendarToDelete.value = cal;
      showDeleteCalendarModal.value = true;
    };

    const confirmDeleteCalendar = () => {
      if (!calendarToDelete.value) return;
      const targetId = calendarToDelete.value.id;
      calendars.value = calendars.value.filter(c => c.id !== targetId);
      events.value = events.value.filter(e => e.calendarId !== targetId);
      showDeleteCalendarModal.value = false;
      calendarToDelete.value = null;
    };

    const getCalendarEventCount = (calId) => {
      return events.value.filter(e => e.calendarId === calId).length;
    };

    // --- Event Management Functions ---
    const openNewEventModal = (dateStr = null, timeStr = null) => {
      isEditingEvent.value = false;
      const targetDate = dateStr || CalendarUtils.toDateKey(currentDate.value);
      const start = timeStr || '09:00';
      const startMin = CalendarUtils.timeToMinutes(start);
      const end = CalendarUtils.minutesToTime(startMin + 60);

      const defaultCal = calendars.value.find(c => c.isVisible) || calendars.value[0] || { id: '' };

      eventForm.value = {
        id: '',
        calendarId: defaultCal.id,
        title: '',
        date: targetDate,
        startTime: start,
        endTime: end,
        notes: ''
      };
      showEventModal.value = true;
    };

    const openEditEventModal = (evt, event) => {
      if (event && event.stopPropagation) event.stopPropagation();
      isEditingEvent.value = true;
      eventForm.value = {
        id: evt.id,
        calendarId: evt.calendarId,
        title: evt.title,
        date: evt.date,
        startTime: evt.startTime,
        endTime: evt.endTime,
        notes: evt.notes || ''
      };
      showEventModal.value = true;
    };

    const saveEvent = () => {
      if (!eventForm.value.title.trim()) return;
      if (!eventForm.value.calendarId) {
        if (calendars.value.length > 0) {
          eventForm.value.calendarId = calendars.value[0].id;
        } else {
          return;
        }
      }

      let s = eventForm.value.startTime;
      let e = eventForm.value.endTime;
      if (CalendarUtils.timeToMinutes(e) <= CalendarUtils.timeToMinutes(s)) {
        e = CalendarUtils.minutesToTime(CalendarUtils.timeToMinutes(s) + 60);
        eventForm.value.endTime = e;
      }

      if (isEditingEvent.value) {
        const index = events.value.findIndex(ev => ev.id === eventForm.value.id);
        if (index !== -1) {
          events.value[index] = {
            id: eventForm.value.id,
            calendarId: eventForm.value.calendarId,
            title: eventForm.value.title.trim(),
            date: eventForm.value.date,
            startTime: eventForm.value.startTime,
            endTime: eventForm.value.endTime,
            notes: eventForm.value.notes.trim()
          };
        }
      } else {
        events.value.push({
          id: AppStore.generateId('evt'),
          calendarId: eventForm.value.calendarId,
          title: eventForm.value.title.trim(),
          date: eventForm.value.date,
          startTime: eventForm.value.startTime,
          endTime: eventForm.value.endTime,
          notes: eventForm.value.notes.trim()
        });
      }

      const targetCal = calendars.value.find(c => c.id === eventForm.value.calendarId);
      if (targetCal && !targetCal.isVisible) {
        targetCal.isVisible = true;
      }

      showEventModal.value = false;
    };

    const deleteEvent = (id) => {
      events.value = events.value.filter(e => e.id !== id);
      showEventModal.value = false;
    };

    const getEventStyle = (evt) => {
      const cal = calendarMap.value[evt.calendarId] || { color: '#4f46e5' };
      const startMin = CalendarUtils.timeToMinutes(evt.startTime);
      const endMin = CalendarUtils.timeToMinutes(evt.endTime);
      const duration = Math.max(30, endMin - startMin);

      const top = startMin;
      const height = duration;

      return {
        top: `${top}px`,
        height: `${height}px`,
        backgroundColor: cal.color + '20',
        borderLeft: `4px solid ${cal.color}`,
        color: '#1e293b'
      };
    };

    const dayViewDate = computed(() => currentDate.value);
    const dayViewEvents = computed(() => {
      const key = CalendarUtils.toDateKey(currentDate.value);
      return eventsByDate.value[key] || [];
    });

    // --- To-Do List Functions ---
    const addTodo = () => {
      const text = newTodoText.value.trim();
      if (!text) return;
      todos.value.unshift({
        id: AppStore.generateId('todo'),
        title: text,
        completed: false,
        createdAt: Date.now()
      });
      newTodoText.value = '';
    };

    const toggleTodo = (id) => {
      const t = todos.value.find(item => item.id === id);
      if (t) {
        t.completed = !t.completed;
      }
    };

    const deleteTodo = (id) => {
      todos.value = todos.value.filter(t => t.id !== id);
    };

    const clearCompletedTodos = () => {
      todos.value = todos.value.filter(t => !t.completed);
    };

    const closeDrawers = () => {
      isLeftDrawerOpen.value = false;
      isRightDrawerOpen.value = false;
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showEventModal.value) showEventModal.value = false;
        if (showCalendarModal.value) showCalendarModal.value = false;
        if (showDeleteCalendarModal.value) showDeleteCalendarModal.value = false;
        closeDrawers();
      }
    };

    onMounted(() => {
      window.addEventListener('keydown', handleKeyDown);
      
      // Controlla se Electron ha un elenco di profili salvati su disco
      if (window.electronAPI && typeof window.electronAPI.getSavedUsers === 'function') {
        window.electronAPI.getSavedUsers().then(users => {
          if (Array.isArray(users) && users.length > 0) {
            knownUsers.value = users;
          }
        });
      }
    });

    onUnmounted(() => {
      window.removeEventListener('keydown', handleKeyDown);
    });

    return {
      // User Profile State
      currentUser,
      inputUsername,
      isUserLoggedIn,
      isLoadingUserData,
      knownUsers,
      loginUser,
      logoutUser,

      // App States
      currentView,
      currentDate,
      viewTitle,
      calendars,
      presetColors,
      activeCalendarIds,
      activeCalendarsCount,
      calendarMap,
      events,
      filteredEvents,
      eventsByDate,
      todos,
      newTodoText,
      todoFilter,
      filteredTodos,
      activeTodosCount,
      isLeftDrawerOpen,
      isRightDrawerOpen,

      // Modals
      showCalendarModal,
      isEditingCalendar,
      calendarForm,
      showDeleteCalendarModal,
      calendarToDelete,
      showEventModal,
      isEditingEvent,
      eventForm,

      // Grids
      monthDays,
      weekDays,
      hoursList,
      dayViewDate,
      dayViewEvents,

      // Methods
      goToday,
      goPrev,
      goNext,
      setView,
      toggleCalendarVisibility,
      setAllCalendars,
      openAddCalendar,
      openEditCalendar,
      saveCalendar,
      promptDeleteCalendar,
      confirmDeleteCalendar,
      getCalendarEventCount,
      openNewEventModal,
      openEditEventModal,
      saveEvent,
      deleteEvent,
      getEventStyle,
      addTodo,
      toggleTodo,
      deleteTodo,
      clearCompletedTodos,
      closeDrawers,
      toDateKey: CalendarUtils.toDateKey,
      CalendarUtils
    };
  }
});

app.config.errorHandler = (err, vm, info) => {
  console.error('MyCalendar error caught:', err, info);
};

app.mount('#app');
