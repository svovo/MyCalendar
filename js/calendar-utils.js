/**
 * Calendar Utilities for MyCalendar
 * Handles Italian localization, date formatting, and grid calculations.
 */

const DAYS_IT = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
const DAYS_SHORT_IT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

const MONTHS_IT = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

/**
 * Format date as YYYY-MM-DD
 */
function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parse YYYY-MM-DD into a Date object at midnight local time
 */
function parseDateKey(str) {
  if (!str) return new Date();
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Checks if two dates are the same calendar day
 */
function isSameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

/**
 * Check if a date string is today
 */
function isTodayString(dateStr) {
  const today = toDateKey(new Date());
  return dateStr === today;
}

/**
 * Convert time string "HH:MM" to minutes from 00:00
 */
function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Convert minutes from 00:00 to "HH:MM"
 */
function minutesToTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Get Monday for a given date
 */
function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  // In JS: 0 is Sunday, 1 is Monday ... 6 is Saturday
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}

/**
 * Generate 7 days for the week view starting Monday
 */
function getWeekDays(baseDate) {
  const monday = getMonday(baseDate);
  const days = [];
  const todayKey = toDateKey(new Date());

  for (let i = 0; i < 7; i++) {
    const current = new Date(monday);
    current.setDate(monday.getDate() + i);
    const dateKey = toDateKey(current);

    days.push({
      date: current,
      dateKey,
      dayNumber: current.getDate(),
      dayName: DAYS_SHORT_IT[i],
      fullDayName: DAYS_IT[i],
      headerLabel: `${DAYS_IT[i]} ${current.getDate()}`,
      isToday: dateKey === todayKey
    });
  }
  return days;
}

/**
 * Generate 35-42 cells for the month view (Monday-first)
 */
function getMonthDays(year, month) {
  const todayKey = toDateKey(new Date());
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  // JS getDay(): 0 is Sunday, 1 is Monday ... 6 is Saturday
  // Convert so Monday is 0, Sunday is 6
  let firstDayIndex = firstDayOfMonth.getDay() - 1;
  if (firstDayIndex === -1) firstDayIndex = 6;

  const days = [];

  // Previous month padding
  const prevMonthLastDate = new Date(year, month, 0).getDate();
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthLastDate - i);
    const dateKey = toDateKey(d);
    const dayOfWeek = (d.getDay() + 6) % 7;
    days.push({
      date: d,
      dateKey,
      dayNumber: d.getDate(),
      dayName: DAYS_SHORT_IT[dayOfWeek],
      fullDayName: DAYS_IT[dayOfWeek],
      headerLabel: `${DAYS_IT[dayOfWeek]} ${d.getDate()}`,
      isCurrentMonth: false,
      isToday: dateKey === todayKey
    });
  }

  // Current month days
  for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
    const d = new Date(year, month, i);
    const dateKey = toDateKey(d);
    const dayOfWeek = (d.getDay() + 6) % 7;
    days.push({
      date: d,
      dateKey,
      dayNumber: i,
      dayName: DAYS_SHORT_IT[dayOfWeek],
      fullDayName: DAYS_IT[dayOfWeek],
      headerLabel: `${DAYS_IT[dayOfWeek]} ${i}`,
      isCurrentMonth: true,
      isToday: dateKey === todayKey
    });
  }

  // Next month padding to fill a complete 35 or 42 grid
  const remainingCells = (7 - (days.length % 7)) % 7;
  for (let i = 1; i <= remainingCells; i++) {
    const d = new Date(year, month + 1, i);
    const dateKey = toDateKey(d);
    const dayOfWeek = (d.getDay() + 6) % 7;
    days.push({
      date: d,
      dateKey,
      dayNumber: i,
      dayName: DAYS_SHORT_IT[dayOfWeek],
      fullDayName: DAYS_IT[dayOfWeek],
      headerLabel: `${DAYS_IT[dayOfWeek]} ${i}`,
      isCurrentMonth: false,
      isToday: dateKey === todayKey
    });
  }

  return days;
}

/**
 * Format Month & Year for view header (e.g. "Settembre 2026")
 */
function formatMonthYear(date) {
  return `${MONTHS_IT[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Format Week range for view header (e.g. "15 - 21 Settembre 2026")
 */
function formatWeekHeader(baseDate) {
  const weekDays = getWeekDays(baseDate);
  const start = weekDays[0].date;
  const end = weekDays[6].date;

  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()} - ${end.getDate()} ${MONTHS_IT[start.getMonth()]} ${start.getFullYear()}`;
  } else if (start.getFullYear() === end.getFullYear()) {
    return `${start.getDate()} ${MONTHS_IT[start.getMonth()]} - ${end.getDate()} ${MONTHS_IT[end.getMonth()]} ${start.getFullYear()}`;
  } else {
    return `${start.getDate()} ${MONTHS_IT[start.getMonth()]} ${start.getFullYear()} - ${end.getDate()} ${MONTHS_IT[end.getMonth()]} ${end.getFullYear()}`;
  }
}

/**
 * Format Day Header (e.g. "Lunedì 22 Settembre 2026")
 */
function formatDayHeader(date) {
  const dayName = DAYS_IT[(date.getDay() + 6) % 7];
  return `${dayName} ${date.getDate()} ${MONTHS_IT[date.getMonth()]} ${date.getFullYear()}`;
}

window.CalendarUtils = {
  DAYS_IT,
  DAYS_SHORT_IT,
  MONTHS_IT,
  toDateKey,
  parseDateKey,
  isSameDay,
  isTodayString,
  timeToMinutes,
  minutesToTime,
  getMonday,
  getWeekDays,
  getMonthDays,
  formatMonthYear,
  formatWeekHeader,
  formatDayHeader
};
