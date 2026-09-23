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

    // --- Events State & Copy/Repeat Mode ---
    const events = ref([]);
    const isCopyMode = ref(false);
    const selectedEventIds = ref([]);
    const showRepeatModal = ref(false);
    const repeatWeeks = ref(4);
    const toastMessage = ref('');
    let toastTimer = null;

    const showToast = (msg) => {
      toastMessage.value = msg;
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        toastMessage.value = '';
      }, 3500);
    };

    // --- To-Do List & Priority State ---
    const TODO_PRIORITIES = {
      urgent: { key: 'urgent', label: 'Urgente', color: '#ef4444', flag: '🚩', bg: 'bg-rose-50 text-rose-700 border-rose-200 ring-rose-400' },
      important: { key: 'important', label: 'Importante', color: '#f59e0b', flag: '🟡', bg: 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-400' },
      normal: { key: 'normal', label: 'Non urgente', color: '#3b82f6', flag: '🔵', bg: 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-400' },
      low: { key: 'low', label: 'Da fare quando si riesce', color: '#10b981', flag: '🟢', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-400' }
    };
    const todos = ref([]);
    const newTodoText = ref('');
    const newTodoPriority = ref('normal');
    const todoFilter = ref('all'); // 'all' | 'active' | 'completed'
    const todoPriorityFilter = ref('all'); // 'all' | 'urgent' | 'important' | 'normal' | 'low'
    const editingTodoId = ref(null);
    const editingTodoText = ref('');

    // --- Drag & Drop Time Blocking State ---
    const draggedTodo = ref(null);
    const dragOverSlotId = ref('');

    // --- Statistiche Produttività State ---
    const showProductivityModal = ref(false);

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
      return todos.value.filter(t => {
        const isDone = Boolean(t.completed || t.isCompleted || t.status === 'done');
        // Soft-delete / completamento: nasconde in automatico dalla vista principale (a meno che non sia attivo il tab 'completed')
        if (todoFilter.value !== 'completed' && isDone) return false;
        if (todoFilter.value === 'completed' && !isDone) return false;

        // Filtro priorità (tutte / urgent / important / normal / low)
        if (todoPriorityFilter.value !== 'all') {
          const p = t.priority || 'normal';
          if (p !== todoPriorityFilter.value) return false;
        }
        return true;
      });
    });

    const activeTodosCount = computed(() => {
      return todos.value.filter(t => !t.completed && !t.isCompleted && t.status !== 'done').length;
    });

    const priorityCounts = computed(() => {
      const counts = { urgent: 0, important: 0, normal: 0, low: 0, total: 0 };
      todos.value.forEach(t => {
        const isDone = Boolean(t.completed || t.isCompleted || t.status === 'done');
        if (!isDone) {
          const p = t.priority || 'normal';
          if (counts[p] !== undefined) counts[p]++;
          counts.total++;
        }
      });
      return counts;
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

    // --- Funzioni di Selezione e Ripetizione / Duplicazione Eventi ---
    const toggleCopyMode = () => {
      isCopyMode.value = !isCopyMode.value;
      if (!isCopyMode.value) {
        selectedEventIds.value = [];
      }
    };

    const cancelCopyMode = () => {
      isCopyMode.value = false;
      selectedEventIds.value = [];
      showRepeatModal.value = false;
    };

    const toggleEventSelection = (id) => {
      const idx = selectedEventIds.value.indexOf(id);
      if (idx > -1) {
        selectedEventIds.value.splice(idx, 1);
      } else {
        selectedEventIds.value.push(id);
      }
    };

    const handleEventClick = (evt, event) => {
      if (event && event.stopPropagation) event.stopPropagation();
      if (isCopyMode.value) {
        toggleEventSelection(evt.id);
      } else {
        openEditEventModal(evt, event);
      }
    };

    const selectAllVisibleEvents = () => {
      selectedEventIds.value = filteredEvents.value.map(e => e.id);
    };

    const clearEventSelection = () => {
      selectedEventIds.value = [];
    };

    const selectedEvents = computed(() => {
      const set = new Set(selectedEventIds.value);
      return events.value.filter(e => set.has(e.id));
    });

    const openRepeatModal = () => {
      if (selectedEventIds.value.length === 0) return;
      repeatWeeks.value = 4;
      showRepeatModal.value = true;
    };

    const executeDuplicateEvents = () => {
      let weeks = parseInt(repeatWeeks.value, 10);
      if (isNaN(weeks) || weeks < 1) weeks = 1;
      if (weeks > 52) weeks = 52;

      const targetEvents = selectedEvents.value;
      if (targetEvents.length === 0) return;

      const newEvents = [];

      targetEvents.forEach(orig => {
        for (let w = 1; w <= weeks; w++) {
          // Aggiunge esattamente w * 7 giorni alla data originaria
          const [y, m, d] = orig.date.split('-').map(Number);
          const targetDate = new Date(y, m - 1, d);
          targetDate.setDate(targetDate.getDate() + (w * 7));
          const newDateKey = CalendarUtils.toDateKey(targetDate);

          newEvents.push({
            id: AppStore.generateId('evt'),
            calendarId: orig.calendarId,
            title: orig.title,
            date: newDateKey,
            startTime: orig.startTime,
            endTime: orig.endTime,
            notes: orig.notes || ''
          });
        }
      });

      // Integra i nuovi impegni nell'array degli eventi
      events.value.push(...newEvents);

      // Salva immediatamente
      triggerAutoSave();

      const totalCreated = newEvents.length;
      showRepeatModal.value = false;
      isCopyMode.value = false;
      selectedEventIds.value = [];

      showToast(`Duplicazione completata! Creati ${totalCreated} nuovi impegni per ${weeks} ${weeks === 1 ? 'settimana' : 'settimane'}.`);
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
        isCompleted: false,
        status: 'active',
        priority: newTodoPriority.value || 'normal',
        createdAt: Date.now(),
        completedAt: null
      });
      newTodoText.value = '';
    };

    const toggleTodo = (id) => {
      const t = todos.value.find(item => item.id === id);
      if (t) {
        const willBeDone = !(t.completed || t.isCompleted || t.status === 'done');
        t.completed = willBeDone;
        t.isCompleted = willBeDone;
        t.status = willBeDone ? 'done' : 'active';
        t.completedAt = willBeDone ? Date.now() : null;
      }
    };

    const setTodoPriority = (id, priority) => {
      const t = todos.value.find(item => item.id === id);
      if (t) {
        t.priority = priority;
      }
    };

    const cycleTodoPriority = (todo) => {
      const order = ['normal', 'important', 'urgent', 'low'];
      const current = todo.priority || 'normal';
      const nextIdx = (order.indexOf(current) + 1) % order.length;
      todo.priority = order[nextIdx];
    };

    // Soft delete: invece di rimuovere fisicamente l'elemento, aggiorna lo stato a completato/done
    const deleteTodo = (id) => {
      const t = todos.value.find(item => item.id === id);
      if (t) {
        t.completed = true;
        t.isCompleted = true;
        t.status = 'done';
        t.completedAt = t.completedAt || Date.now();
      }
    };

    const clearCompletedTodos = () => {
      todos.value.forEach(t => {
        if (t.completed || t.isCompleted || t.status === 'done') {
          t.completed = true;
          t.isCompleted = true;
          t.status = 'done';
          t.completedAt = t.completedAt || Date.now();
        }
      });
    };

    // --- Modifica del testo del Task ---
    const startEditTodo = (todo) => {
      editingTodoId.value = todo.id;
      editingTodoText.value = todo.title;
    };

    const saveEditTodo = (id) => {
      const t = todos.value.find(item => item.id === id);
      const text = editingTodoText.value.trim();
      if (t && text) {
        t.title = text;
      }
      cancelEditTodo();
    };

    const cancelEditTodo = () => {
      editingTodoId.value = null;
      editingTodoText.value = '';
    };

    // --- Drag & Drop per Time Blocking sul Calendario ---
    const onTaskDragStart = (todo, event) => {
      draggedTodo.value = todo;
      if (event && event.dataTransfer) {
        event.dataTransfer.setData('text/plain', todo.id);
        event.dataTransfer.effectAllowed = 'move';
      }
    };

    const onTaskDragEnd = () => {
      draggedTodo.value = null;
      dragOverSlotId.value = '';
    };

    const onSlotDragOver = (slotId, event) => {
      event.preventDefault();
      if (event && event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
      }
      dragOverSlotId.value = slotId;
    };

    const onSlotDragLeave = (slotId) => {
      if (dragOverSlotId.value === slotId) {
        dragOverSlotId.value = '';
      }
    };

    const onSlotDrop = (dateStr, timeStr, event) => {
      event.preventDefault();
      dragOverSlotId.value = '';

      let taskId = '';
      if (event && event.dataTransfer) {
        taskId = event.dataTransfer.getData('text/plain');
      }
      const todo = draggedTodo.value || todos.value.find(t => t.id === taskId);
      if (!todo) return;

      const start = timeStr || '09:00';
      const startMin = CalendarUtils.timeToMinutes(start);
      const end = CalendarUtils.minutesToTime(startMin + 60);

      // Assegna al primo calendario visibile o disponibile
      const targetCal = calendars.value.find(c => c.isVisible) || calendars.value[0];
      const calendarId = targetCal ? targetCal.id : '';

      const priorityInfo = TODO_PRIORITIES[todo.priority || 'normal'] || TODO_PRIORITIES.normal;

      // Crea l'impegno sul calendario
      events.value.push({
        id: AppStore.generateId('evt'),
        calendarId: calendarId,
        title: todo.title,
        date: dateStr,
        startTime: start,
        endTime: end,
        notes: `Time blocking da To-Do [Priorità: ${priorityInfo.label}]`
      });

      // Rimuove il task dalla To-Do list generica
      todos.value = todos.value.filter(t => t.id !== todo.id);

      triggerAutoSave();
      draggedTodo.value = null;

      showToast(`Attività "${todo.title}" programmata nel calendario per ${dateStr} alle ${start}!`);
    };

    // --- Componente Statistiche Produttività ---
    const productivityStats = computed(() => {
      const now = Date.now();
      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

      // Task completati negli ultimi 7 giorni
      const completedLast7Days = todos.value.filter(t => {
        if (!t.completed) return false;
        const time = t.completedAt || t.createdAt || 0;
        return time >= sevenDaysAgo;
      });

      const totalCompletedWeek = completedLast7Days.length;

      // Genera 7 barre giornaliere per gli ultimi 7 giorni
      const dailyBars = [];
      const dayCounts = {};

      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateKey = CalendarUtils.toDateKey(d);
        const dayIdx = (d.getDay() + 6) % 7;
        const dayShort = CalendarUtils.DAYS_SHORT_IT[dayIdx];
        const dayFull = CalendarUtils.DAYS_IT[dayIdx];

        const count = completedLast7Days.filter(t => {
          const compTime = t.completedAt || t.createdAt;
          const compDateKey = CalendarUtils.toDateKey(new Date(compTime));
          return compDateKey === dateKey;
        }).length;

        dayCounts[dayFull] = (dayCounts[dayFull] || 0) + count;

        dailyBars.push({
          dateKey,
          dateFormatted: `${d.getDate()} ${CalendarUtils.MONTHS_IT[d.getMonth()].slice(0, 3)}`,
          dayLabel: dayShort,
          dayFull,
          count,
          isToday: i === 0
        });
      }

      // Individua giorno di picco di produttività
      let peakDayName = 'Nessuno';
      let peakDayCount = 0;
      for (const [dayName, count] of Object.entries(dayCounts)) {
        if (count > peakDayCount) {
          peakDayCount = count;
          peakDayName = dayName;
        }
      }

      const maxCount = Math.max(...dailyBars.map(b => b.count), 1);
      dailyBars.forEach(b => {
        b.heightPercent = b.count > 0 ? Math.max(16, Math.round((b.count / maxCount) * 100)) : 8;
        b.isPeak = b.count === peakDayCount && peakDayCount > 0;
      });

      const recentCompletedTasks = [...completedLast7Days].sort((a, b) => {
        return (b.completedAt || b.createdAt) - (a.completedAt || a.createdAt);
      });

      return {
        totalCompletedWeek,
        peakDayName,
        peakDayCount,
        dailyBars,
        recentCompletedTasks
      };
    });

    const closeDrawers = () => {
      isLeftDrawerOpen.value = false;
      isRightDrawerOpen.value = false;
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showProductivityModal.value) {
          showProductivityModal.value = false;
          return;
        }
        if (showRepeatModal.value) {
          showRepeatModal.value = false;
          return;
        }
        if (isCopyMode.value && selectedEventIds.value.length > 0) {
          selectedEventIds.value = [];
          return;
        }
        if (isCopyMode.value) {
          isCopyMode.value = false;
          return;
        }
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

      // Copy / Repeat Events Feature
      isCopyMode,
      selectedEventIds,
      showRepeatModal,
      repeatWeeks,
      toastMessage,
      selectedEvents,
      toggleCopyMode,
      cancelCopyMode,
      toggleEventSelection,
      handleEventClick,
      selectAllVisibleEvents,
      clearEventSelection,
      openRepeatModal,
      executeDuplicateEvents,

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
      CalendarUtils,

      // Priorities & To-Do Filters
      TODO_PRIORITIES,
      newTodoPriority,
      todoPriorityFilter,
      priorityCounts,
      setTodoPriority,
      cycleTodoPriority,
      editingTodoId,
      editingTodoText,
      startEditTodo,
      saveEditTodo,
      cancelEditTodo,

      // Drag and Drop Time Blocking
      draggedTodo,
      dragOverSlotId,
      onTaskDragStart,
      onTaskDragEnd,
      onSlotDragOver,
      onSlotDragLeave,
      onSlotDrop,

      // Productivity Stats
      showProductivityModal,
      productivityStats
    };
  }
});

app.config.errorHandler = (err, vm, info) => {
  console.error('MyCalendar error caught:', err, info);
};

app.mount('#app');
