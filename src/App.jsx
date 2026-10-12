import { useEffect, useMemo, useRef, useState } from 'react';
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
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronDown,
  CircleHelp,
  Clock3,
  Coffee,
  Ellipsis,
  Gift,
  ListTodo,
  Moon,
  Plus,
  Search,
  Settings,
  Sparkles,
  Sun,
  Tag,
  Trash2,
  X,
} from 'lucide-react';

const TRACKS = {
  work: { label: '회사', icon: BriefcaseBusiness, color: '#5977ed', className: 'work' },
  personal: { label: '개인', icon: Sun, color: '#4ba77a', className: 'personal' },
  coupon: { label: '쿠폰', icon: Gift, color: '#ed9a53', className: 'coupon' },
};
const NAV_ITEMS = [
  { id: 'calendar', label: '캘린더', icon: CalendarDays },
  { id: 'todos', label: '할 일', icon: ListTodo },
  { id: 'coupons', label: '쿠폰함', icon: Gift },
  { id: 'settings', label: '설정', icon: Settings },
];
const TRACK_FILTERS = ['all', 'work', 'personal', 'coupon'];
const STORAGE = {
  events: 'moa-calendar-events',
  todos: 'moa-calendar-todos',
  theme: 'moa-calendar-theme',
};

const dateKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};
const readStorage = (key, fallback) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    console.error(`저장된 데이터(${key})를 읽을 수 없습니다.`, error);
    return fallback;
  }
};
const formatDate = (date, options = { month: 'long', day: 'numeric', weekday: 'short' }) =>
  new Intl.DateTimeFormat('ko-KR', options).format(date);

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
  const [trackFilter, setTrackFilter] = useState('all');
  const [events, setEvents] = useState(() => readStorage(STORAGE.events, seedEvents()));
  const [todos, setTodos] = useState(() => readStorage(STORAGE.todos, [
    { id: 'todo-1', title: '주간 회의 자료 정리하기', dueDate: dateKey(new Date()), done: false, priority: 1 },
    { id: 'todo-2', title: '운동화 세탁 맡기기', dueDate: '', done: false, priority: 2 },
    { id: 'todo-3', title: '엄마 생신 선물 고르기', dueDate: dateKey(new Date(Date.now() + 86400000 * 2)), done: true, priority: 2 },
  ]));
  const [theme, setTheme] = useState(() => readStorage(STORAGE.theme, 'light'));
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [eventDraft, setEventDraft] = useState(null);
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');
  const calendarRef = useRef(null);

  useEffect(() => localStorage.setItem(STORAGE.events, JSON.stringify(events)), [events]);
  useEffect(() => localStorage.setItem(STORAGE.todos, JSON.stringify(todos)), [todos]);
  useEffect(() => {
    localStorage.setItem(STORAGE.theme, JSON.stringify(theme));
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(() => {
    if (!notice) return undefined;
    const timeout = window.setTimeout(() => setNotice(''), 2600);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const visibleEvents = useMemo(() => events
    .filter((event) => trackFilter === 'all' || event.track === trackFilter)
    .filter((event) => !search || event.title.toLocaleLowerCase('ko').includes(search.toLocaleLowerCase('ko'))), [events, trackFilter, search]);
  const activeTodos = todos.filter((todo) => !todo.done);
  const activeCoupons = events.filter((event) => event.track === 'coupon' && event.start >= dateKey(new Date()));
  const eventsToday = events.filter((event) => event.start === dateKey(new Date()));
  const upcomingEvents = [...events].filter((event) => event.start >= dateKey(new Date())).sort((a, b) => a.start.localeCompare(b.start)).slice(0, 4);

  const openNewEvent = (date = selectedDate, track = trackFilter === 'all' ? 'personal' : trackFilter) => {
    setEventDraft({
      id: '',
      title: '',
      start: dateKey(date),
      allDay: false,
      track: track === 'all' ? 'personal' : track,
      startTime: '09:00',
      endTime: '10:00',
      location: '',
      memo: '',
      reminder: '10',
    });
  };
  const openExistingEvent = (event) => {
    const start = event.start instanceof Date ? event.start : new Date(`${event.start}T00:00:00`);
    const end = event.end instanceof Date ? event.end : null;
    setEventDraft({
      id: event.id,
      title: event.title,
      start: dateKey(start),
      allDay: event.allDay,
      track: event.extendedProps?.track || event.track,
      startTime: event.extendedProps?.startTime || event.startTime || '09:00',
      endTime: event.extendedProps?.endTime || event.endTime || '10:00',
      location: event.extendedProps?.location || event.location || '',
      memo: event.extendedProps?.memo || event.memo || '',
      reminder: event.extendedProps?.reminder || event.reminder || '10',
      end: end ? dateKey(end) : undefined,
    });
  };
  const saveEvent = (event) => {
    if (!event.title.trim()) return;
    const nextEvent = { ...event, title: event.title.trim(), id: event.id || crypto.randomUUID() };
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
  const addTodo = (title) => {
    setTodos((current) => [...current, { id: crypto.randomUUID(), title: title.trim(), dueDate: '', done: false, priority: 2 }]);
    setNotice('할 일을 추가했어요.');
  };
  const toggleTodo = (id) => setTodos((current) => current.map((todo) => todo.id === id ? { ...todo, done: !todo.done } : todo));
  const removeTodo = (id) => {
    setTodos((current) => current.filter((todo) => todo.id !== id));
    setNotice('할 일을 삭제했어요.');
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setPage('calendar'); }}>
          <span className="brand-mark"><CalendarDays size={20} strokeWidth={2.4} /></span>
          <span className="brand-name">모아<span>.</span></span>
        </a>
        <button className="workspace-switcher" type="button" onClick={() => setNotice('워크스페이스 공유는 서버 연결 후 사용할 수 있어요.')}>
          <span className="workspace-avatar">나</span>
          <span className="workspace-copy"><strong>나의 캘린더</strong><small>개인 워크스페이스</small></span>
          <ChevronDown size={16} />
        </button>
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
            <button type="button" onClick={() => setPage('settings')}>모아 알아보기 <ArrowRight size={14} /></button>
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
            <span className="brand-mark"><CalendarDays size={19} strokeWidth={2.4} /></span><span className="brand-name">모아<span>.</span></span>
          </a>
          <button className="icon-button" type="button" aria-label="알림" onClick={() => setNotice('새로운 알림이 없어요.')}><Bell size={19} /></button>
        </header>
        <div className="topbar">
          <div className="breadcrumb"><span>나의 캘린더</span><span className="breadcrumb-slash">/</span><strong>{NAV_ITEMS.find((item) => item.id === page)?.label}</strong></div>
          <div className="topbar-actions">
            <label className="search-box">
              <Search size={17} /><input aria-label="일정 검색" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="일정 검색" />
              <kbd>⌘ K</kbd>
            </label>
            <button className="icon-button topbar-bell" type="button" aria-label="알림" onClick={() => setNotice('새로운 알림이 없어요.')}><Bell size={19} /></button>
            <button className="avatar-button" aria-label="설정 열기" type="button" onClick={() => setPage('settings')}>김</button>
          </div>
        </div>
        {page === 'calendar' && (
          <CalendarPage
            calendarRef={calendarRef}
            events={visibleEvents}
            trackFilter={trackFilter}
            setTrackFilter={setTrackFilter}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            openNewEvent={openNewEvent}
            openExistingEvent={openExistingEvent}
            activeTodos={activeTodos}
            eventsToday={eventsToday}
            upcomingEvents={upcomingEvents}
            activeCoupons={activeCoupons}
            setPage={setPage}
            toggleTodo={toggleTodo}
          />
        )}
        {page === 'todos' && <TodosPage todos={todos} addTodo={addTodo} toggleTodo={toggleTodo} removeTodo={removeTodo} />}
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
      <button className="floating-add" type="button" aria-label="새 일정 추가" onClick={() => openNewEvent()}>
        <Plus size={23} /><span>새 일정</span>
      </button>
      {eventDraft && <EventDialog initial={eventDraft} onClose={() => setEventDraft(null)} onSave={saveEvent} onDelete={deleteEvent} />}
      {notice && <div className="toast" role="status"><Check size={16} />{notice}</div>}
    </div>
  );
}

function CalendarPage({ calendarRef, events, trackFilter, setTrackFilter, selectedDate, setSelectedDate, openNewEvent, openExistingEvent, activeTodos, eventsToday, upcomingEvents, activeCoupons, setPage, toggleTodo }) {
  const [calendarView, setCalendarView] = useState('dayGridMonth');
  const [currentTitle, setCurrentTitle] = useState('');
  const [showSchedule, setShowSchedule] = useState(false);
  const changeView = (view) => {
    setCalendarView(view);
    calendarRef.current?.getApi().changeView(view);
  };
  const moveCalendar = (direction) => {
    const api = calendarRef.current?.getApi();
    api?.[direction === 'today' ? 'today' : direction]();
    if (api) {
      setCurrentTitle(api.view.title);
      setSelectedDate(api.getDate());
    }
  };
  const selectDate = (info) => {
    const selected = new Date(`${info.dateStr}T00:00:00`);
    setSelectedDate(selected);
    openNewEvent(selected);
  };
  const eventsByTrack = {
    all: events.length,
    work: events.filter((event) => event.track === 'work').length,
    personal: events.filter((event) => event.track === 'personal').length,
    coupon: events.filter((event) => event.track === 'coupon').length,
  };

  return (
    <div className="page-content calendar-page">
      <section className="welcome-row">
        <div>
          <div className="eyebrow"><span className="eyebrow-dot" /> {formatDate(new Date(), { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}</div>
          <h1>안녕하세요, 오늘도 모아볼까요?</h1>
          <p className="page-subtitle">일정과 할 일을 한눈에 확인해 보세요.</p>
        </div>
        <button className="button button-primary new-event-button" type="button" onClick={() => openNewEvent()}><Plus size={17} />새 일정</button>
      </section>
      <section className="summary-grid" aria-label="오늘의 요약">
        <SummaryCard icon={CalendarDays} label="오늘의 일정" value={`${eventsToday.length}개`} detail={eventsToday.length ? '오늘 예정된 일정이 있어요' : '오늘은 여유로운 하루예요'} tone="blue" />
        <SummaryCard icon={CheckCheck} label="남은 할 일" value={`${activeTodos.length}개`} detail={activeTodos.length ? '하나씩 차근차근 해봐요' : '모든 할 일을 마쳤어요'} tone="green" />
        <SummaryCard icon={Gift} label="사용 가능한 쿠폰" value={`${activeCoupons.length}개`} detail={activeCoupons.length ? '놓치지 않도록 챙겨봐요' : '등록된 쿠폰이 없어요'} tone="orange" />
      </section>

      <section className="content-grid">
        <div className="calendar-card surface-card">
          <div className="calendar-heading">
            <div className="calendar-title-area">
              <h2>{currentTitle || formatDate(selectedDate, { year: 'numeric', month: 'long' })}</h2>
              <div className="calendar-controls">
                <button className="icon-button compact" type="button" aria-label="이전 기간" onClick={() => moveCalendar('prev')}><ArrowLeft size={17} /></button>
                <button className="today-button" type="button" onClick={() => moveCalendar('today')}>오늘</button>
                <button className="icon-button compact" type="button" aria-label="다음 기간" onClick={() => moveCalendar('next')}><ArrowRight size={17} /></button>
              </div>
            </div>
            <div className="view-switcher" role="group" aria-label="캘린더 보기">
              {[['dayGridMonth', '월'], ['timeGridWeek', '주'], ['timeGridDay', '일'], ['listWeek', '목록']].map(([view, label]) => (
                <button key={view} type="button" className={calendarView === view ? 'selected' : ''} aria-pressed={calendarView === view} onClick={() => changeView(view)}>{label}</button>
              ))}
            </div>
          </div>
          <div className="track-switcher" role="group" aria-label="일정 트랙 필터">
            {TRACK_FILTERS.map((track) => {
              const trackData = TRACKS[track];
              const Icon = trackData?.icon || CalendarDays;
              return (
                <button key={track} type="button" className={`track-filter ${trackFilter === track ? 'selected' : ''} ${trackData?.className || 'all'}`} aria-pressed={trackFilter === track} onClick={() => setTrackFilter(track)}>
                  <Icon size={14} /><span>{track === 'all' ? '전체' : trackData.label}</span><span className="track-count">{eventsByTrack[track]}</span>
                </button>
              );
            })}
          </div>
          <div className="calendar-wrap">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              initialDate={new Date()}
              locale="ko"
              firstDay={0}
              height="auto"
              headerToolbar={false}
              dayMaxEvents={2}
              events={events.map((event) => ({
                ...event,
                start: event.allDay ? event.start : `${event.start}T${event.startTime || '09:00'}:00`,
                end: event.allDay || !event.endTime ? undefined : `${event.start}T${event.endTime}:00`,
                extendedProps: { ...event, track: event.track },
              }))}
              dateClick={selectDate}
              eventClick={(info) => openExistingEvent(info.event)}
              datesSet={(info) => {
                setCurrentTitle(info.view.title);
                setSelectedDate(info.view.calendar.getDate());
              }}
              eventClassNames={(info) => [`event-${info.event.extendedProps.track || 'personal'}`]}
              eventContent={(arg) => (
                <div className="calendar-event-content">
                  {!arg.event.allDay && <span className="event-time">{arg.timeText}</span>}
                  <span className="event-name">{arg.event.title}</span>
                </div>
              )}
            />
          </div>
        </div>

        <aside className="right-column">
          <section className="side-card surface-card today-card">
            <div className="side-card-heading"><div><span className="side-label">YOUR DAY</span><h2>오늘의 하루</h2></div><span className="today-date">{formatDate(new Date(), { month: 'short', day: 'numeric' })}</span></div>
            {eventsToday.length ? (
              <div className="today-timeline">
                {eventsToday.slice(0, 3).map((event) => <MiniEvent key={event.id} event={event} />)}
              </div>
            ) : (
              <div className="quiet-state"><span className="quiet-icon"><Coffee size={18} /></span><div><strong>아직 일정이 없어요</strong><p>여유로운 하루를 즐겨보세요!</p></div></div>
            )}
            <button className="text-link" type="button" onClick={() => { setSelectedDate(new Date()); setShowSchedule((current) => !current); }}>
              {showSchedule ? '전체 일정 보기' : '오늘 일정 보기'} <ArrowRight size={14} />
            </button>
            {showSchedule && <div className="mini-agenda">{upcomingEvents.filter((event) => event.start === dateKey(new Date())).map((event) => <MiniEvent key={event.id} event={event} />)}</div>}
          </section>

          <section className="side-card surface-card upcoming-card">
            <div className="side-card-heading"><div><span className="side-label">COMING UP</span><h2>다가오는 일정</h2></div><button className="icon-button compact" aria-label="캘린더 페이지로" type="button" onClick={() => setPage('calendar')}><Ellipsis size={18} /></button></div>
            <div className="upcoming-list">
              {upcomingEvents.length ? upcomingEvents.map((event) => <UpcomingEvent key={event.id} event={event} />) : <p className="subtle-empty">다가오는 일정이 없습니다.</p>}
            </div>
          </section>

          <section className="side-card surface-card quick-todo-card">
            <div className="side-card-heading"><div><span className="side-label">QUICK TASKS</span><h2>빠른 할 일</h2></div><button className="icon-button compact" aria-label="할 일 모두 보기" type="button" onClick={() => setPage('todos')}><ArrowRight size={16} /></button></div>
            <div className="quick-todo-list">
              {activeTodos.slice(0, 3).map((todo) => (
                <button key={todo.id} className="quick-todo" type="button" onClick={() => toggleTodo(todo.id)}>
                  <span className="todo-checkbox" aria-hidden="true" /><span>{todo.title}</span>
                </button>
              ))}
              {!activeTodos.length && <p className="subtle-empty">남은 할 일이 없어요. 잘했어요!</p>}
            </div>
            <button className="add-quick-task" type="button" onClick={() => setPage('todos')}><Plus size={15} />할 일 추가하기</button>
          </section>
        </aside>
      </section>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, detail, tone }) {
  return <article className="summary-card surface-card"><span className={`summary-icon ${tone}`}><Icon size={18} /></span><div className="summary-copy"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div><span className={`summary-sparkline ${tone}`} aria-hidden="true"><i /><i /><i /><i /><i /></span></article>;
}

function MiniEvent({ event }) {
  const track = TRACKS[event.track] || TRACKS.personal;
  return <div className={`mini-event ${track.className}`}><span className="mini-event-time">{event.allDay ? '종일' : event.startTime || '09:00'}</span><span className="mini-event-dot" /><div className="mini-event-copy"><strong>{event.title}</strong>{event.location && <small>{event.location}</small>}</div></div>;
}

function UpcomingEvent({ event }) {
  const track = TRACKS[event.track] || TRACKS.personal;
  const date = new Date(`${event.start}T00:00:00`);
  const weekday = new Intl.DateTimeFormat('ko-KR', { weekday: 'short' }).format(date);
  return <div className="upcoming-item"><div className={`upcoming-date ${track.className}`}><strong>{date.getDate()}</strong><span>{weekday}</span></div><div className="upcoming-copy"><strong>{event.title}</strong><span>{track.label}{event.allDay ? ' · 종일' : ` · ${event.startTime || '09:00'}`}</span></div><span className={`track-indicator ${track.className}`} /></div>;
}

function EventDialog({ initial, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState('');
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.title.trim()) {
      setError('일정 제목을 입력해 주세요.');
      return;
    }
    if (!form.allDay && form.endTime <= form.startTime) {
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
          <label className="field-label">어느 트랙에 넣을까요?</label>
          <div className="track-choice" role="group" aria-label="트랙 선택">
            {Object.entries(TRACKS).map(([id, track]) => {
              const Icon = track.icon;
              return <button key={id} type="button" className={`track-choice-button ${track.className} ${form.track === id ? 'selected' : ''}`} aria-pressed={form.track === id} onClick={() => update('track', id)}><Icon size={15} />{track.label}</button>;
            })}
          </div>
          <label className="field-label" htmlFor="event-date">날짜</label>
          <input id="event-date" className="text-input" type="date" value={form.start} onChange={(event) => update('start', event.target.value)} required />
          <label className="all-day-toggle"><input type="checkbox" checked={form.allDay} onChange={(event) => update('allDay', event.target.checked)} /><span>종일 일정</span></label>
          {!form.allDay && <div className="time-fields"><label><span className="field-label">시작</span><input className="text-input" type="time" value={form.startTime} onChange={(event) => update('startTime', event.target.value)} /></label><label><span className="field-label">종료</span><input className="text-input" type="time" value={form.endTime} onChange={(event) => update('endTime', event.target.value)} /></label></div>}
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
            {form.id && <button className="button button-danger-quiet" type="button" onClick={() => onDelete(form.id)}><Trash2 size={16} />삭제</button>}
            <span className="dialog-spacer" />
            <button className="button button-quiet" type="button" onClick={onClose}>취소</button>
            <button className="button button-primary" type="submit">{form.id ? '변경 저장' : '일정 추가'}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function TodosPage({ todos, addTodo, toggleTodo, removeTodo }) {
  const [draft, setDraft] = useState('');
  const [filter, setFilter] = useState('active');
  const filtered = todos.filter((todo) => filter === 'all' || (filter === 'done' ? todo.done : !todo.done));
  const handleSubmit = (event) => {
    event.preventDefault();
    if (!draft.trim()) return;
    addTodo(draft);
    setDraft('');
  };
  return (
    <div className="page-content secondary-page">
      <section className="welcome-row secondary-welcome"><div><div className="eyebrow"><span className="eyebrow-dot green" /> MAKE IT HAPPEN</div><h1>할 일, 하나씩 해봐요.</h1><p className="page-subtitle">작은 체크가 모여 큰 하루를 만들어요.</p></div><span className="page-hero-icon green"><ListTodo size={25} /></span></section>
      <section className="task-panel surface-card">
        <form className="add-task-form" onSubmit={handleSubmit}><Plus size={18} /><input aria-label="새 할 일" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="새로운 할 일을 입력해 보세요" maxLength={200} /><button type="submit" className="button button-primary">추가하기 <ArrowRight size={15} /></button></form>
        <div className="task-panel-heading"><div><h2>나의 할 일</h2><span>{todos.filter((todo) => !todo.done).length}개의 할 일이 남았어요</span></div><div className="simple-tabs" role="group" aria-label="할 일 필터">{[['active', '진행 중'], ['done', '완료'], ['all', '전체']].map(([id, label]) => <button key={id} type="button" className={filter === id ? 'selected' : ''} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>)}</div></div>
        {filtered.length ? <div className="task-list">{filtered.map((todo) => <div key={todo.id} className={`task-row ${todo.done ? 'done' : ''}`}><button type="button" className={`task-check ${todo.done ? 'checked' : ''}`} aria-label={todo.done ? `${todo.title} 완료 취소` : `${todo.title} 완료 처리`} onClick={() => toggleTodo(todo.id)}>{todo.done && <Check size={15} />}</button><div className="task-row-copy"><strong>{todo.title}</strong>{todo.dueDate && <span><Clock3 size={13} />{formatDate(new Date(`${todo.dueDate}T00:00:00`), { month: 'long', day: 'numeric' })} 마감</span>}</div><span className={`priority-badge priority-${todo.priority}`}>{todo.priority === 1 ? '높음' : todo.priority === 2 ? '보통' : '낮음'}</span><button type="button" className="icon-button compact task-delete" aria-label={`${todo.title} 삭제`} onClick={() => removeTodo(todo.id)}><Trash2 size={16} /></button></div>)}</div> : <div className="empty-state"><span><CheckCheck size={23} /></span><strong>{filter === 'done' ? '아직 완료한 할 일이 없어요' : '모든 할 일을 마쳤어요!'}</strong><p>새로운 할 일을 추가해 보세요.</p></div>}
      </section>
      <div className="privacy-note"><CircleHelp size={15} /> 현재 데이터는 이 브라우저에만 저장돼요.</div>
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
    if (!product.trim() || !expires) return;
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
      {showForm && <form className="coupon-form surface-card" onSubmit={addCoupon}><div className="coupon-form-heading"><div><span className="side-label">NEW COUPON</span><h2>쿠폰 정보 입력</h2></div><button type="button" className="icon-button" aria-label="닫기" onClick={() => setShowForm(false)}><X size={18} /></button></div><p className="coupon-manual-note"><Sparkles size={14} /> 사진 인식은 서버 연결 후 사용할 수 있어요. 지금은 직접 입력해 주세요.</p><div className="coupon-fields"><label><span>브랜드</span><input className="text-input" value={brand} onChange={(event) => setBrand(event.target.value)} placeholder="예: 카페 모아" maxLength={100} /></label><label><span>상품명 <b>*</b></span><input className="text-input" value={product} onChange={(event) => setProduct(event.target.value)} placeholder="예: 아메리카노" maxLength={200} required /></label><label><span>유효기간 <b>*</b></span><input className="text-input" type="date" value={expires} onChange={(event) => setExpires(event.target.value)} required /></label></div><div className="coupon-form-actions"><button className="button button-quiet" type="button" onClick={() => setShowForm(false)}>취소</button><button className="button button-primary" type="submit">쿠폰 저장</button></div></form>}
      <section className="coupon-library surface-card">
        <div className="coupon-library-heading"><div><h2>나의 쿠폰함</h2><span>쿠폰을 한곳에 모아 관리해요</span></div><span className="coupon-total">{coupons.length}장</span></div>
        <div className="simple-tabs coupon-tabs" role="group" aria-label="쿠폰 상태 필터">{[['active', '사용 가능'], ['used', '사용 완료'], ['expired', '기간 만료']].map(([id, label]) => <button key={id} type="button" className={filter === id ? 'selected' : ''} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}<span>{coupons.filter((coupon) => id === 'active' ? !coupon.used && coupon.start >= dateKey(new Date()) : id === 'used' ? coupon.used : !coupon.used && coupon.start < dateKey(new Date())).length}</span></button>)}</div>
        {categorized.length ? <div className="coupon-list">{categorized.sort((a, b) => a.start.localeCompare(b.start)).map((coupon) => {
          const daysLeft = Math.round((new Date(`${coupon.start}T00:00:00`) - new Date(`${dateKey(new Date())}T00:00:00`)) / 86400000);
          return <article key={coupon.id} className="coupon-card"><div className="coupon-card-art"><Gift size={24} /><span>GIFT</span></div><div className="coupon-card-info"><span className="coupon-brand">{coupon.brand || '모아 쿠폰'}</span><strong>{coupon.title}</strong><span className="coupon-expiry">유효기간 {formatDate(new Date(`${coupon.start}T00:00:00`), { year: 'numeric', month: 'long', day: 'numeric' })}까지</span></div><span className={`dday-badge ${daysLeft <= 3 ? 'urgent' : ''}`}>{daysLeft === 0 ? '오늘 만료' : `D-${daysLeft}`}</span><div className="coupon-card-actions">{filter === 'active' && <button className="button button-quiet" type="button" onClick={() => markUsed(coupon.id)}><Check size={15} />사용 완료</button>}<button className="icon-button compact" type="button" aria-label={`${coupon.title} 삭제`} onClick={() => deleteCoupon(coupon.id)}><Trash2 size={15} /></button></div></article>;
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
      <section className="welcome-row secondary-welcome"><div><div className="eyebrow"><span className="eyebrow-dot" /> MAKE IT YOURS</div><h1>나에게 맞게 설정해요.</h1><p className="page-subtitle">모아를 더 편안하게 사용할 수 있어요.</p></div><span className="page-hero-icon"><Settings size={24} /></span></section>
      <section className="settings-panel surface-card">
        <div className="settings-section-heading"><h2>화면 설정</h2><p>모아의 화면을 취향에 맞게 바꿔보세요.</p></div>
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
