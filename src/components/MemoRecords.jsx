import { useEffect, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { ArrowLeft, ArrowRight, NotebookPen, Plus, StickyNote } from 'lucide-react';
import { dateKey, formatDate, parseDateKey } from '../lib/date';
import { MEMO_TINTS, memoDate, memoPreview, memoTitle, sortMemos } from '../lib/memos';

// 저장한 메모(감정일기 등)를 날짜별로 모아 보는 화면. 메모를 누르면 메모장에서 열어 수정한다.
// initialDate: 검색에서 들어오면 캘린더 보기로 그 날짜가 있는 달을 열고 그날을 표시한다.
export default function MemoRecords({ memos, initialDate, onOpen, onNew }) {
  const [view, setView] = useState(initialDate ? 'calendar' : 'list');
  const [title, setTitle] = useState('');
  const [focusDate] = useState(initialDate);
  const calendarRef = useRef(null);
  const sectionRef = useRef(null);

  useEffect(() => {
    if (focusDate) sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [focusDate]);
  const days = [];
  for (const memo of sortMemos(memos)) {
    const date = memoDate(memo);
    if (days.at(-1)?.date === date) days.at(-1).items.push(memo);
    else days.push({ date, items: [memo] });
  }
  const move = (direction) => calendarRef.current?.getApi()[direction]();

  return (
    <section ref={sectionRef} className="memo-records surface-card">
      <div className="task-panel-heading memo-records-heading">
        <div><h2><NotebookPen size={17} />메모 기록</h2><span>{memos.length ? `${memos.length}개의 메모를 날짜별로 모았어요` : '메모장에 쓴 기록이 여기에 모여요'}</span></div>
        <div className="memo-records-actions">
          <div className="view-switcher" role="group" aria-label="메모 보기 형식">
            {[['list', '목록'], ['calendar', '캘린더']].map(([id, label]) => <button key={id} type="button" className={view === id ? 'selected' : ''} aria-pressed={view === id} onClick={() => setView(id)}>{label}</button>)}
          </div>
          <button className="button button-primary" type="button" onClick={() => onNew(dateKey(new Date()))}><Plus size={15} />새 메모</button>
        </div>
      </div>

      {view === 'list' ? (
        days.length ? (
          <div className="memo-days">
            {days.map(({ date, items }) => (
              <div key={date} className="memo-day">
                <h3>{formatDate(parseDateKey(date), { month: 'long', day: 'numeric', weekday: 'long' })}</h3>
                <div className="memo-day-items">
                  {items.map((memo) => (
                    <button key={memo.id} type="button" className={`memo-item memo-${memo.color}`} onClick={() => onOpen(memo.id)}>
                      <strong>{memoTitle(memo)}</strong>
                      {memoPreview(memo).trim() && <span>{memoPreview(memo)}</span>}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state"><span><StickyNote size={22} /></span><strong>아직 저장한 메모가 없어요</strong><p>오늘의 기분이나 생각을 메모로 남겨보세요.</p></div>
        )
      ) : (
        <div className="todo-calendar">
          <div className="todo-calendar-toolbar">
            <div className="calendar-controls">
              <button className="icon-button compact" type="button" aria-label="이전 달" onClick={() => move('prev')}><ArrowLeft size={17} /></button>
              <button className="today-button" type="button" onClick={() => move('today')}>오늘</button>
              <button className="icon-button compact" type="button" aria-label="다음 달" onClick={() => move('next')}><ArrowRight size={17} /></button>
            </div>
            <strong>{title}</strong>
            <span className="todo-legend">날짜를 누르면 그날의 메모를 써요</span>
          </div>
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            initialDate={focusDate || undefined}
            dayCellClassNames={(arg) => (focusDate && dateKey(arg.date) === focusDate ? ['picked-day'] : [])}
            locale="ko"
            height="auto"
            headerToolbar={false}
            dayMaxEvents={3}
            moreLinkContent={(arg) => `+${arg.num}개`}
            eventDisplay="block"
            events={memos.map((memo) => ({
              id: memo.id,
              title: memoTitle(memo),
              start: memoDate(memo),
              allDay: true,
              backgroundColor: `color-mix(in srgb, ${MEMO_TINTS[memo.color]} 22%, var(--surface))`,
              borderColor: 'transparent',
              textColor: `color-mix(in srgb, ${MEMO_TINTS[memo.color]} 45%, var(--text))`,
            }))}
            eventClick={(info) => onOpen(info.event.id)}
            dateClick={(info) => onNew(dateKey(info.date))}
            datesSet={(info) => setTitle(info.view.title)}
            eventContent={(arg) => <div className="calendar-event-content"><span className="event-name">{arg.event.title}</span></div>}
          />
        </div>
      )}
    </section>
  );
}
