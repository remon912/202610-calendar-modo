import { useCallback, useEffect, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import {
  AlarmClock,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Bell,
  CalendarDays,
  Check,
  CheckCheck,
  CircleHelp,
  Coffee,
  Ellipsis,
  Gift,
  ListTodo,
  Moon,
  Plus,
  Search,
  Settings,
  Sparkles,
  Sprout,
  StickyNote,
  Sun,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import MemoPad from './components/MemoPad';
import DayAgenda from './components/DayAgenda';
import TodosPage from './pages/TodosPage';
import GrowthPage from './pages/GrowthPage';
import TrackManager from './components/TrackManager';
import SearchPalette from './components/SearchPalette';
import { dateKey, formatDate, moveToDate, parseDateKey } from './lib/date';
import { WEEKDAYS, collapseSeries } from './lib/todos';
import { addDays, eventEnd, isMultiDay, occursOn, rangeLabel } from './lib/events';
import { readStorage, writeStorage } from './lib/storage';
import { MEMO_KEY, memoDate } from './lib/memos';
import { DEFAULT_TRACKS, SYSTEM_TRACKS, TODO_TRACK, findTrack, trackStyle } from './lib/tracks';
import TrackIcon from './components/TrackIcon';
import DatePicker from './components/DatePicker';

const NAV_ITEMS = [
  { id: 'calendar', label: '캘린더', icon: CalendarDays },
  { id: 'todos', label: '할 일·메모', icon: ListTodo },
  { id: 'growth', label: '자기계발', icon: Sprout },
  { id: 'coupons', label: '쿠폰함', icon: Gift },
  { id: 'settings', label: '설정', icon: Settings },
];
// 자기계발은 자체 테마와 추가 버튼이 있어 공용 '새 일정' 버튼을 숨긴다.
const THEMED_PAGES = ['growth'];
const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const STORAGE = {
  events: 'moa-calendar-events',
  todos: 'moa-calendar-todos',
  tracks: 'moa-calendar-tracks',
  hiddenTracks: 'moa-calendar-hidden-tracks',
  theme: 'moa-calendar-theme',
};


function seedEvents() {
  const today = new Date();
  const day = (offset) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
    return dateKey(date);
  };
  return [
    { id: 'welcome-work', title: '주간 팀 스탠드업', start: day(0), allDay: false, track: 'work', startTime: '10:00', endTime: '10:30', location: '회의실 A' },
    { id: 'welcome-personal', title: '점심 산책', start: day(0), allDay: false, track: 'personal', startTime: '12:30', endTime: '13:00' },
    { id: 'welcome-review', title: '프로젝트 디자인 리뷰', start: day(1), allDay: false, track: 'work', startTime: '14:00', endTime: '15:00' },
    { id: 'welcome-coupon', title: '아메리카노 쿠폰 만료', start: day(3), allDay: true, track: 'coupon' },
    { id: 'welcome-personal2', title: '요가 클래스', start: day(4), allDay: false, track: 'personal', startTime: '18:30', endTime: '19:30' },
    { id: 'welcome-work2', title: '기획안 제출', start: day(7), allDay: true, track: 'work' },
  ];
}

function App() {
  const [page, setPage] = useState('calendar');
  const [tracks, setTracks] = useState(() => readStorage(STORAGE.tracks, DEFAULT_TRACKS));
  const [hiddenTracks, setHiddenTracks] = useState(() => readStorage(STORAGE.hiddenTracks, []));
  const [trackManagerOpen, setTrackManagerOpen] = useState(false);
  const [events, setEvents] = useState(() => readStorage(STORAGE.events, seedEvents()));
  const [todos, setTodos] = useState(() => readStorage(STORAGE.todos, [
    { id: 'todo-1', title: '주간 회의 자료 정리하기', dueDate: dateKey(new Date()), done: false, priority: 1 },
    { id: 'todo-2', title: '운동화 세탁 맡기기', dueDate: '', done: false, priority: 2 },
    { id: 'todo-3', title: '엄마 생신 선물 고르기', dueDate: dateKey(new Date(Date.now() + 86400000 * 2)), done: true, priority: 2 },
  ]));
  const [memoOpen, setMemoOpen] = useState(false);
  const [memoTarget, setMemoTarget] = useState(null);
  const [memos, setMemos] = useState(() => readStorage(MEMO_KEY, []));
  const [theme, setTheme] = useState(() => readStorage(STORAGE.theme, 'light'));
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [eventDraft, setEventDraft] = useState(null);
  const [agendaDate, setAgendaDate] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  // 검색 결과에서 다른 화면으로 갈 때 그 화면이 열자마자 보여줄 대상. nonce는 화면을 새로 그리게 하는 key로 쓴다.
  const [todoFocus, setTodoFocus] = useState(null);
  const [growthFocus, setGrowthFocus] = useState(null);
  const [calendarFocus, setCalendarFocus] = useState(null);
  const [notice, setNotice] = useState('');
  const calendarRef = useRef(null);

  useEffect(() => localStorage.setItem(STORAGE.events, JSON.stringify(events)), [events]);
  useEffect(() => localStorage.setItem(STORAGE.todos, JSON.stringify(todos)), [todos]);
  useEffect(() => localStorage.setItem(STORAGE.tracks, JSON.stringify(tracks)), [tracks]);
  useEffect(() => localStorage.setItem(STORAGE.hiddenTracks, JSON.stringify(hiddenTracks)), [hiddenTracks]);
  useEffect(() => {
    localStorage.setItem(STORAGE.theme, JSON.stringify(theme));
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(() => {
    if (!notice) return undefined;
    const timeout = window.setTimeout(() => setNotice(''), 2600);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  // Ctrl+K(맥은 ⌘K)로 어디서나 검색 창을 연다.
  useEffect(() => {
    const openOnShortcut = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', openOnShortcut);
    return () => window.removeEventListener('keydown', openOnShortcut);
  }, []);
  const consumeTodoFocus = useCallback(() => setTodoFocus((focus) => (focus?.id || focus?.memoDate ? { nonce: focus.nonce } : focus)), []);
  const consumeCalendarFocus = useCallback(() => setCalendarFocus((focus) => (focus?.date ? { nonce: focus.nonce } : focus)), []);
  const consumeGrowthFocus = useCallback(() => setGrowthFocus((focus) => (focus?.date ? { nonce: focus.nonce } : focus)), []);
  const saveMemos = (next) => {
    if (!writeStorage(MEMO_KEY, next)) return false;
    setMemos(next);
    return true;
  };
  // 특정 메모({ id }) 또는 특정 날짜의 새 메모({ date })로 메모장을 연다. nonce로 같은 요청도 다시 열리게 한다.
  const openMemo = (target) => {
    setAgendaDate(null);
    setMemoTarget({ ...target, nonce: crypto.randomUUID() });
    setMemoOpen(true);
  };
  const toggleMemoPad = () => {
    setMemoTarget(null);
    setMemoOpen((open) => !open);
  };
  // 그룹 필터를 적용하기 전 목록: 칩에 표시할 그룹별 개수를 세는 데 쓴다.
  const scopedEvents = events;
  // 할 일은 완료한 날(완료 시각 기준) 또는 마감일에 표시한다.
  const scopedTodos = todos.filter((todo) => (todo.done ? todo.doneAt : todo.dueDate));
  const visibleEvents = scopedEvents.filter((event) => !hiddenTracks.includes(findTrack(tracks, event.track).id));
  const visibleTodos = hiddenTracks.includes(TODO_TRACK.id) ? [] : scopedTodos;
  const trackCounts = Object.fromEntries([
    ...tracks.map((track) => [track.id, scopedEvents.filter((event) => findTrack(tracks, event.track).id === track.id).length]),
    [TODO_TRACK.id, scopedTodos.length],
  ]);
  const todoDate = (todo) => (todo.done ? dateKey(new Date(todo.doneAt)) : todo.dueDate);
  const activeTodos = collapseSeries(todos.filter((todo) => !todo.done));
  const agendaEvents = agendaDate ? visibleEvents.filter((event) => occursOn(event, agendaDate)) : [];
  const agendaTodos = agendaDate ? visibleTodos.filter((todo) => todoDate(todo) === agendaDate) : [];
  const activeCoupons = events.filter((event) => event.track === 'coupon' && event.start >= dateKey(new Date()));
  const eventsToday = events.filter((event) => occursOn(event, dateKey(new Date())));
  // 다가오는 일정: 오늘은 '오늘의 하루'에 있으므로 내일부터, 날짜·시간순으로 3개만 보여준다.
  const upcomingEvents = events
    .filter((event) => event.start > dateKey(new Date()))
    .sort((a, b) => a.start.localeCompare(b.start) || Number(b.allDay) - Number(a.allDay) || (a.startTime || '').localeCompare(b.startTime || ''))
    .slice(0, 3);

  const defaultTrack = (tracks.find((track) => !track.locked && !hiddenTracks.includes(track.id)) || findTrack(tracks, 'personal')).id;
  const openNewEvent = (date = selectedDate, track = defaultTrack) => {
    setEventDraft({
      id: '',
      title: '',
      start: dateKey(date),
      endDate: dateKey(date),
      allDay: false,
      track,
      startTime: '09:00',
      endTime: '10:00',
      location: '',
      memo: '',
      reminder: '10',
    });
  };
  const openExistingEvent = (event) => {
    const start = event.start instanceof Date ? event.start : new Date(`${event.start}T00:00:00`);
    setEventDraft({
      id: event.id,
      title: event.title,
      start: dateKey(start),
      endDate: event.extendedProps?.endDate || event.endDate || dateKey(start),
      allDay: event.allDay,
      track: event.extendedProps?.track || event.track,
      startTime: event.extendedProps?.startTime || event.startTime || '09:00',
      endTime: event.extendedProps?.endTime || event.endTime || '10:00',
      location: event.extendedProps?.location || event.location || '',
      memo: event.extendedProps?.memo || event.memo || '',
      reminder: event.extendedProps?.reminder || event.reminder || '10',
    });
  };
  const saveEvent = (event) => {
    if (!event.title.trim()) return;
    const nextEvent = { ...event, title: event.title.trim(), endDate: eventEnd(event), id: event.id || crypto.randomUUID() };
    setEvents((current) => event.id
      ? current.map((item) => item.id === event.id ? nextEvent : item)
      : [...current, nextEvent]);
    setEventDraft(null);
    setNotice(event.id ? '일정을 수정했어요.' : '일정을 추가했어요.');
  };
  const deleteEvent = (id) => {
    setEvents((current) => current.filter((event) => event.id !== id));
    setEventDraft(null);
    setNotice('일정을 삭제했어요.');
  };
  // 검색 결과를 누르면 해당 화면으로 가서 바로 연다.
  const openSearchResult = (result) => {
    setSearchOpen(false);
    const nonce = crypto.randomUUID();
    // 일정·할 일: 메인 캘린더를 그 날짜의 달로 옮기고 그날 목록을 연다. 꺼진 그룹이면 보이도록 켠다.
    const showDay = (date, trackId) => {
      setHiddenTracks((current) => current.filter((id) => id !== trackId));
      setCalendarFocus({ date, nonce });
      setPage('calendar');
      setAgendaDate(date);
    };
    const todoDay = result.type === 'todo' && (result.item.done ? result.item.doneAt && dateKey(new Date(result.item.doneAt)) : result.item.dueDate);
    if (result.type === 'event') {
      showDay(result.item.start, findTrack(tracks, result.item.track).id);
    } else if (todoDay) {
      showDay(todoDay, TODO_TRACK.id);
    } else if (result.type === 'todo') {
      setTodoFocus({ id: result.item.id, nonce });
      setPage('todos');
    } else if (result.type === 'memo') {
      // 메모: 할 일·메모 화면의 메모 기록 캘린더를 그 날짜로 열고, 메모장에서 그 메모도 연다.
      setTodoFocus({ memoDate: memoDate(result.item), nonce });
      setPage('todos');
      openMemo({ id: result.item.id });
    } else {
      setGrowthFocus({ date: result.type === 'diary' ? result.item.date : dateKey(new Date()), nonce });
      setPage('growth');
    }
  };
  const toggleTrack = (id) => setHiddenTracks((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  // '전체'는 모두 켜져 있으면 모두 끄고(원하는 그룹만 골라 켜기 쉽게), 하나라도 꺼져 있으면 모두 켠다.
  const toggleAllTracks = () => setHiddenTracks((current) => current.length ? [] : [...tracks.map((track) => track.id), ...SYSTEM_TRACKS.map((track) => track.id)]);
  const addTrack = (track) => {
    setTracks((current) => [...current, { ...track, id: crypto.randomUUID() }]);
    setNotice(`'${track.label}' 그룹을 추가했어요.`);
  };
  const updateTrack = (track) => {
    setTracks((current) => current.map((item) => item.id === track.id ? track : item));
    setNotice('그룹을 수정했어요.');
  };
  // 그룹을 지워도 일정은 남긴다: 남은 첫 번째 일반 그룹으로 옮긴다.
  const deleteTrack = (id) => {
    const fallback = tracks.find((track) => track.id !== id && !track.locked);
    if (!fallback) return;
    setTracks((current) => current.filter((track) => track.id !== id));
    setEvents((current) => current.map((event) => event.track === id ? { ...event, track: fallback.id } : event));
    setHiddenTracks((current) => current.filter((item) => item !== id));
    setNotice(`그룹을 삭제했어요. 일정은 '${fallback.label}'(으)로 옮겼어요.`);
  };
  // 완료 시각을 기록해 할 일 캘린더에서 완료한 날에 표시한다.
  // onDate: 지난 날짜 카드에서 체크하면 그 날짜에 완료한 것으로 기록한다.
  const toggleTodo = (id, onDate) => setTodos((current) => current.map((todo) => todo.id === id
    ? { ...todo, done: !todo.done, doneAt: todo.done ? null : moveToDate(new Date().toISOString(), onDate || dateKey(new Date())) }
    : todo));

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setPage('calendar'); }}>
          <span className="brand-mark"><CalendarDays size={20} strokeWidth={2.4} /></span>
          <span className="brand-name">Mo Do<span>.</span></span>
        </a>
        <nav className="primary-nav" aria-label="주 메뉴">
          <span className="nav-caption">MENU</span>
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-item ${page === id ? 'active' : ''}`} type="button" onClick={() => setPage(id)}>
              <Icon size={19} strokeWidth={1.9} /><span>{label}</span>
              {id === 'todos' && activeTodos.length > 0 && <span className="nav-count">{activeTodos.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="mini-upgrade">
            <div className="upgrade-icon"><Sparkles size={17} /></div>
            <strong>하루를 가볍게</strong>
            <p>흩어진 일정을 한곳에 모아보세요.</p>
            <button type="button" onClick={() => setPage('settings')}>Mo Do 알아보기 <ArrowRight size={14} /></button>
          </div>
          <button className="profile-button" type="button" onClick={() => setPage('settings')}>
            <span className="profile-avatar">김</span>
            <span className="profile-copy"><strong>나의 계정</strong><small>로컬에서 사용 중</small></span>
            <Ellipsis size={19} />
          </button>
        </div>
      </aside>

      <main id="main-content" className="main-area">
        <header className="mobile-header">
          <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setPage('calendar'); }}>
            <span className="brand-mark"><CalendarDays size={19} strokeWidth={2.4} /></span><span className="brand-name">Mo Do<span>.</span></span>
          </a>
          <div className="mobile-header-actions">
            <button className="icon-button" type="button" aria-label="검색" onClick={() => setSearchOpen(true)}><Search size={19} /></button>
            <button className={`icon-button ${memoOpen ? 'memo-active' : ''}`} type="button" aria-label="메모장" aria-pressed={memoOpen} onClick={toggleMemoPad}><StickyNote size={19} /></button>
            <button className="icon-button" type="button" aria-label="알림" onClick={() => setNotice('새로운 알림이 없어요.')}><Bell size={19} /></button>
          </div>
        </header>
        <div className="topbar">
          <div className="breadcrumb"><span>나의 캘린더</span><span className="breadcrumb-slash">/</span><strong>{NAV_ITEMS.find((item) => item.id === page)?.label}</strong></div>
          <div className="topbar-actions">
            <button className="search-box" type="button" aria-label="앱 검색 열기" onClick={() => setSearchOpen(true)}>
              <Search size={17} /><span>일정·할 일·메모 검색</span>
              <kbd>{IS_MAC ? '⌘ K' : 'Ctrl K'}</kbd>
            </button>
            <button className="icon-button topbar-bell" type="button" aria-label="알림" onClick={() => setNotice('새로운 알림이 없어요.')}><Bell size={19} /></button>
            <button className="avatar-button" aria-label="설정 열기" type="button" onClick={() => setPage('settings')}>김</button>
          </div>
        </div>
        {page === 'calendar' && (
          <CalendarPage
            key={calendarFocus?.nonce}
            initialDate={calendarFocus?.date}
            onFocusConsumed={consumeCalendarFocus}
            setNotice={setNotice}
            calendarRef={calendarRef}
            events={visibleEvents}
            todoItems={visibleTodos}
            tracks={tracks}
            hiddenTracks={hiddenTracks}
            trackCounts={trackCounts}
            toggleTrack={toggleTrack}
            toggleAllTracks={toggleAllTracks}
            openTrackManager={() => setTrackManagerOpen(true)}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            openNewEvent={openNewEvent}
            openExistingEvent={openExistingEvent}
            openDayAgenda={setAgendaDate}
            activeTodos={activeTodos}
            eventsToday={eventsToday}
            allEvents={events}
            allTodos={todos}
            upcomingEvents={upcomingEvents}
            activeCoupons={activeCoupons}
            setPage={setPage}
            toggleTodo={toggleTodo}
          />
        )}
        {page === 'todos' && <TodosPage key={todoFocus?.nonce} todos={todos} setTodos={setTodos} toggleTodo={toggleTodo} memos={memos} openMemo={openMemo} initialTodoId={todoFocus?.id} initialMemoDate={todoFocus?.memoDate} onFocusConsumed={consumeTodoFocus} setNotice={setNotice} />}
        {page === 'growth' && <GrowthPage key={growthFocus?.nonce} initialDate={growthFocus?.date} onFocusConsumed={consumeGrowthFocus} setNotice={setNotice} />}
        {page === 'coupons' && <CouponsPage events={events} setEvents={setEvents} openNewEvent={openNewEvent} setNotice={setNotice} />}
        {page === 'settings' && <SettingsPage theme={theme} setTheme={setTheme} setNotice={setNotice} />}
      </main>
      <nav className="mobile-nav" aria-label="모바일 주 메뉴">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" className={page === id ? 'active' : ''} onClick={() => setPage(id)}>
            <Icon size={20} strokeWidth={page === id ? 2.3 : 1.8} /><span>{label}</span>
          </button>
        ))}
      </nav>
      <button className={`memo-fab ${memoOpen ? 'active' : ''}`} type="button" aria-pressed={memoOpen} onClick={toggleMemoPad}>
        <StickyNote size={18} /><span>메모장</span>
      </button>
      {!THEMED_PAGES.includes(page) && <button className="floating-add" type="button" aria-label="새 일정 추가" onClick={() => openNewEvent()}>
        <Plus size={23} /><span>새 일정</span>
      </button>}
      {searchOpen && <SearchPalette events={events} todos={todos} memos={memos} tracks={tracks} onSelect={openSearchResult} onClose={() => setSearchOpen(false)} />}
      {memoOpen && <MemoPad key={memoTarget?.nonce ?? 'pad'} memos={memos} saveMemos={saveMemos} target={memoTarget} onClose={() => setMemoOpen(false)} setNotice={setNotice} />}
      {agendaDate && (
        <DayAgenda
          date={agendaDate}
          events={agendaEvents}
          todos={agendaTodos}
          tracks={tracks}
          onToggleTodo={toggleTodo}
          onAdd={() => openNewEvent(new Date(`${agendaDate}T00:00:00`))}
          onEdit={openExistingEvent}
          onDelete={deleteEvent}
          onClose={() => setAgendaDate(null)}
        />
      )}
      {trackManagerOpen && <TrackManager tracks={tracks} counts={Object.fromEntries(tracks.map((track) => [track.id, events.filter((event) => findTrack(tracks, event.track).id === track.id).length]))} onAdd={addTrack} onUpdate={updateTrack} onDelete={deleteTrack} onClose={() => setTrackManagerOpen(false)} />}
      {eventDraft && <EventDialog initial={eventDraft} tracks={tracks} onClose={() => setEventDraft(null)} onSave={saveEvent} onDelete={deleteEvent} />}
      {notice && <div className="toast" role="status"><Check size={16} />{notice}</div>}
    </div>
  );
}

function CalendarPage({ initialDate, onFocusConsumed, setNotice, calendarRef, events, todoItems, tracks, hiddenTracks, trackCounts, toggleTrack, toggleAllTracks, openTrackManager, allEvents, allTodos, selectedDate, setSelectedDate, openNewEvent, openExistingEvent, openDayAgenda, activeTodos, eventsToday, upcomingEvents, activeCoupons, setPage, toggleTodo }) {
  const [calendarView, setCalendarView] = useState('dayGridMonth');
  const [currentTitle, setCurrentTitle] = useState('');
  const [showSchedule, setShowSchedule] = useState(false);
  const [pickedDate, setPickedDate] = useState(initialDate || null);
  const todayKey = dateKey(new Date());
  // 검색에서 들어온 날짜는 한 번만 적용한다(다시 캘린더에 오면 오늘 기준).
  useEffect(() => {
    if (initialDate) onFocusConsumed();
  }, [initialDate, onFocusConsumed]);
  const dayKey = pickedDate || todayKey;
  const isToday = dayKey === todayKey;
  const dayLabel = formatDate(parseDateKey(dayKey), { month: 'long', day: 'numeric', weekday: 'short' });
  const dayEvents = isToday ? eventsToday : allEvents
    .filter((event) => occursOn(event, dayKey))
    .sort((a, b) => Number(b.allDay) - Number(a.allDay) || (a.startTime || '').localeCompare(b.startTime || ''));
  // 오늘은 남은 할 일 전체, 다른 날은 그날 마감이거나 그날 완료한 할 일
  const completeOnDay = (todo) => {
    if (todo.done || dayKey <= todayKey) return toggleTodo(todo.id, dayKey);
    toggleTodo(todo.id);
    return setNotice('아직 오지 않은 날이라 오늘 완료한 것으로 기록했어요.');
  };
  const dayTodos = isToday ? activeTodos : allTodos.filter((todo) => (todo.done ? todo.doneAt && dateKey(new Date(todo.doneAt)) === dayKey : todo.dueDate === dayKey));
  // 목록 보기는 일정이 있는 기간만 보여준다: 지금 기간이 비어 있으면 가까운 일정이 있는 기간으로 옮긴다.
  const eventDates = () => [...new Set(calendarEvents.map((event) => event.start.slice(0, 10)))].sort();
  const jumpTo = (api, key) => {
    api.gotoDate(key);
    setPickedDate(key);
    setCurrentTitle(api.view.title);
    setSelectedDate(api.getDate());
  };
  const changeView = (view) => {
    setCalendarView(view);
    const api = calendarRef.current?.getApi();
    api?.changeView(view);
    if (!api || view !== 'listWeek') return;
    const start = dateKey(api.view.activeStart);
    const end = dateKey(api.view.activeEnd);
    const dates = eventDates();
    if (dates.some((key) => key >= start && key < end)) return;
    const target = dates.find((key) => key >= end) || dates.findLast((key) => key < start);
    if (target) jumpTo(api, target);
  };
  const moveCalendar = (direction) => {
    const api = calendarRef.current?.getApi();
    if (api && calendarView === 'listWeek' && direction !== 'today') {
      const dates = eventDates();
      const target = direction === 'next'
        ? dates.find((key) => key >= dateKey(api.view.activeEnd))
        : dates.findLast((key) => key < dateKey(api.view.activeStart));
      if (target) jumpTo(api, target);
      else setNotice(direction === 'next' ? '이후에는 일정이 없어요.' : '이전에는 일정이 없어요.');
      return;
    }
    api?.[direction === 'today' ? 'today' : direction]();
    // 화살표로 이동하면 그 기간의 첫날(월 보기는 1일)을 선택한 날짜로 맞춘다.
    if (api && direction !== 'today') setPickedDate(dateKey(api.view.currentStart));
    if (api) {
      setCurrentTitle(api.view.title);
      setSelectedDate(api.getDate());
    }
  };
  // 날짜 숫자를 누르면 그날 목록을 열고, 칸의 빈 곳을 누르면 날짜만 선택한다(카드·표시만 바뀜).
  const selectDate = (info) => {
    setSelectedDate(info.date);
    setPickedDate(dateKey(info.date));
    if (info.jsEvent.target.closest('.fc-daygrid-day-number')) openDayAgenda(dateKey(info.date));
  };
  const openDayFromHeader = (date) => {
    setSelectedDate(date);
    setPickedDate(dateKey(date));
    openDayAgenda(dateKey(date));
  };
  const filterTracks = [...tracks, ...SYSTEM_TRACKS];
  const totalCount = filterTracks.reduce((sum, track) => sum + (hiddenTracks.includes(track.id) ? 0 : trackCounts[track.id] || 0), 0);
  // 칸 배경·글자는 그룹 색에서 섞어 만든다(라이트·다크 모드 모두 대비 유지).
  const tint = (color) => ({ backgroundColor: `color-mix(in srgb, ${color} 14%, var(--surface))`, borderColor: 'transparent', textColor: `color-mix(in srgb, ${color} 78%, var(--text))` });
  const calendarEvents = [
    // 필드를 골라 넘긴다: startTime·endTime·groupId는 FullCalendar 예약어라 그대로 넘기면 매일 반복 일정으로 해석된다.
    ...events.map((event) => ({
      id: event.id,
      title: event.title,
      allDay: event.allDay,
      start: event.allDay ? event.start : `${event.start}T${event.startTime || '09:00'}:00`,
      // 종일 일정의 end는 '다음 날 0시'(포함하지 않음)로 넘겨야 마지막 날까지 칠해진다.
      end: event.allDay ? (isMultiDay(event) ? addDays(eventEnd(event), 1) : undefined) : (event.endTime ? `${eventEnd(event)}T${event.endTime}:00` : undefined),
      ...tint(findTrack(tracks, event.track).color),
      extendedProps: { ...event, kind: 'event' },
    })),
    ...todoItems.map((todo) => ({
      id: `todo-${todo.id}`,
      title: todo.title,
      allDay: true,
      start: todo.done ? dateKey(new Date(todo.doneAt)) : todo.dueDate,
      ...tint(TODO_TRACK.color),
      classNames: [todo.done ? 'todo-done' : 'todo-due'],
      extendedProps: { kind: 'todo', done: todo.done },
    })),
  ];

  return (
    <div className="page-content calendar-page">
      <section className="welcome-row compact-welcome">
        <div>
          <div className="eyebrow"><span className="eyebrow-dot" /> {formatDate(new Date(), { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}</div>
        </div>
        <button className="button button-primary new-event-button" type="button" onClick={() => openNewEvent()}><Plus size={17} />새 일정</button>
      </section>
      <section className="summary-grid compact-summary" aria-label="오늘의 요약">
        <SummaryCard icon={CalendarDays} label="오늘 일정" value={eventsToday.length} tone="blue" />
        <SummaryCard icon={CheckCheck} label="남은 할 일" value={activeTodos.length} tone="green" />
        <SummaryCard icon={Gift} label="쿠폰" value={activeCoupons.length} tone="orange" />
      </section>

      <section className="content-grid">
        <div className="calendar-card surface-card">
          <div className="calendar-heading">
            <div className="calendar-title-area">
              <h2>{currentTitle || formatDate(selectedDate, { year: 'numeric', month: 'long' })}</h2>
              <div className="calendar-controls">
                <button className="icon-button compact" type="button" aria-label="이전 기간" onClick={() => moveCalendar('prev')}><ArrowLeft size={17} /></button>
                <button className={`today-button ${pickedDate && pickedDate !== todayKey ? 'picked' : ''}`} type="button" aria-label={pickedDate && pickedDate !== todayKey ? '오늘로 돌아가기' : '오늘'} onClick={() => { setPickedDate(null); moveCalendar('today'); }}>
                  {pickedDate && pickedDate !== todayKey ? formatDate(parseDateKey(pickedDate), { day: 'numeric', weekday: 'short' }) : '오늘'}
                </button>
                <button className="icon-button compact" type="button" aria-label="다음 기간" onClick={() => moveCalendar('next')}><ArrowRight size={17} /></button>
              </div>
            </div>
            <div className="view-switcher" role="group" aria-label="캘린더 보기">
              {[['dayGridMonth', '월'], ['timeGridWeek', '주'], ['timeGridDay', '일'], ['listWeek', '목록']].map(([view, label]) => (
                <button key={view} type="button" className={calendarView === view ? 'selected' : ''} aria-pressed={calendarView === view} onClick={() => changeView(view)}>{label}</button>
              ))}
            </div>
          </div>
          <div className="track-switcher" role="group" aria-label="표시할 그룹 선택">
            <button type="button" className={`track-filter all ${hiddenTracks.length ? '' : 'selected'}`} aria-pressed={!hiddenTracks.length} onClick={toggleAllTracks}>
              <CalendarDays size={14} /><span>전체</span><span className="track-count">{totalCount}</span>
            </button>
            {filterTracks.map((track) => {
              const shown = !hiddenTracks.includes(track.id);
              return (
                <button key={track.id} type="button" className={`track-filter ${shown ? 'selected' : ''}`} style={trackStyle(track.color)} aria-pressed={shown} onClick={() => toggleTrack(track.id)}>
                  <TrackIcon id={track.id} size={14} /><span>{track.label}</span><span className="track-count">{trackCounts[track.id] || 0}</span>
                </button>
              );
            })}
            <button type="button" className="icon-button compact track-settings" aria-label="캘린더 그룹 설정" onClick={openTrackManager}><Settings size={16} /></button>
          </div>
          <div className="calendar-wrap">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              initialDate={initialDate || new Date()}
              locale="ko"
              firstDay={0}
              height="auto"
              headerToolbar={false}
              listDayFormat={(arg) => `${arg.date.month + 1}.${arg.date.day}(${WEEKDAYS[arg.date.marker.getUTCDay()]})`}
              listDaySideFormat={false}
              allDayText="종일"
              noEventsContent="이 기간에는 일정이 없어요"
              dayMaxEvents={2}
              moreLinkContent={(arg) => `+${arg.num}개`}
              eventDisplay="block"
              events={calendarEvents}
              dateClick={selectDate}
              // 주·일 보기는 칸에 날짜 숫자가 없으므로 위쪽 날짜 머리글을 눌러 그날 목록을 연다.
              dayHeaderContent={(arg) => (arg.view.type.startsWith('timeGrid')
                ? <button type="button" className="day-header-button" onClick={() => openDayFromHeader(arg.date)}>{arg.date.getMonth() + 1}.{arg.date.getDate()} ({WEEKDAYS[arg.date.getDay()]})</button>
                : arg.text)}
              dayCellClassNames={(arg) => (pickedDate && pickedDate !== todayKey && dateKey(arg.date) === pickedDate ? ['picked-day'] : [])}
              eventClick={(info) => {
                // 할 일은 그 날짜의 목록을 열어 한 일을 함께 보여준다.
                if (info.event.extendedProps.kind === 'todo') openDayAgenda(dateKey(info.event.start));
                else openExistingEvent(info.event);
              }}
              datesSet={(info) => {
                setCurrentTitle(info.view.title);
                setSelectedDate(info.view.calendar.getDate());
              }}
              eventContent={(arg) => (
                <div className="calendar-event-content">
                  {arg.event.extendedProps.kind === 'todo' && (arg.event.extendedProps.done ? <Check size={10} strokeWidth={3} /> : <span className="todo-dot" />)}
                  <span className="event-name">{arg.event.title}</span>
                </div>
              )}
            />
          </div>
        </div>

        <aside className="right-column">
          <section className="side-card surface-card today-card">
            <div className="side-card-heading"><div><span className="side-label">{isToday ? 'YOUR DAY' : 'SELECTED DAY'}</span><h2>{isToday ? '오늘의 하루' : `${dayLabel}의 하루`}</h2></div><span className="today-date">{formatDate(parseDateKey(dayKey), { month: 'short', day: 'numeric' })}</span></div>
            {dayEvents.length ? (
              <div className="today-timeline">
                {dayEvents.slice(0, showSchedule ? undefined : 3).map((event) => <MiniEvent key={event.id} event={event} track={findTrack(tracks, event.track)} onOpen={openExistingEvent} />)}
              </div>
            ) : (
              <div className="quiet-state"><span className="quiet-icon"><Coffee size={18} /></span><div><strong>{isToday ? '아직 일정이 없어요' : '이날은 일정이 없어요'}</strong><p>{isToday ? '여유로운 하루를 즐겨보세요!' : '캘린더에서 다른 날짜를 눌러 보세요.'}</p></div></div>
            )}
            {dayEvents.length > 3 && (
              <button className="text-link" type="button" onClick={() => setShowSchedule((current) => !current)}>
                {showSchedule ? '접기' : `${dayEvents.length - 3}개 더 보기`} <ArrowRight size={14} />
              </button>
            )}
            {!isToday && <button className="text-link" type="button" onClick={() => { setPickedDate(null); setShowSchedule(false); }}>오늘로 돌아가기 <ArrowRight size={14} /></button>}
          </section>

          <section className="side-card surface-card upcoming-card">
            <div className="side-card-heading"><div><span className="side-label">COMING UP</span><h2>다가오는 일정</h2></div><button className="icon-button compact" aria-label="캘린더 페이지로" type="button" onClick={() => setPage('calendar')}><Ellipsis size={18} /></button></div>
            <div className="upcoming-list">
              {upcomingEvents.length ? upcomingEvents.map((event) => <UpcomingEvent key={event.id} event={event} track={findTrack(tracks, event.track)} onOpen={openExistingEvent} />) : <p className="subtle-empty">다가오는 일정이 없습니다.</p>}
            </div>
          </section>

          <section className="side-card surface-card quick-todo-card">
            <div className="side-card-heading"><div><span className="side-label">{isToday ? 'QUICK TASKS' : 'TASKS'}</span><h2>{isToday ? '빠른 할 일' : `${dayLabel} 할 일`}</h2></div><button className="icon-button compact" aria-label="할 일 모두 보기" type="button" onClick={() => setPage('todos')}><ArrowRight size={16} /></button></div>
            <div className="quick-todo-list">
              {dayTodos.slice(0, 5).map((todo) => (
                <button key={todo.id} className={`quick-todo ${todo.done ? 'done' : ''}`} type="button" aria-label={todo.done ? `${todo.title} 완료 취소` : `${todo.title} 완료 처리`} onClick={() => completeOnDay(todo)}>
                  <span className="todo-checkbox" aria-hidden="true"><Check size={13} strokeWidth={3} /></span>
                  <span className="quick-todo-copy">
                    <strong>{todo.title}</strong>
                    {todo.done && todo.doneAt && <small>{formatDate(new Date(todo.doneAt), { hour: 'numeric', minute: '2-digit' })} 완료</small>}
                    {!todo.done && todo.dueDate && <small className={todo.dueDate < todayKey ? 'overdue' : ''}>{todo.dueDate === todayKey ? '오늘 마감' : `${formatDate(parseDateKey(todo.dueDate), { month: 'long', day: 'numeric' })} 마감`}</small>}
                  </span>
                </button>
              ))}
              {dayTodos.length > 5 && <button className="subtle-empty quick-todo-more" type="button" onClick={() => setPage('todos')}>외 {dayTodos.length - 5}개 더 보기</button>}
              {!dayTodos.length && <p className="subtle-empty">{isToday ? '남은 할 일이 없어요. 잘했어요!' : '이날은 할 일이 없어요.'}</p>}
            </div>
            <button className="add-quick-task" type="button" onClick={() => setPage('todos')}><Plus size={15} />할 일 추가하기</button>
          </section>
        </aside>
      </section>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, tone }) {
  return <article className="summary-card surface-card compact"><span className={`summary-icon ${tone}`}><Icon size={15} /></span><span className="summary-label">{label}</span><strong className="summary-value">{value}</strong></article>;
}

function MiniEvent({ event, track, onOpen }) {
  return <button type="button" className="mini-event" style={trackStyle(track.color)} onClick={() => onOpen(event)}><span className="mini-event-time">{event.allDay ? '종일' : event.startTime || '09:00'}</span><span className="mini-event-dot" /><span className="mini-event-copy"><strong>{event.title}</strong>{(isMultiDay(event) || event.location) && <small>{[isMultiDay(event) && rangeLabel(event), event.location].filter(Boolean).join(' · ')}</small>}</span></button>;
}

function UpcomingEvent({ event, track, onOpen }) {
  const date = new Date(`${event.start}T00:00:00`);
  const weekday = new Intl.DateTimeFormat('ko-KR', { weekday: 'short' }).format(date);
  return <button type="button" className="upcoming-item" style={trackStyle(track.color)} onClick={() => onOpen(event)}><span className="upcoming-date"><strong>{date.getDate()}</strong><span>{weekday}</span></span><span className="upcoming-copy"><strong>{event.title}</strong><span>{track.label}{isMultiDay(event) ? ` · ${rangeLabel(event)}` : ''}{event.allDay ? ' · 종일' : ` · ${event.startTime || '09:00'}`}</span></span><span className="track-indicator" /></button>;
}

function EventDialog({ initial, tracks, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.title.trim()) {
      setError('일정 제목을 입력해 주세요.');
      return;
    }
    if (form.endDate && form.endDate < form.start) {
      setError('종료일은 시작일과 같거나 늦어야 해요.');
      return;
    }
    // 하루 일정만 시간 순서를 확인한다(기간 일정은 다른 날에 끝나므로).
    if (!form.allDay && eventEnd(form) === form.start && form.endTime <= form.startTime) {
      setError('종료 시간은 시작 시간보다 늦어야 해요.');
      return;
    }
    onSave(form);
  };
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="event-dialog" role="dialog" aria-modal="true" aria-labelledby="event-dialog-title">
        <div className="dialog-heading"><div><span className="side-label">{form.id ? 'EDIT EVENT' : 'NEW EVENT'}</span><h2 id="event-dialog-title">{form.id ? '일정 수정하기' : '새 일정 만들기'}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="창 닫기"><X size={19} /></button></div>
        <form onSubmit={handleSubmit}>
          <label className="field-label" htmlFor="event-title">일정 이름</label>
          <input id="event-title" className="text-input event-title-input" value={form.title} onChange={(event) => update('title', event.target.value)} placeholder="무엇을 할 예정인가요?" autoFocus maxLength={200} />
          <label className="field-label">어느 그룹에 넣을까요?</label>
          <div className="track-choice wrap" role="group" aria-label="그룹 선택">
            {tracks.map((track) => {
              const selected = findTrack(tracks, form.track).id === track.id;
              return <button key={track.id} type="button" className={`track-choice-button colored ${selected ? 'selected' : ''}`} style={trackStyle(track.color)} aria-pressed={selected} onClick={() => update('track', track.id)}><TrackIcon id={track.id} size={15} />{track.label}</button>;
            })}
          </div>
          <div className="time-fields">
            <label><span className="field-label">시작일</span><DatePicker id="event-date" value={form.start} onChange={(start) => setForm((current) => ({ ...current, start, endDate: !current.endDate || current.endDate < start ? start : current.endDate }))} ariaLabel="시작일" /></label>
            <label><span className="field-label">종료일</span><DatePicker id="event-end-date" value={form.endDate || form.start} min={form.start} onChange={(value) => update('endDate', value)} ariaLabel="종료일" /></label>
          </div>
          {isMultiDay(form) && <p className="dialog-help">{rangeLabel(form)} · {Math.round((parseDateKey(eventEnd(form)) - parseDateKey(form.start)) / 86400000) + 1}일 동안의 일정이에요.</p>}
          <label className="all-day-toggle"><input type="checkbox" checked={form.allDay} onChange={(event) => update('allDay', event.target.checked)} /><span>종일 일정</span></label>
          {!form.allDay && <div className="time-fields"><label><span className="field-label">시작 시간</span><input className="text-input" type="time" value={form.startTime} onChange={(event) => update('startTime', event.target.value)} /></label><label><span className="field-label">종료 시간</span><input className="text-input" type="time" value={form.endTime} onChange={(event) => update('endTime', event.target.value)} /></label></div>}
          <label className="field-label" htmlFor="event-location">장소 <span className="optional-label">선택</span></label>
          <input id="event-location" className="text-input" value={form.location} onChange={(event) => update('location', event.target.value)} placeholder="장소를 입력해 주세요" maxLength={200} />
          <label className="field-label" htmlFor="event-memo">메모 <span className="optional-label">선택</span></label>
          <textarea id="event-memo" className="text-input memo-input" value={form.memo} onChange={(event) => update('memo', event.target.value)} placeholder="기억할 내용을 적어두세요" rows={3} />
          <label className="field-label" htmlFor="event-reminder"><AlarmClock size={15} /> 알림</label>
          <select id="event-reminder" className="text-input" value={form.reminder} onChange={(event) => update('reminder', event.target.value)}>
            <option value="0">알림 없음</option><option value="10">10분 전</option><option value="60">1시간 전</option><option value="1440">1일 전</option>
          </select>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="dialog-actions">
            {form.id && <button className="button button-danger-quiet" type="button" onClick={() => (confirmDelete ? onDelete(form.id) : setConfirmDelete(true))}><Trash2 size={16} />{confirmDelete ? '한 번 더 누르면 삭제' : '삭제'}</button>}
            <span className="dialog-spacer" />
            <button className="button button-quiet" type="button" onClick={onClose}>취소</button>
            <button className="button button-primary" type="submit">{form.id ? '변경 저장' : '일정 추가'}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function CouponsPage({ events, setEvents, openNewEvent, setNotice }) {
  const [filter, setFilter] = useState('active');
  const [showForm, setShowForm] = useState(false);
  const [product, setProduct] = useState('');
  const [brand, setBrand] = useState('');
  const [expires, setExpires] = useState('');
  const coupons = events.filter((event) => event.track === 'coupon');
  const categorized = coupons.filter((event) => filter === 'used' ? event.used : filter === 'expired' ? event.start < dateKey(new Date()) && !event.used : !event.used && event.start >= dateKey(new Date()));
  const addCoupon = (event) => {
    event.preventDefault();
    if (!product.trim()) return;
    if (!expires) {
      setNotice('유효기간을 골라 주세요.');
      return;
    }
    setEvents((current) => [...current, { id: crypto.randomUUID(), title: `${brand.trim() ? `${brand.trim()} ` : ''}${product.trim()}`, start: expires, allDay: true, track: 'coupon', brand: brand.trim(), used: false }]);
    setProduct('');
    setBrand('');
    setExpires('');
    setShowForm(false);
    setNotice('쿠폰을 등록했어요.');
  };
  const markUsed = (id) => setEvents((current) => current.map((event) => event.id === id ? { ...event, used: true } : event));
  const deleteCoupon = (id) => {
    setEvents((current) => current.filter((event) => event.id !== id));
    setNotice('쿠폰을 삭제했어요.');
  };
  return (
    <div className="page-content secondary-page">
      <section className="welcome-row secondary-welcome"><div><div className="eyebrow"><span className="eyebrow-dot orange" /> LITTLE TREATS, ON TIME</div><h1>쿠폰도 잊지 않게 모아둘게요.</h1><p className="page-subtitle">유효기간이 지나기 전에 알차게 사용해요.</p></div><button className="button button-primary" type="button" onClick={() => setShowForm((current) => !current)}><Plus size={17} />쿠폰 등록</button></section>
      <div className="coupon-banner"><span className="coupon-banner-icon"><Gift size={22} /></span><div><strong>작은 선물, 놓치지 않게</strong><p>쿠폰을 등록하면 캘린더에서 만료일을 확인할 수 있어요.</p></div><Sparkles className="coupon-sparkle" size={24} /></div>
      {showForm && <form className="coupon-form surface-card" onSubmit={addCoupon}><div className="coupon-form-heading"><div><span className="side-label">NEW COUPON</span><h2>쿠폰 정보 입력</h2></div><button type="button" className="icon-button" aria-label="닫기" onClick={() => setShowForm(false)}><X size={18} /></button></div><p className="coupon-manual-note"><Sparkles size={14} /> 사진 인식은 서버 연결 후 사용할 수 있어요. 지금은 직접 입력해 주세요.</p><div className="coupon-fields"><label><span>브랜드</span><input className="text-input" value={brand} onChange={(event) => setBrand(event.target.value)} placeholder="예: 스타벅스" maxLength={100} /></label><label><span>상품명 <b>*</b></span><input className="text-input" value={product} onChange={(event) => setProduct(event.target.value)} placeholder="예: 아메리카노" maxLength={200} required /></label><label><span>유효기간 <b>*</b></span><DatePicker value={expires} onChange={setExpires} placeholder="유효기간 선택" ariaLabel="유효기간" /></label></div><div className="coupon-form-actions"><button className="button button-quiet" type="button" onClick={() => setShowForm(false)}>취소</button><button className="button button-primary" type="submit">쿠폰 저장</button></div></form>}
      <section className="coupon-library surface-card">
        <div className="coupon-library-heading"><div><h2>나의 쿠폰함</h2><span>쿠폰을 한곳에 모아 관리해요</span></div><span className="coupon-total">{coupons.length}장</span></div>
        <div className="simple-tabs coupon-tabs" role="group" aria-label="쿠폰 상태 필터">{[['active', '사용 가능'], ['used', '사용 완료'], ['expired', '기간 만료']].map(([id, label]) => <button key={id} type="button" className={filter === id ? 'selected' : ''} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}<span>{coupons.filter((coupon) => id === 'active' ? !coupon.used && coupon.start >= dateKey(new Date()) : id === 'used' ? coupon.used : !coupon.used && coupon.start < dateKey(new Date())).length}</span></button>)}</div>
        {categorized.length ? <div className="coupon-list">{categorized.sort((a, b) => a.start.localeCompare(b.start)).map((coupon) => {
          const daysLeft = Math.round((new Date(`${coupon.start}T00:00:00`) - new Date(`${dateKey(new Date())}T00:00:00`)) / 86400000);
          return <article key={coupon.id} className="coupon-card"><div className="coupon-card-art"><Gift size={24} /><span>GIFT</span></div><div className="coupon-card-info"><span className="coupon-brand">{coupon.brand || '쿠폰'}</span><strong>{coupon.title}</strong><span className="coupon-expiry">유효기간 {formatDate(new Date(`${coupon.start}T00:00:00`), { year: 'numeric', month: 'long', day: 'numeric' })}까지</span></div><span className={`dday-badge ${daysLeft <= 3 ? 'urgent' : ''}`}>{daysLeft === 0 ? '오늘 만료' : `D-${daysLeft}`}</span><div className="coupon-card-actions">{filter === 'active' && <button className="button button-quiet" type="button" onClick={() => markUsed(coupon.id)}><Check size={15} />사용 완료</button>}<button className="icon-button compact" type="button" aria-label={`${coupon.title} 삭제`} onClick={() => deleteCoupon(coupon.id)}><Trash2 size={15} /></button></div></article>;
        })}</div> : <div className="empty-state coupon-empty"><span><Tag size={22} /></span><strong>{filter === 'active' ? '아직 등록된 쿠폰이 없어요' : '여기에 표시할 쿠폰이 없어요'}</strong><p>쿠폰 등록 버튼으로 첫 쿠폰을 모아보세요.</p>{filter === 'active' && <button className="button button-primary" type="button" onClick={() => setShowForm(true)}><Plus size={15} />쿠폰 등록하기</button>}</div>}
      </section>
      {coupons.length === 0 && <button className="visually-hidden" type="button" onClick={() => openNewEvent(new Date(), 'coupon')}>새 쿠폰 일정 추가</button>}
    </div>
  );
}

function SettingsPage({ theme, setTheme, setNotice }) {
  const [notifications, setNotifications] = useState(false);
  return (
    <div className="page-content secondary-page">
      <section className="welcome-row secondary-welcome"><div><div className="eyebrow"><span className="eyebrow-dot" /> MAKE IT YOURS</div><h1>나에게 맞게 설정해요.</h1><p className="page-subtitle">Mo Do를 더 편안하게 사용할 수 있어요.</p></div><span className="page-hero-icon"><Settings size={24} /></span></section>
      <section className="settings-panel surface-card">
        <div className="settings-section-heading"><h2>화면 설정</h2><p>Mo Do의 화면을 취향에 맞게 바꿔보세요.</p></div>
        <div className="setting-row"><span className="setting-icon"><Moon size={18} /></span><div className="setting-copy"><strong>화면 테마</strong><span>원하는 화면 모드를 선택해요.</span></div><div className="theme-options" role="group" aria-label="화면 테마">{[['light', '라이트', Sun], ['dark', '다크', Moon]].map(([value, label, Icon]) => <button key={value} type="button" className={theme === value ? 'selected' : ''} aria-pressed={theme === value} onClick={() => setTheme(value)}><Icon size={15} />{label}</button>)}</div></div>
        <div className="settings-section-heading separated"><h2>알림</h2><p>중요한 일정을 제때 확인해요.</p></div>
        <div className="setting-row"><span className="setting-icon green"><Bell size={18} /></span><div className="setting-copy"><strong>브라우저 알림</strong><span>이 브라우저에서 알림을 허용해요.</span></div><button className={`toggle-switch ${notifications ? 'on' : ''}`} type="button" role="switch" aria-checked={notifications} onClick={() => {
          if (!('Notification' in window)) {
            setNotice('이 브라우저는 알림을 지원하지 않아요.');
            return;
          }
          if (Notification.permission === 'granted') {
            setNotifications((value) => !value);
          } else {
            Notification.requestPermission().then((permission) => {
              setNotifications(permission === 'granted');
              setNotice(permission === 'granted' ? '알림을 허용했어요.' : '브라우저 설정에서 알림을 허용해 주세요.');
            }).catch((error) => {
              console.error('알림 권한을 요청하지 못했습니다.', error);
              setNotice('알림 권한을 요청하지 못했어요.');
            });
          }
        }}><span /></button></div>
        <div className="setting-row"><span className="setting-icon orange"><ArrowDown size={18} /></span><div className="setting-copy"><strong>앱 설치</strong><span>홈 화면에 추가하면 더 편리하게 사용할 수 있어요.</span></div><button className="button button-quiet install-button" type="button" onClick={() => setNotice('브라우저 메뉴에서 “홈 화면에 추가”를 선택해 주세요.')}>설치 방법 <ArrowRight size={14} /></button></div>
        <div className="settings-section-heading separated"><h2>데이터와 계정</h2><p>현재 버전의 저장 방식을 확인해요.</p></div>
        <div className="local-data-notice"><span><CircleHelp size={17} /></span><div><strong>이 기기에만 저장 중이에요</strong><p>일정·할 일·쿠폰은 이 브라우저의 저장 공간에 보관됩니다. 다른 기기와 동기화하거나 팀과 공유하려면 서버 연동이 필요합니다.</p></div></div>
      </section>
    </div>
  );
}

export default App;
