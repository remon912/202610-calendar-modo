import { useEffect, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { ArrowLeft, ArrowRight, Check, CheckCheck, CircleHelp, Clock3, ListTodo, Plus, Repeat, SlidersHorizontal, Trash2 } from 'lucide-react';
import TodoDialog from '../components/TodoDialog';
import MemoRecords from '../components/MemoRecords';
import { dateKey, formatDate, moveToDate, parseDateKey } from '../lib/date';
import { PRIORITY_LABELS, collapseSeries, repeatSummary } from '../lib/todos';

const VIEWS = [['list', '목록'], ['dayGridMonth', '캘린더']];
const doneLabel = (iso) => formatDate(new Date(iso), { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });

// 완료한 할 일은 완료한 날에, 아직 안 한 할 일은 마감일에 표시한다.
function toCalendarEvents(todos) {
  return todos.flatMap((todo) => {
    if (todo.done && todo.doneAt) return [{ id: todo.id, title: todo.title, start: dateKey(new Date(todo.doneAt)), allDay: true, classNames: ['event-todo-done'], extendedProps: { done: true } }];
    if (!todo.done && todo.dueDate) return [{ id: todo.id, title: todo.title, start: todo.dueDate, allDay: true, classNames: ['event-todo-due'], extendedProps: { done: false } }];
    return [];
  });
}

// initialTodoId: 검색 결과에서 들어오면 그 할 일의 수정 창을 바로 연다.
export default function TodosPage({ todos, setTodos, toggleTodo, memos, openMemo, initialTodoId, initialMemoDate, onFocusConsumed, setNotice }) {
  const [draft, setDraft] = useState('');
  const [filter, setFilter] = useState('active');
  const [view, setView] = useState('list');
  const [calendarTitle, setCalendarTitle] = useState('');
  const [todoDraft, setTodoDraft] = useState(() => {
    const todo = initialTodoId && todos.find((item) => item.id === initialTodoId);
    return todo ? { ...todo, dueDate: todo.dueDate || '', repeat: todo.repeat || { freq: 'none', end: '', weekdays: [] } } : null;
  });
  const calendarRef = useRef(null);

  // 한 번 열었으면 다시 이 화면에 올 때 또 열리지 않게 알린다.
  useEffect(() => {
    if (initialTodoId || initialMemoDate) onFocusConsumed();
  }, [initialTodoId, initialMemoDate, onFocusConsumed]);

  const openTodos = collapseSeries(todos.filter((todo) => !todo.done));
  const doneTodos = todos.filter((todo) => todo.done).sort((a, b) => (b.doneAt || '').localeCompare(a.doneAt || ''));
  const filtered = filter === 'active' ? openTodos : filter === 'done' ? doneTodos : [...openTodos, ...doneTodos];

  const changeView = (next) => {
    setView(next);
    if (next !== 'list') calendarRef.current?.getApi().changeView(next);
  };
  const moveCalendar = (direction) => calendarRef.current?.getApi()[direction]();

  const openNew = (fields = {}) => setTodoDraft({ id: '', title: draft.trim(), dueDate: '', priority: 2, done: false, repeat: { freq: 'none', end: '', weekdays: [] }, ...fields });
  const openExisting = (id) => {
    const todo = todos.find((item) => item.id === id);
    if (todo) setTodoDraft({ ...todo, dueDate: todo.dueDate || '', repeat: todo.repeat || { freq: 'none', end: '', weekdays: [] } });
  };
  const quickAdd = (event) => {
    event.preventDefault();
    if (!draft.trim()) return;
    setTodos((current) => [...current, { id: crypto.randomUUID(), title: draft.trim(), dueDate: '', done: false, priority: 2 }]);
    setDraft('');
    setNotice('할 일을 추가했어요.');
  };

  const saveTodo = (form, dates) => {
    if (form.id) {
      setTodos((current) => current.map((todo) => {
        if (todo.id !== form.id) return todo;
        // 완료일만 바꾸면 기존 완료 시각은 유지하고, 새로 완료하면 지금 시각을 쓴다.
        const doneAt = form.done ? moveToDate(todo.done && todo.doneAt ? todo.doneAt : new Date().toISOString(), form.doneDate) : null;
        return { ...todo, title: form.title, dueDate: form.dueDate, priority: form.priority, done: form.done, doneAt };
      }));
      setNotice('할 일을 수정했어요.');
    } else if (dates.length) {
      const seriesId = crypto.randomUUID();
      const repeat = { ...form.repeat, start: dates[0] };
      setTodos((current) => [...current, ...dates.map((dueDate) => ({ id: crypto.randomUUID(), title: form.title, dueDate, done: false, priority: form.priority, seriesId, repeat }))]);
      setNotice(`반복 할 일 ${dates.length}개를 추가했어요.`);
    } else {
      setTodos((current) => [...current, { id: crypto.randomUUID(), title: form.title, dueDate: form.dueDate, done: false, priority: form.priority }]);
      setNotice('할 일을 추가했어요.');
    }
    setDraft('');
    setTodoDraft(null);
  };
  // 'following'은 이 회차부터 아직 안 한 반복만 지운다. 이미 완료한 기록은 남긴다.
  const deleteTodo = (target, scope) => {
    const removed = (todo) => todo.id === target.id
      || (scope === 'following' && todo.seriesId === target.seriesId && !todo.done && (todo.dueDate || '') >= (target.dueDate || ''));
    const count = todos.filter(removed).length;
    setTodos((current) => current.filter((todo) => !removed(todo)));
    setTodoDraft(null);
    setNotice(count > 1 ? `반복 할 일 ${count}개를 삭제했어요.` : '할 일을 삭제했어요.');
  };
  const removeOne = (todo) => {
    setTodos((current) => current.filter((item) => item.id !== todo.id));
    setNotice('할 일을 삭제했어요.');
  };

  return (
    <div className="page-content secondary-page">
      <section className="welcome-row secondary-welcome"><div><div className="eyebrow"><span className="eyebrow-dot green" /> MAKE IT HAPPEN</div><h1>할 일, 하나씩 해봐요.</h1><p className="page-subtitle">작은 체크가 모여 큰 하루를 만들어요.</p></div><span className="page-hero-icon green"><ListTodo size={25} /></span></section>
      <section className="task-panel surface-card">
        <form className="add-task-form" onSubmit={quickAdd}>
          <Plus size={18} />
          <input aria-label="새 할 일" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="새로운 할 일을 입력해 보세요" maxLength={200} />
          <button type="button" className="button button-quiet" onClick={() => openNew()}><SlidersHorizontal size={15} />마감·반복</button>
          <button type="submit" className="button button-primary">추가하기 <ArrowRight size={15} /></button>
        </form>
        <div className="task-panel-heading">
          <div><h2>나의 할 일</h2><span>{openTodos.length}개의 할 일이 남았어요</span></div>
          <div className="view-switcher" role="group" aria-label="할 일 보기 형식">
            {VIEWS.map(([id, label]) => <button key={id} type="button" className={view === id ? 'selected' : ''} aria-pressed={view === id} onClick={() => changeView(id)}>{label}</button>)}
          </div>
        </div>

        {view === 'list' ? (
          <>
            <div className="simple-tabs task-filter" role="group" aria-label="할 일 필터">{[['active', '진행 중'], ['done', '완료'], ['all', '전체']].map(([id, label]) => <button key={id} type="button" className={filter === id ? 'selected' : ''} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>)}</div>
            {filtered.length ? (
              <div className="task-list">
                {filtered.map((todo) => (
                  <div key={todo.id} className={`task-row ${todo.done ? 'done' : ''}`}>
                    <button type="button" className={`task-check ${todo.done ? 'checked' : ''}`} aria-label={todo.done ? `${todo.title} 완료 취소` : `${todo.title} 완료 처리`} onClick={() => toggleTodo(todo.id)}>{todo.done && <Check size={15} />}</button>
                    <button type="button" className="task-row-copy" onClick={() => openExisting(todo.id)}>
                      <strong>{todo.title}</strong>
                      <span>
                        {todo.done && todo.doneAt && <><CheckCheck size={13} />{doneLabel(todo.doneAt)} 완료</>}
                        {!todo.done && todo.dueDate && <><Clock3 size={13} />{formatDate(parseDateKey(todo.dueDate), { month: 'long', day: 'numeric', weekday: 'short' })} 마감</>}
                        {!todo.done && todo.seriesId && <><Repeat size={13} />{repeatSummary(todo.repeat)}{todo.remaining > 0 && ` · 남은 ${todo.remaining}회`}</>}
                      </span>
                    </button>
                    <span className={`priority-badge priority-${todo.priority}`}>{PRIORITY_LABELS[todo.priority]}</span>
                    <button type="button" className="icon-button compact task-delete" aria-label={`${todo.title} 삭제`} onClick={() => removeOne(todo)}><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state"><span><CheckCheck size={23} /></span><strong>{filter === 'done' ? '아직 완료한 할 일이 없어요' : '모든 할 일을 마쳤어요!'}</strong><p>새로운 할 일을 추가해 보세요.</p></div>
            )}
          </>
        ) : (
          <div className="todo-calendar">
            <div className="todo-calendar-toolbar">
              <div className="calendar-controls">
                <button className="icon-button compact" type="button" aria-label="이전 기간" onClick={() => moveCalendar('prev')}><ArrowLeft size={17} /></button>
                <button className="today-button" type="button" onClick={() => moveCalendar('today')}>오늘</button>
                <button className="icon-button compact" type="button" aria-label="다음 기간" onClick={() => moveCalendar('next')}><ArrowRight size={17} /></button>
              </div>
              <strong>{calendarTitle}</strong>
              <span className="todo-legend"><i className="done" />완료한 날<i className="due" />마감 예정</span>
            </div>
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView={view}
              locale="ko"
              height="auto"
              headerToolbar={false}
              dayMaxEvents={3}
              moreLinkContent={(arg) => `+${arg.num}개`}
              eventDisplay="block"
              events={toCalendarEvents(todos)}
              eventClick={(info) => openExisting(info.event.id)}
              dateClick={(info) => openNew({ dueDate: dateKey(info.date) })}
              datesSet={(info) => setCalendarTitle(info.view.title)}
              eventContent={(arg) => (
                <div className="calendar-event-content">
                  {arg.event.extendedProps.done ? <Check size={10} strokeWidth={3} /> : <span className="todo-dot" />}
                  <span className="event-name">{arg.event.title}</span>
                </div>
              )}
            />
          </div>
        )}
      </section>
      <MemoRecords memos={memos} initialDate={initialMemoDate} onOpen={(id) => openMemo({ id })} onNew={(date) => openMemo({ date })} />
      <div className="privacy-note"><CircleHelp size={15} /> 현재 데이터는 이 브라우저에만 저장돼요.</div>
      {todoDraft && <TodoDialog initial={todoDraft} onClose={() => setTodoDraft(null)} onSave={saveTodo} onDelete={deleteTodo} />}
    </div>
  );
}
