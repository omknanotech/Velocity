/*
  Velocity productivity tracker web app.
  This file manages the app state, localStorage, rendering, charts and interactions.
*/

const STORAGE_KEY = 'velocity-productivity-state-v1';
const DEFAULT_VIEW = 'overview';

const appState = {
  view: DEFAULT_VIEW,
  searchTerm: '',
  taskFilter: 'all',
  reminderIndex: 0,
  insightIndex: 0,
  leaderboardPeriod: 'weekly',
  calendarWeekOffset: 0,
  calendarSelectedDate: isoDateOffset(0),
  timer: {
    active: false,
    running: false,
    startedAt: null,
    elapsedMs: 0,
    taskId: null,
    projectId: null,
    sessionId: null,
    mode: 'focus'
  }
};

const state = loadState();
state.progress.xp = Number.isFinite(Number(state.progress.xp)) ? Math.max(0, Number(state.progress.xp)) : 0;
state.progress.streak = Number.isFinite(Number(state.progress.streak)) ? Math.max(0, Number(state.progress.streak)) : 0;
state.users.forEach((user) => {
  user.dailyScore = Number.isFinite(Number(user.dailyScore)) ? Number(user.dailyScore) : Math.round(user.score * 0.02);
  user.weeklyScore = Number.isFinite(Number(user.weeklyScore)) ? Number(user.weeklyScore) : Math.round(user.score * 0.13);
});
if (state.habitDate !== isoDateOffset(0)) {
  state.habits.forEach((habit) => { habit.completed = false; });
  state.habitDate = isoDateOffset(0);
}
appState.view = state.settings?.view || DEFAULT_VIEW;
appState.taskFilter = state.settings?.taskFilter || 'all';
appState.leaderboardPeriod = state.settings?.leaderboardPeriod || 'weekly';
appState.reminderIndex = state.settings?.reminderIndex || 0;
appState.insightIndex = state.settings?.insightIndex || 0;
appState.timer = { ...appState.timer, ...(state.settings?.timer || {}) };
appState.timer.elapsedMs = Number.isFinite(appState.timer.elapsedMs) && appState.timer.elapsedMs > 0 ? appState.timer.elapsedMs : 0;
appState.timer.active = Boolean(appState.timer.active || appState.timer.running);
appState.timer.running = Boolean(appState.timer.running && Number.isFinite(appState.timer.startedAt));
if (!appState.timer.running) appState.timer.startedAt = null;
appState.timer.sessionId ||= null;

const elements = {
  navItems: document.querySelectorAll('.nav-item'),
  pages: document.querySelectorAll('.page'),
  greetingText: document.getElementById('greetingText'),
  statCards: document.getElementById('statCards'),
  trendBars: document.getElementById('trendBars'),
  balanceDonut: document.getElementById('balanceDonut'),
  taskList: document.getElementById('taskList'),
  taskForm: document.getElementById('taskForm'),
  taskInput: document.getElementById('taskInput'),
  taskFilters: document.getElementById('taskFilters'),
  reminderDetails: document.getElementById('reminderDetails'),
  aiInsight: document.getElementById('aiInsight'),
  globalSearch: document.getElementById('globalSearch'),
  exportDataBtn: document.getElementById('exportDataBtn'),
  importDataBtn: document.getElementById('importDataBtn'),
  importDataInput: document.getElementById('importDataInput'),
  resetDemoBtn: document.getElementById('resetDemoBtn'),
  openProjectModal: document.getElementById('openProjectModal'),
  projectModal: document.getElementById('projectModal'),
  projectForm: document.getElementById('projectForm'),
  projectNameInput: document.getElementById('projectNameInput'),
  projectColorInput: document.getElementById('projectColorInput'),
  closeProjectModal: document.getElementById('closeProjectModal'),
  timerDisplay: document.getElementById('timerDisplay'),
  timerGauge: document.getElementById('timerGauge'),
  timerPauseBtn: document.getElementById('timerPauseBtn'),
  timerStopBtn: document.getElementById('timerStopBtn'),
  timerStartBtn: document.getElementById('timerStartBtn'),
  timerResumeBtn: document.getElementById('timerResumeBtn'),
  timerStopActionBtn: document.getElementById('timerStopActionBtn'),
  activeTaskSelect: document.getElementById('activeTaskSelect'),
  activeProjectSelect: document.getElementById('activeProjectSelect'),
  leaderboardTableBody: document.getElementById('leaderboardTableBody'),
  podium: document.getElementById('podium'),
  heatmapChart: document.getElementById('heatmapChart'),
  taskActivityChart: document.getElementById('taskActivityChart'),
  radarChart: document.getElementById('radarChart'),
  productivityBars: document.getElementById('productivityBars'),
  teamGauge: document.getElementById('teamGauge'),
  projectGrid: document.getElementById('projectGrid'),
  calendarDays: document.getElementById('calendarDays'),
  calendarWeekLabel: document.getElementById('calendarWeekLabel'),
  calendarSelectedLabel: document.getElementById('calendarSelectedLabel'),
  calendarEventCount: document.getElementById('calendarEventCount'),
  calendarEvents: document.getElementById('calendarEvents'),
  dailyFocusRingProgress: document.getElementById('dailyFocusRingProgress'),
  dailyFocusPercent: document.getElementById('dailyFocusPercent'),
  todayFocusTime: document.getElementById('todayFocusTime'),
  todayFocusTarget: document.getElementById('todayFocusTarget'),
  todayTaskCount: document.getElementById('todayTaskCount'),
  todayHabitCount: document.getElementById('todayHabitCount'),
  todayDateLabel: document.getElementById('todayDateLabel'),
  habitStreakValue: document.getElementById('habitStreakValue'),
  habitLevelLabel: document.getElementById('habitLevelLabel'),
  habitXpLabel: document.getElementById('habitXpLabel'),
  habitXpProgress: document.getElementById('habitXpProgress'),
  habitList: document.getElementById('habitList')
};

function seedDemoData() {
  const today = new Date();
  const month = today.getMonth();
  const year = today.getFullYear();

  const projects = [
    { id: 'p1', name: 'Product Launch', color: '#7a6bf2' },
    { id: 'p2', name: 'Brand Refresh', color: '#ff9f43' },
    { id: 'p3', name: 'Inbox Zero', color: '#7fe4b8' }
  ];

  const tasks = [
    { id: 't1', title: 'Finalize onboarding flow', projectId: 'p1', priority: 'high', dueDate: isoDateOffset(0), tag: 'Work', completed: false },
    { id: 't2', title: 'Team sync notes', projectId: 'p2', priority: 'medium', dueDate: isoDateOffset(1), tag: 'Work', completed: true },
    { id: 't3', title: 'Exercise and reset', projectId: 'p3', priority: 'low', dueDate: isoDateOffset(2), tag: 'Life', completed: false },
    { id: 't4', title: 'Campaign review', projectId: 'p1', priority: 'high', dueDate: isoDateOffset(-1), tag: 'Work', completed: true },
    { id: 't5', title: 'Reading 20 min', projectId: 'p3', priority: 'low', dueDate: isoDateOffset(3), tag: 'Life', completed: false }
  ];

  const sessions = [
    { id: 's1', taskId: 't1', projectId: 'p1', category: 'Work', minutes: 120, date: isoDateOffset(-6) },
    { id: 's2', taskId: 't2', projectId: 'p2', category: 'Work', minutes: 90, date: isoDateOffset(-5) },
    { id: 's3', taskId: 't3', projectId: 'p3', category: 'Life', minutes: 40, date: isoDateOffset(-4) },
    { id: 's4', taskId: 't4', projectId: 'p1', category: 'Work', minutes: 150, date: isoDateOffset(-3) },
    { id: 's5', taskId: 't5', projectId: 'p3', category: 'Life', minutes: 30, date: isoDateOffset(-2) },
    { id: 's6', taskId: 't1', projectId: 'p1', category: 'Work', minutes: 100, date: isoDateOffset(-1) },
    { id: 's7', taskId: 't1', projectId: 'p1', category: 'Work', minutes: 160, date: isoDateOffset(0) },
    { id: 's8', taskId: 't2', projectId: 'p2', category: 'Work', minutes: 70, date: isoDateOffset(0) },
    { id: 's9', taskId: 't5', projectId: 'p3', category: 'Life', minutes: 25, date: isoDateOffset(0) }
  ];

  const reminders = [
    { id: 'r1', title: "Today's Meeting", description: 'Review campaign results with team.', tag: 'Work', time: '14:00', projectId: 'p1', dueDate: isoDateOffset(0), icon: 'Meet' },
    { id: 'r2', title: 'Design Review', description: 'Check the latest concepts with product.', tag: 'Work', time: '16:30', projectId: 'p2', dueDate: isoDateOffset(1), icon: 'Meet' },
    { id: 'r3', title: 'Wellness Block', description: 'Short walk and focus reset break.', tag: 'Life', time: '18:00', projectId: 'p3', dueDate: isoDateOffset(2), icon: 'Life' }
  ];

  const insights = [
    { id: 'i1', text: "On Wednesday you're overloaded. Should we move 2 tasks to Thursday?", type: 'load' },
    { id: 'i2', text: 'You lost momentum after Friday. A 20-minute reset would help recover your streak.', type: 'streak' },
    { id: 'i3', text: 'Your focus time dipped below target. Consider shortening one meeting block.', type: 'focus' }
  ];

  const users = [
    { id: 'u1', name: 'Ava Brooks', score: 1550, dailyScore: 33, weeklyScore: 210, lastActivity: 'about 3 hours ago', emoji: '🚀', avatar: 'A', currentUser: false },
    { id: 'u2', name: 'Milo Hart', score: 1480, dailyScore: 25, weeklyScore: 178, lastActivity: 'about 1 day ago', emoji: '🏄', avatar: 'M', currentUser: false },
    { id: 'u3', name: 'Alex Carter', score: 1420, dailyScore: 42, weeklyScore: 190, lastActivity: 'about 2 hours ago', emoji: '🦊', avatar: 'A', currentUser: true },
    { id: 'u4', name: 'Nia Shah', score: 1360, dailyScore: 18, weeklyScore: 162, lastActivity: 'about 5 hours ago', emoji: '✨', avatar: 'N', currentUser: false }
  ];

  const habits = [
    { id: 'h1', title: 'Plan the day', completed: false },
    { id: 'h2', title: 'Move for 20 minutes', completed: false },
    { id: 'h3', title: 'Read for 10 minutes', completed: false }
  ];
  const progress = { xp: 1420, streak: 5, lastActiveDate: isoDateOffset(-1) };
  const activityHeatmap = [];
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  startDate.setDate(startDate.getDate() - 83);
  for (let i = 0; i < 84; i += 1) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const value = (i * 3 + 1) % 5;
    activityHeatmap.push({ date: isoDateOffset(i - 83), count: value, level: value === 0 ? 0 : value });
  }

  return {
    projects,
    tasks,
    sessions,
    reminders,
    insights,
    users,
    habits,
    progress,
    habitDate: isoDateOffset(0),
    activityHeatmap,
    settings: {
      selectedView: DEFAULT_VIEW,
      taskFilter: 'all',
      reminderIndex: 0,
      insightIndex: 0,
      timer: { ...appState.timer }
    }
  };
}

function saveState() {
  const payload = {
    projects: state.projects,
    tasks: state.tasks,
    sessions: state.sessions,
    reminders: state.reminders,
    insights: state.insights,
    users: state.users,
    habits: state.habits,
    progress: state.progress,
    habitDate: state.habitDate,
    activityHeatmap: state.activityHeatmap,
    settings: {
      view: appState.view,
      taskFilter: appState.taskFilter,
      leaderboardPeriod: appState.leaderboardPeriod,
      reminderIndex: appState.reminderIndex,
      insightIndex: appState.insightIndex,
      timer: appState.timer
    }
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return seedDemoData();
    const fallback = seedDemoData();

    return {
      projects: saved.projects || fallback.projects,
      tasks: saved.tasks || fallback.tasks,
      sessions: saved.sessions || fallback.sessions,
      reminders: saved.reminders || fallback.reminders,
      insights: saved.insights || fallback.insights,
      users: saved.users || fallback.users,
      habits: Array.isArray(saved.habits) ? saved.habits : fallback.habits,
      progress: { ...fallback.progress, ...(saved.progress || {}) },
      habitDate: saved.habitDate || fallback.habitDate,
      activityHeatmap: saved.activityHeatmap || fallback.activityHeatmap,
      settings: saved.settings || { ...fallback.settings }
    };
  } catch (error) {
    console.warn('Unable to load saved state, using demo data.', error);
    return seedDemoData();
  }
}

function resetDemoData() {
  const demo = seedDemoData();
  Object.assign(state, demo);
  appState.view = DEFAULT_VIEW;
  appState.taskFilter = 'all';
  appState.reminderIndex = 0;
  appState.insightIndex = 0;
  appState.timer = { active: false, running: false, startedAt: null, elapsedMs: 0, taskId: null, projectId: null, mode: 'focus' };
  saveState();
  renderAll();
}

function isoDateOffset(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function getHourString(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  return `${hours}h ${minutes}m`;
}

function formatTime(ms) {
  const totalSeconds = Math.floor(Math.max(0, Number(ms) || 0) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const clockMinutes = String(minutes).padStart(2, '0');
  const clockSeconds = String(seconds).padStart(2, '0');
  return hours ? `${hours}:${clockMinutes}:${clockSeconds}` : `${clockMinutes}:${clockSeconds}`;
}

function getTimerElapsedMs(now = Date.now()) {
  const elapsedMs = Number.isFinite(appState.timer.elapsedMs) ? Math.max(0, appState.timer.elapsedMs) : 0;
  if (!appState.timer.running || !Number.isFinite(appState.timer.startedAt)) return elapsedMs;
  return elapsedMs + Math.max(0, now - appState.timer.startedAt);
}

function getGreeting() {
  const currentUser = state.users.find((user) => user.currentUser);
  const firstName = currentUser?.name?.trim().split(/\s+/)[0];
  return firstName ? `Welcome back, ${firstName}` : 'Welcome back';
}

function getProjectName(projectId) {
  const project = state.projects.find((item) => item.id === projectId);
  return project ? project.name : 'General';
}

function getProjectColor(projectId) {
  const project = state.projects.find((item) => item.id === projectId);
  return project ? project.color : '#7a6bf2';
}

function getCompletedTasks() {
  return state.tasks.filter((task) => task.completed).length;
}

function getFocusMinutes() {
  return state.sessions.reduce((sum, session) => sum + (session.category === 'Work' ? session.minutes : 0), 0);
}

function getFocusHoursRounded() {
  const totalMinutes = getFocusMinutes();
  return (totalMinutes / 60).toFixed(1) + 'h';
}

function getActivityDaysCount() {
  const uniqueDays = new Set(state.sessions.map((session) => session.date));
  return uniqueDays.size;
}

function getTrendData() {
  const today = new Date();
  const data = [];

  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    const minutes = state.sessions
      .filter((session) => session.date === key)
      .reduce((sum, session) => sum + session.minutes, 0);

    data.push({
      day: date.toLocaleDateString('en-US', { weekday: 'short' }),
      value: Math.max(0, Math.round(minutes / 60 * 10) / 10),
      fullDate: key
    });
  }

  return data;
}

function renderSidebar() {
  elements.pages.forEach((page) => {
    page.classList.toggle('active', page.dataset.page === appState.view);
  });

  elements.navItems.forEach((button) => {
    const target = button.dataset.view;
    const isActive = target === appState.view;
    button.classList.toggle('active', isActive);
    if (isActive) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
}

function setView(viewName) {
  if (!Array.from(elements.pages).some((page) => page.dataset.page === viewName)) return;
  if (appState.view === viewName) return;

  appState.view = viewName;
  renderSidebar();
  saveState();
}

function renderOverviewStats() {
  const stats = [
    {
      icon: '▣',
      number: state.projects.length,
      label: 'In Progress',
      metric: 'projects'
    },
    {
      icon: '✓',
      number: getCompletedTasks(),
      label: 'Completed',
      metric: 'tasks'
    },
    {
      icon: '◔',
      number: getFocusHoursRounded(),
      label: 'Focus Hours',
      metric: 'hours'
    },
    {
      icon: '▤',
      number: `${getActivityDaysCount()} days`,
      label: 'Activity time',
      metric: 'activity'
    }
  ];

  elements.statCards.innerHTML = stats
    .map((stat) => {
      const dots = Array.from({ length: 7 }, (_, idx) => '<span class="' + (idx < 5 ? 'active' : '') + '"></span>').join('');
      return `
        <article class="stat-card">
          <div class="stat-content">
            <div class="stat-icon">${stat.icon}</div>
            <div class="stat-text">
              <div class="stat-number">${stat.number}</div>
              <div class="stat-label">${stat.label}</div>
            </div>
          </div>
          ${stat.metric === 'activity' ? `<div class="small-dots">${dots}</div>` : ''}
        </article>
      `;
    })
    .join('');
}

function renderDailyOverview() {
  const today = isoDateOffset(0);
  const focusMinutes = state.sessions
    .filter((session) => session.date === today)
    .reduce((sum, session) => sum + (Number(session.minutes) || 0), 0);
  const focusTargetMinutes = 120;
  const progress = Math.min(1, focusMinutes / focusTargetMinutes);
  const completedTasks = state.tasks.filter((task) => task.dueDate === today && task.completed).length;
  const dueTasks = state.tasks.filter((task) => task.dueDate === today).length;
  const completedHabits = state.habits.filter((habit) => habit.completed).length;
  const remainingMinutes = Math.max(0, focusTargetMinutes - focusMinutes);

  elements.todayDateLabel.textContent = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  elements.todayFocusTime.textContent = focusMinutes < 60
    ? `${focusMinutes}m`
    : `${Math.floor(focusMinutes / 60)}h ${focusMinutes % 60}m`;
  elements.todayFocusTarget.textContent = remainingMinutes ? `${remainingMinutes}m to your 2h goal` : 'Daily focus goal reached';
  elements.dailyFocusPercent.textContent = `${Math.round(progress * 100)}%`;
  elements.dailyFocusRingProgress.style.strokeDashoffset = `${263.9 * (1 - progress)}`;
  elements.todayTaskCount.textContent = `${completedTasks} / ${dueTasks}`;
  elements.todayHabitCount.textContent = `${completedHabits} / ${state.habits.length}`;
}

function renderHabitProgress() {
  const xpPerLevel = 250;
  const xp = Math.max(0, Number(state.progress.xp) || 0);
  const level = Math.floor(xp / xpPerLevel) + 1;
  const levelXp = xp % xpPerLevel;
  const completedCount = state.habits.filter((habit) => habit.completed).length;

  elements.habitStreakValue.textContent = state.progress.streak;
  elements.habitLevelLabel.textContent = `LEVEL ${level}`;
  elements.habitXpLabel.textContent = `${levelXp} / ${xpPerLevel} XP`;
  elements.habitXpProgress.style.width = `${(levelXp / xpPerLevel) * 100}%`;
  elements.habitXpProgress.parentElement.setAttribute('aria-valuenow', levelXp);
  elements.habitList.setAttribute('aria-label', `${completedCount} of ${state.habits.length} habits completed today`);
  elements.habitList.innerHTML = state.habits.map((habit) => `
    <button class="habit-row" type="button" data-habit-id="${habit.id}" aria-pressed="${habit.completed}" aria-label="${habit.title}, ${habit.completed ? 'completed' : 'not completed'}">
      <span class="habit-checkmark" aria-hidden="true">✓</span>
      <span class="habit-title">${habit.title}</span>
      <span class="habit-reward">${habit.completed ? 'Done' : '+25 XP'}</span>
    </button>
  `).join('');
}

function updateHeatmapActivity(date, delta) {
  let day = state.activityHeatmap.find((item) => item.date === date);
  if (!day && delta > 0) {
    day = { date, count: 0, level: 0 };
    state.activityHeatmap.push(day);
  }
  if (!day) return;
  day.count = Math.max(0, (Number(day.count) || 0) + delta);
  day.level = Math.min(4, day.count);
}

function toggleHabit(habitId) {
  const habit = state.habits.find((item) => item.id === habitId);
  if (!habit) return;

  const wasCompleted = habit.completed;
  habit.completed = !wasCompleted;
  const today = isoDateOffset(0);
  const xpChange = wasCompleted ? -25 : 25;
  state.progress.xp = Math.max(0, state.progress.xp + xpChange);
  updateHeatmapActivity(today, wasCompleted ? -1 : 1);

  if (!wasCompleted && state.progress.lastActiveDate !== today) {
    state.progress.streak = state.progress.lastActiveDate === isoDateOffset(-1) ? state.progress.streak + 1 : 1;
    state.progress.lastActiveDate = today;
  }

  const currentUser = state.users.find((user) => user.currentUser);
  if (currentUser) {
    currentUser.score = state.progress.xp;
    currentUser.dailyScore = Math.max(0, currentUser.dailyScore + xpChange);
    currentUser.weeklyScore = Math.max(0, currentUser.weeklyScore + xpChange);
    currentUser.lastActivity = 'just now';
  }

  saveState();
  renderDailyOverview();
  renderHabitProgress();
  renderLeaderboard();
  renderHeatmap();
}

function renderBalanceChart() {
  const totalMinutes = getFocusMinutes();
  const workMinutes = state.sessions.filter((session) => session.category === 'Work').reduce((sum, session) => sum + session.minutes, 0);
  const lifeMinutes = state.sessions.filter((session) => session.category === 'Life').reduce((sum, session) => sum + session.minutes, 0);
  const work = totalMinutes ? Math.round((workMinutes / totalMinutes) * 100) : 65;
  const life = 100 - work;

  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const workDash = (work / 100) * circumference;
  const lifeDash = circumference - workDash;

  if (elements.balanceDonut.querySelectorAll('circle').length !== 3) {
    elements.balanceDonut.innerHTML = `
      <circle cx="90" cy="90" r="58" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="18"></circle>
      <circle cx="90" cy="90" r="58" fill="none" stroke="rgba(199, 188, 255, 1)" stroke-width="18" stroke-linecap="round"></circle>
      <circle cx="90" cy="90" r="58" fill="none" stroke="rgba(122,107,242,1)" stroke-width="18" stroke-linecap="round"></circle>
    `;
  }

  const [track, workSegment, lifeSegment] = elements.balanceDonut.querySelectorAll('circle');
  workSegment.setAttribute('stroke-dasharray', `${workDash} ${lifeDash}`);
  workSegment.setAttribute('stroke-dashoffset', '0');
  lifeSegment.setAttribute('stroke-dasharray', `${lifeDash} ${workDash}`);
  lifeSegment.setAttribute('stroke-dashoffset', `${-workDash}`);

  const balanceText = document.querySelector('.balance-center strong');
  if (balanceText) {
    balanceText.textContent = `${work}%`;
  }

  const legendItems = document.querySelectorAll('.legend-item');
  if (legendItems[0]) legendItems[0].innerHTML = '<span class="legend-dot light"></span> Work ' + work + '%';
  if (legendItems[1]) legendItems[1].innerHTML = '<span class="legend-dot dark"></span> Life ' + life + '%';
}

function renderTrendBars() {
  const data = getTrendData();
  const max = Math.max(...data.map((item) => item.value), 1);

  elements.trendBars.innerHTML = data
    .map((item, index) => {
      const height = Math.max(18, (item.value / max) * 100);
      let variant = 'variant-light';
      if (index === 3) variant = 'variant-strong';
      if (index === 5) variant = 'variant-striped';
      if (index === 0 || index === 6) variant = 'variant-purple';

      return `
        <div class="trend-bar-wrap">
          <div
            class="trend-bar ${variant} has-tooltip"
            data-tooltip="${item.value} hours"
            style="height: ${height}%"
            aria-label="${item.day} ${item.value} hours"
            title="${item.day}: ${item.value} hours"
          ></div>
          <span class="trend-bar-name">${item.day.slice(0, 2)}</span>
        </div>
      `;
    })
    .join('');

  const loggedValue = `${Math.round(data.reduce((sum, item) => sum + item.value, 0))}h logged this week`;
  const weeklyText = document.getElementById('weeklyHoursLogged');
  if (weeklyText) weeklyText.textContent = loggedValue;
}

function renderTaskFormOptions() {
  const taskOptions = state.tasks.map((task) => `<option value="${task.id}">${task.title}</option>`).join('');
  const projectOptions = state.projects.map((project) => `<option value="${project.id}">${project.name}</option>`).join('');

  elements.activeTaskSelect.innerHTML = taskOptions;
  elements.activeProjectSelect.innerHTML = projectOptions;

  if (appState.timer.taskId) {
    elements.activeTaskSelect.value = appState.timer.taskId;
  }
  if (appState.timer.projectId) {
    elements.activeProjectSelect.value = appState.timer.projectId;
  }
}

function renderTaskList() {
  const filteredTasks = state.tasks.filter((task) => {
    const searchMatch = !appState.searchTerm || task.title.toLowerCase().includes(appState.searchTerm.toLowerCase());
    if (!searchMatch) return false;

    if (appState.taskFilter === 'completed') return task.completed;
    if (appState.taskFilter === 'today') {
      return task.dueDate === isoDateOffset(0) || (!task.completed && task.dueDate <= isoDateOffset(0));
    }
    return true;
  });

  elements.taskList.innerHTML = filteredTasks
    .map((task) => `
      <div class="task-item ${task.completed ? 'done' : ''}">
        <button class="task-check" type="button" aria-label="Mark task complete" data-task-id="${task.id}" data-action="toggle-task"></button>
        <div class="task-main">
          <strong>${task.title}</strong>
          <div class="task-meta">
            <span>${getProjectName(task.projectId)}</span>
            <span>${task.tag}</span>
            <span>${new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          </div>
        </div>
        <span class="task-priority ${task.priority}">${task.priority}</span>
        <button class="task-action" type="button" data-task-id="${task.id}" data-action="delete-task">Delete</button>
      </div>
    `)
    .join('');
}

function renderReminders() {
  if (!state.reminders.length) {
    elements.reminderDetails.innerHTML = '<p class="empty-state">No reminders yet.</p>';
    return;
  }
  const activeReminder = state.reminders[appState.reminderIndex % state.reminders.length];

  elements.reminderDetails.innerHTML = `
    <div class="reminder-card">
      <div class="reminder-time-box">${activeReminder.time.replace(':', ':')}</div>
      <div>
        <h3>${activeReminder.title}</h3>
        <p>${activeReminder.description}</p>
      </div>
      <div class="reminder-tags">
        <span class="tag-pill">${activeReminder.tag}</span>
        <span class="meet-icon">${activeReminder.icon === 'Meet' ? 'M' : 'L'}</span>
      </div>
    </div>
  `;
}

function renderProjects() {
  elements.projectGrid.innerHTML = state.projects.map((project) => {
    const projectTasks = state.tasks.filter((task) => task.projectId === project.id);
    const completedTasks = projectTasks.filter((task) => task.completed).length;
    const focusMinutes = state.sessions
      .filter((session) => session.projectId === project.id)
      .reduce((sum, session) => sum + session.minutes, 0);

    return `
      <article class="project-card" style="--project-accent:${project.color}">
        <div class="project-card-top"><span class="project-color-dot"></span><span>${projectTasks.length} ${projectTasks.length === 1 ? 'task' : 'tasks'}</span></div>
        <h2>${project.name}</h2>
        <div class="project-card-meta"><span>${completedTasks} completed</span><span>${getHourString(focusMinutes)} focused</span></div>
        <div class="project-progress"><span style="width:${projectTasks.length ? completedTasks / projectTasks.length * 100 : 0}%"></span></div>
      </article>
    `;
  }).join('') || '<p class="empty-state">No projects yet. Create one to get started.</p>';
}

function renderCalendar() {
  const monday = new Date();
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) + appState.calendarWeekOffset * 7);
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const dayOffset = Math.round((date - new Date(new Date().setHours(0, 0, 0, 0))) / 86400000);
    return { date, key: isoDateOffset(dayOffset) };
  });
  const weekKeys = week.map((day) => day.key);
  if (!weekKeys.includes(appState.calendarSelectedDate)) {
    appState.calendarSelectedDate = appState.calendarWeekOffset === 0 ? isoDateOffset(0) : week[0].key;
  }

  elements.calendarWeekLabel.textContent = `${week[0].date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${week[6].date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  elements.calendarDays.innerHTML = week.map(({ date, key }) => `
    <button class="calendar-day ${key === appState.calendarSelectedDate ? 'active' : ''}" type="button" data-date="${key}" aria-pressed="${key === appState.calendarSelectedDate}">
      <span>${date.toLocaleDateString('en-US', { weekday: 'short' })}</span><strong>${date.getDate()}</strong>
    </button>
  `).join('');

  const selectedDate = week.find((day) => day.key === appState.calendarSelectedDate)?.date || new Date();
  elements.calendarSelectedLabel.textContent = selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const dayTasks = state.tasks.filter((task) => task.dueDate === appState.calendarSelectedDate);
  const dayReminders = state.reminders.filter((reminder) => reminder.dueDate === appState.calendarSelectedDate);
  const eventCount = dayTasks.length + dayReminders.length;
  elements.calendarEventCount.textContent = `${eventCount} ${eventCount === 1 ? 'item' : 'items'}`;
  elements.calendarEvents.innerHTML = [
    ...dayReminders.map((reminder) => `
      <article class="calendar-event reminder-event"><span class="calendar-event-time">${reminder.time}</span><div><strong>${reminder.title}</strong><p>${reminder.description}</p></div><span class="calendar-event-tag">Reminder</span></article>
    `),
    ...dayTasks.map((task) => `
      <article class="calendar-event task-event ${task.completed ? 'is-complete' : ''}"><span class="calendar-event-time">${task.completed ? 'Done' : 'Task'}</span><div><strong>${task.title}</strong><p>${getProjectName(task.projectId)} · ${task.priority} priority</p></div><span class="calendar-event-tag">${task.completed ? 'Completed' : 'Due'}</span></article>
    `)
  ].join('') || '<p class="empty-state">Nothing scheduled for this day.</p>';
}

function renderAIInsight() {
  const insight = state.insights[appState.insightIndex % state.insights.length];
  elements.aiInsight.innerHTML = `
    <div class="ai-bubble">${insight.text}</div>
    <div class="ai-actions">
      <button class="ignore" type="button" data-action="ignore-insight">Ignore</button>
      <button class="reschedule" type="button" data-action="reschedule-insight">Reschedule</button>
    </div>
  `;
}

function renderLeaderboard() {
  document.querySelectorAll('#leaderboardPeriods [data-period]').forEach((button) => {
    const selected = button.dataset.period === appState.leaderboardPeriod;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });

  const scoreFor = (user) => appState.leaderboardPeriod === 'daily'
    ? user.dailyScore
    : appState.leaderboardPeriod === 'weekly' ? user.weeklyScore : user.score;
  const userRows = [...state.users].sort((a, b) => scoreFor(b) - scoreFor(a));
  const topThree = userRows.slice(0, 3);

  elements.podium.innerHTML = [
    { rank: 2, user: topThree[1], className: 'second' },
    { rank: 1, user: topThree[0], className: 'first center' },
    { rank: 3, user: topThree[2], className: 'third' }
  ].map((entry) => `
    <div class="podium-card ${entry.className}">
      <div class="podium-rank">${entry.rank}${entry.rank === 1 ? 'st' : entry.rank === 2 ? 'nd' : 'rd'}</div>
      <div class="podium-avatar">${entry.user.avatar}</div>
      <div class="podium-name">${entry.user.name}</div>
      <div class="podium-score">⚡ ${scoreFor(entry.user)}</div>
      <div class="podium-base" style="height:${entry.rank === 1 ? 140 : entry.rank === 2 ? 110 : 92}px"></div>
    </div>
  `).join('');

  elements.leaderboardTableBody.innerHTML = userRows
    .map((user, index) => `
      <tr class="${user.currentUser ? 'current-user' : ''}">
        <td>#${index + 1}</td>
        <td>
          <div class="user-cell">
            <span class="user-avatar">${user.avatar}</span>
            <div class="user-name"><span>${user.emoji}</span> ${user.name}</div>
          </div>
        </td>
        <td><span class="last-activity">🕒 ${user.lastActivity}</span></td>
        <td><span class="points-badge">⚡ ${scoreFor(user)}</span></td>
      </tr>
    `)
    .join('');

  const currentUserIndex = userRows.findIndex((user) => user.currentUser);
  const currentScore = currentUserIndex >= 0 ? scoreFor(userRows[currentUserIndex]) : 0;
  document.getElementById('leaderboardFriendCount').textContent = `${Math.max(0, userRows.length - 1)} friends`;
  document.getElementById('leaderboardCurrentRank').textContent = currentUserIndex >= 0 ? `Your rank #${currentUserIndex + 1}` : 'Your rank';
  document.getElementById('leaderboardCurrentScore').textContent = `${currentScore} XP`;
}

function renderHeatmap() {
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  startDate.setDate(startDate.getDate() - 83);
  const activityByDate = new Map(state.activityHeatmap.map((day) => [day.date, day]));
  const chartData = Array.from({ length: 84 }, (_, index) => {
    const date = isoDateOffset(index - 83);
    const savedDay = activityByDate.get(date);
    const count = Number(savedDay?.count) || 0;
    return { date, count, level: Math.min(4, count) };
  });
  const leadingDays = (startDate.getDay() + 6) % 7;
  const weekCount = Math.ceil((leadingDays + chartData.length) / 7);
  const weeks = Array.from({ length: weekCount }, (_, weekIndex) =>
    Array.from({ length: 7 }, (_, dayIndex) => {
      const dataIndex = weekIndex * 7 + dayIndex - leadingDays;
      return chartData[dataIndex] || null;
    })
  );
  const rows = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'];
  let previousMonth = '';
  const monthCells = weeks.map((week) => {
    const firstDay = week.find(Boolean);
    if (!firstDay) return '<span></span>';
    const month = new Date(`${firstDay.date}T12:00:00`).toLocaleDateString('en-US', { month: 'short' });
    if (month === previousMonth) return '<span></span>';
    previousMonth = month;
    return `<span class="month-label">${month}</span>`;
  }).join('');
  const gridColumns = `26px repeat(${weekCount}, minmax(0, 1fr))`;

  elements.heatmapChart.innerHTML = `
    <div class="heatmap-months" style="grid-template-columns:${gridColumns}">
      <span></span>${monthCells}
    </div>
    <div class="heatmap-grid" style="grid-template-columns:${gridColumns}">
      ${rows.map((row, dayIndex) => {
        const rowCells = weeks.map((week) => {
          const cell = week[dayIndex];
          if (!cell) return '<span class="heatmap-cell-placeholder" aria-hidden="true"></span>';
          const activityCount = cell.count;
          const activityLabel = `${activityCount} ${activityCount === 1 ? 'activity' : 'activities'}`;
          const dateLabel = new Date(`${cell.date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          return `<button type="button" class="heatmap-cell" data-level="${cell.level}" data-tooltip="${activityLabel}" aria-label="${dateLabel}: ${activityLabel}" title="${dateLabel}: ${activityLabel}"></button>`;
        }).join('');
        return `${row ? `<span class="heatmap-label">${row}</span>` : '<span></span>'}${rowCells}`;
      }).join('')}
    </div>
  `;

  const totalCount = chartData.reduce((sum, item) => sum + item.count, 0);
  const peakDay = chartData.reduce((peak, item) => item.count > peak.count ? item : peak, { count: -1 });
  document.getElementById('totalCountValue').textContent = totalCount.toLocaleString();
  document.getElementById('currentStreakValue').textContent = `${state.progress.streak} days`;
  document.getElementById('peakDayValue').textContent = peakDay.count > 0
    ? new Date(`${peakDay.date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long' })
    : 'No activity';
}

function renderTaskActivityChart() {
  const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
  const values = [48, 52, 62, 88, 120, 140, 132];
  const max = 150;
  const points = values.map((value, index) => {
    const x = 30 + index * 52;
    const y = 180 - (value / max) * 140;
    return `${x},${y}`;
  }).join(' ');

  const fillPoints = `30,180 ${points} 300,180`;

  elements.taskActivityChart.innerHTML = `
    <svg viewBox="0 0 330 210" width="100%" height="100%" role="img" aria-label="Task activity chart">
      <defs>
        <linearGradient id="taskAreaFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="rgba(125, 233, 188, 0.45)" />
          <stop offset="100%" stop-color="rgba(125, 233, 188, 0.02)" />
        </linearGradient>
      </defs>
      <g stroke="rgba(255,255,255,0.08)" stroke-width="1">
        <line x1="30" y1="40" x2="300" y2="40"></line>
        <line x1="30" y1="90" x2="300" y2="90"></line>
        <line x1="30" y1="140" x2="300" y2="140"></line>
        <line x1="30" y1="180" x2="300" y2="180"></line>
      </g>
      <polygon points="${fillPoints}" fill="url(#taskAreaFill)"></polygon>
      <polyline points="${points}" fill="none" stroke="#7fe4b8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></polyline>
      ${values.map((value, index) => {
        const x = 30 + index * 52;
        const y = 180 - (value / max) * 140;
        const highlight = index >= 4 && index <= 5 ? 'fill="#dffdf2"' : 'fill="#7fe4b8"';
        return `<circle cx="${x}" cy="${y}" r="4" ${highlight}></circle>`;
      }).join('')}
      ${labels.map((label, index) => `<text x="${30 + index * 52}" y="200" fill="rgba(255,255,255,0.5)" text-anchor="middle" font-size="10">${label}</text>`).join('')}
    </svg>
  `;

  document.getElementById('taskCompletedValue').textContent = '1,345';
}

function renderRadarChart() {
  const axes = ['Research', 'Meetings', 'Develop', 'Testing', 'Design'];
  const labels = axes.map((label, index) => {
    const angle = -Math.PI / 2 + (index / axes.length) * Math.PI * 2;
    const x = 105 + Math.cos(angle) * 70;
    const y = 105 + Math.sin(angle) * 70;
    return { label, x, y };
  });

  const values = [80, 64, 88, 76, 58];
  const points = values.map((value, index) => {
    const angle = -Math.PI / 2 + (index / axes.length) * Math.PI * 2;
    const radius = (value / 100) * 70;
    const x = 105 + Math.cos(angle) * radius;
    const y = 105 + Math.sin(angle) * radius;
    return `${x},${y}`;
  }).join(' ');

  elements.radarChart.innerHTML = `
    <svg viewBox="0 0 220 220" width="100%" height="100%" role="img" aria-label="Team allocation radar chart">
      <g stroke="rgba(255,255,255,0.08)" stroke-width="1">
        ${axes.map((_, index) => {
          const angle = -Math.PI / 2 + (index / axes.length) * Math.PI * 2;
          const x = 105 + Math.cos(angle) * 70;
          const y = 105 + Math.sin(angle) * 70;
          return `<line x1="105" y1="105" x2="${x}" y2="${y}"></line>`;
        }).join('')}
      </g>
      <polygon points="${points}" fill="rgba(125, 233, 188, 0.28)" stroke="#7fe4b8" stroke-width="2"></polygon>
      ${labels.map((axis) => `
        <g>
          <circle cx="${axis.x}" cy="${axis.y}" r="3" fill="#7fe4b8"></circle>
          <text x="${axis.x}" y="${axis.y - 10}" fill="rgba(255,255,255,0.7)" font-size="10" text-anchor="middle">${axis.label}</text>
        </g>
      `).join('')}
    </svg>
  `;
}

function renderProductivityBars() {
  const values = [16, 24, 35, 48, 42, 60, 28];
  const max = 60;
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  elements.productivityBars.innerHTML = values
    .map((value, index) => `
      <div class="productivity-bar-wrap">
        <div class="productivity-bar ${index === 4 ? 'active' : ''}" data-tooltip="${value}h total" style="height:${Math.max(28, (value / max) * 100)}%" title="${days[index]}: ${value}h"></div>
        <span class="productivity-bar-label">${days[index].slice(0, 2)}</span>
      </div>
    `)
    .join('');
}

function renderTeamGauge() {
  const total = 78;
  const arcLength = 160;
  const dashOffset = arcLength * (1 - total / 100);

  elements.teamGauge.innerHTML = `
    <svg viewBox="0 0 220 120" width="100%" height="100%" role="img" aria-label="Team progress gauge">
      <path d="M 20 90 a 80 80 0 0 1 180 0" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="12" stroke-linecap="round"></path>
      <path d="M 20 90 a 80 80 0 0 1 180 0" fill="none" stroke="url(#teamProgressGradient)" stroke-width="12" stroke-linecap="round" stroke-dasharray="${arcLength} ${arcLength}" stroke-dashoffset="${dashOffset}"></path>
      <defs>
        <linearGradient id="teamProgressGradient" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stop-color="#7fe4b8" />
          <stop offset="100%" stop-color="#1dd38a" />
        </linearGradient>
      </defs>
    </svg>
  `;
}

function renderOverviewPage() {
  elements.greetingText.textContent = getGreeting();
  renderOverviewStats();
  renderBalanceChart();
  renderTrendBars();
  renderDailyOverview();
  renderHabitProgress();
}

function renderAnalyticsPage() {
  renderHeatmap();
  renderTaskActivityChart();
  renderRadarChart();
  renderProductivityBars();
  renderTeamGauge();
}

function renderAll() {
  renderSidebar();
  renderOverviewPage();
  renderProjects();
  renderCalendar();
  renderTaskFormOptions();
  renderTaskList();
  renderAIInsight();
  renderAnalyticsPage();
  renderLeaderboard();
}

function bindEvents() {
  elements.habitList.addEventListener('click', (event) => {
    const habitButton = event.target.closest('[data-habit-id]');
    if (habitButton) toggleHabit(habitButton.dataset.habitId);
  });

  elements.heatmapChart.addEventListener('click', (event) => {
    const cell = event.target.closest('.heatmap-cell');
    if (!cell) return;
    const wasSelected = cell.classList.contains('is-selected');
    elements.heatmapChart.querySelectorAll('.heatmap-cell.is-selected').forEach((selectedCell) => {
      selectedCell.classList.remove('is-selected');
    });
    if (!wasSelected) cell.classList.add('is-selected');
  });

  elements.navItems.forEach((button) => {
    button.addEventListener('click', () => {
      setView(button.dataset.view);
    });
  });

  document.getElementById('leaderboardPeriods').addEventListener('click', (event) => {
    const periodButton = event.target.closest('[data-period]');
    if (!periodButton) return;
    appState.leaderboardPeriod = periodButton.dataset.period;
    document.querySelectorAll('#leaderboardPeriods [data-period]').forEach((button) => {
      const selected = button === periodButton;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    renderLeaderboard();
    saveState();
  });

  document.querySelectorAll('[data-open-project]').forEach((button) => {
    button.addEventListener('click', () => elements.openProjectModal.click());
  });

  elements.calendarDays.addEventListener('click', (event) => {
    const dayButton = event.target.closest('[data-date]');
    if (!dayButton) return;
    appState.calendarSelectedDate = dayButton.dataset.date;
    renderCalendar();
  });

  document.getElementById('calendarPrevWeek').addEventListener('click', () => {
    appState.calendarWeekOffset -= 1;
    renderCalendar();
  });

  document.getElementById('calendarNextWeek').addEventListener('click', () => {
    appState.calendarWeekOffset += 1;
    renderCalendar();
  });

  document.querySelectorAll('.filter-btn').forEach((button) => {
    button.addEventListener('click', () => {
      appState.taskFilter = button.dataset.filter;
      document.querySelectorAll('.filter-btn').forEach((item) => item.classList.toggle('active', item === button));
      renderTaskList();
      saveState();
    });
  });

  elements.taskForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const taskTitle = elements.taskInput.value.trim();
    if (!taskTitle) return;

    const newTask = {
      id: `t-${Date.now()}`,
      title: taskTitle,
      projectId: state.projects[0].id,
      priority: 'medium',
      dueDate: isoDateOffset(0),
      tag: 'Work',
      completed: false
    };

    state.tasks.unshift(newTask);
    elements.taskInput.value = '';
    saveState();
    renderTaskList();
    renderTaskFormOptions();
    renderProjects();
    renderCalendar();
  });

  elements.taskList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const taskId = button.dataset.taskId;
    if (button.dataset.action === 'toggle-task') {
      state.tasks = state.tasks.map((task) => task.id === taskId ? { ...task, completed: !task.completed } : task);
    }
    if (button.dataset.action === 'delete-task') {
      state.tasks = state.tasks.filter((task) => task.id !== taskId);
    }
    saveState();
    renderTaskList();
    renderTaskFormOptions();
    renderOverviewStats();
    renderBalanceChart();
    renderTrendBars();
    renderProjects();
    renderCalendar();
  });

  elements.aiInsight.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    if (button.dataset.action === 'ignore-insight') {
      appState.insightIndex = (appState.insightIndex + 1) % state.insights.length;
      renderAIInsight();
    }
    if (button.dataset.action === 'reschedule-insight') {
      const firstTask = state.tasks.find((task) => !task.completed);
      if (firstTask) {
        firstTask.dueDate = isoDateOffset(1);
      }
      appState.insightIndex = (appState.insightIndex + 1) % state.insights.length;
      renderAIInsight();
      renderTaskList();
      saveState();
    }
  });

  elements.globalSearch.addEventListener('input', (event) => {
    appState.searchTerm = event.target.value.trim();
    renderTaskList();
  });

  document.addEventListener('keydown', (event) => {
    const combo = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f';
    if (combo) {
      event.preventDefault();
      elements.globalSearch.focus();
    }
  });

  elements.exportDataBtn.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'velocity-data.json';
    anchor.click();
    URL.revokeObjectURL(url);
  });

  elements.importDataBtn.addEventListener('click', () => elements.importDataInput.click());
  elements.importDataInput.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        Object.assign(state, parsed);
        saveState();
        renderAll();
      } catch (error) {
        console.error('Invalid import data.', error);
      }
    };
    reader.readAsText(file);
  });

  elements.resetDemoBtn.addEventListener('click', () => {
    resetDemoData();
  });

  elements.openProjectModal.addEventListener('click', () => {
    elements.projectModal.classList.remove('hidden');
    elements.projectModal.setAttribute('aria-hidden', 'false');
    elements.projectNameInput.focus();
  });

  elements.closeProjectModal.addEventListener('click', () => {
    elements.projectModal.classList.add('hidden');
    elements.projectModal.setAttribute('aria-hidden', 'true');
  });

  elements.projectModal.addEventListener('click', (event) => {
    if (event.target === elements.projectModal) {
      elements.projectModal.classList.add('hidden');
    }
  });

  elements.projectForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = elements.projectNameInput.value.trim();
    if (!name) return;

    state.projects.push({
      id: `p-${Date.now()}`,
      name,
      color: elements.projectColorInput.value
    });

    elements.projectForm.reset();
    elements.projectModal.classList.add('hidden');
    saveState();
    renderOverviewStats();
    renderTaskFormOptions();
    renderProjects();
  });

  elements.timerStartBtn.addEventListener('click', () => {
    if (appState.timer.active) return;
    const taskId = elements.activeTaskSelect.value || state.tasks[0]?.id;
    const projectId = elements.activeProjectSelect.value || state.projects[0]?.id;
    appState.timer = { active: true, running: true, startedAt: Date.now(), elapsedMs: 0, taskId, projectId, sessionId: null, mode: 'focus' };
    saveState();
    updateTimer();
  });

  elements.timerResumeBtn.addEventListener('click', () => {
    if (appState.timer.running || (!appState.timer.active && appState.timer.elapsedMs <= 0)) return;
    appState.timer.active = true;
    appState.timer.running = true;
    appState.timer.startedAt = Date.now();
    saveState();
    updateTimer();
  });

  elements.timerPauseBtn.addEventListener('click', () => {
    if (!appState.timer.running) return;
    appState.timer.elapsedMs = getTimerElapsedMs();
    appState.timer.running = false;
    appState.timer.startedAt = null;
    saveState();
    updateTimer();
  });

  elements.timerStopActionBtn.addEventListener('click', () => {
    stopTimer();
  });

  elements.timerStopBtn.addEventListener('click', () => {
    stopTimer();
  });
}

function stopTimer() {
  if (!appState.timer.active) return;

  const elapsedMs = getTimerElapsedMs();
  if (elapsedMs >= 1000) {
    const sessionId = appState.timer.sessionId || `s-${Date.now()}`;
    const session = {
      id: sessionId,
      taskId: appState.timer.taskId || state.tasks[0]?.id || 't1',
      projectId: appState.timer.projectId || state.projects[0]?.id || 'p1',
      category: 'Work',
      minutes: Math.max(1, Math.round(elapsedMs / 60000)),
      date: isoDateOffset(0)
    };
    const existingSession = state.sessions.find((item) => item.id === sessionId);
    if (existingSession) Object.assign(existingSession, session);
    else {
      state.sessions.push(session);
      updateHeatmapActivity(isoDateOffset(0), 1);
    }
    appState.timer.sessionId = sessionId;
  }

  appState.timer = { ...appState.timer, active: false, running: false, startedAt: null, elapsedMs };
  saveState();
  renderOverviewPage();
  renderTaskFormOptions();
  renderProjects();
  renderHeatmap();
  updateTimer();
}

function updateTimer() {
  const elapsedMs = getTimerElapsedMs();
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const progress = appState.timer.active || elapsedMs > 0 ? (totalSeconds % 1500) / 1500 : 0;
  const gaugeLength = Math.PI * 80;
  const arcLength = progress * gaugeLength;

  elements.timerDisplay.textContent = formatTime(elapsedMs);
  elements.timerStartBtn.disabled = appState.timer.active;
  elements.timerResumeBtn.disabled = appState.timer.running || (!appState.timer.active && elapsedMs <= 0);
  elements.timerPauseBtn.disabled = !appState.timer.running;
  elements.timerStopBtn.disabled = !appState.timer.active;
  elements.timerStopActionBtn.disabled = !appState.timer.active;
  elements.activeTaskSelect.disabled = appState.timer.active || elapsedMs > 0;
  elements.activeProjectSelect.disabled = appState.timer.active || elapsedMs > 0;
  elements.timerGauge.innerHTML = `
    <path d="M 20 90 A 80 80 0 0 1 180 90" fill="none" stroke="rgba(17,24,39,0.09)" stroke-width="12" stroke-linecap="round"></path>
    <path d="M 20 90 A 80 80 0 0 1 180 90" fill="none" stroke="url(#timerGradient)" stroke-width="12" stroke-linecap="round" stroke-dasharray="${arcLength} ${gaugeLength}" stroke-dashoffset="0"></path>
    <defs>
      <linearGradient id="timerGradient" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0%" stop-color="#ff9f43" />
        <stop offset="100%" stop-color="#ff6a6a" />
      </linearGradient>
    </defs>
  `;
}

bindEvents();
renderAll();
updateTimer();
setInterval(updateTimer, 1000);

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("./sw.js")
            .then((registration) => {
                console.log("Velocity PWA registered:", registration.scope);
            })
            .catch((error) => {
                console.error("Service worker registration failed:", error);
            });
    });
}
