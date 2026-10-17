import { useState } from 'react';
import { CalendarDays, Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { formatDate, parseDateKey } from '../lib/date';
import { findTrack, trackStyle } from '../lib/tracks';
import { isMultiDay, rangeLabel } from '../lib/events';

const doneTime = (iso) => formatDate(new Date(iso), { hour: 'numeric', minute: '2-digit' });

// 캘린더에서 날짜를 누르면 뜨는 그날의 일정·할 일 목록. 일정은 수정·삭제·추가하고, 할 일은 완료를 체크한다.
export default function DayAgenda({ date, events, todos, tracks, onAdd, onEdit, onDelete, onToggleTodo, onClose }) {
  const [confirmId, setConfirmId] = useState(null);
  const sorted = [...events].sort((a, b) => (a.allDay === b.allDay ? (a.startTime || '').localeCompare(b.startTime || '') : a.allDay ? -1 : 1));
  const doneTodos = todos.filter((todo) => todo.done);
  const handleDelete = (event) => {
    if (confirmId !== event.id) return setConfirmId(event.id);
    setConfirmId(null);
    return onDelete(event.id);
  };
  const summary = [sorted.length && `일정 ${sorted.length}개`, doneTodos.length && `한 일 ${doneTodos.length}개`].filter(Boolean).join(' · ');

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="event-dialog day-agenda" role="dialog" aria-modal="true" aria-labelledby="day-agenda-title">
        <div className="dialog-heading">
          <div><span className="side-label">{summary || 'NO EVENTS'}</span><h2 id="day-agenda-title">{formatDate(parseDateKey(date), { month: 'long', day: 'numeric', weekday: 'long' })}</h2></div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="창 닫기"><X size={19} /></button>
        </div>
        {sorted.length ? (
          <ul className="agenda-list">
            {sorted.map((event) => {
              const track = findTrack(tracks, event.track);
              return (
                <li key={event.id} className="agenda-row">
                  <button type="button" className="agenda-main" onClick={() => onEdit(event)}>
                    <span className="agenda-bar" style={trackStyle(track.color)} />
                    <span className="agenda-time">{event.allDay ? '종일' : <>{event.startTime}<small>{event.endTime}</small></>}</span>
                    <span className="agenda-copy"><strong>{event.title}</strong><small>{track.label}{isMultiDay(event) && ` · ${rangeLabel(event)}`}{event.location && ` · ${event.location}`}</small></span>
                  </button>
                  <button type="button" className="icon-button compact" aria-label={`${event.title} 수정`} onClick={() => onEdit(event)}><Pencil size={15} /></button>
                  <button type="button" className={`icon-button compact agenda-delete ${confirmId === event.id ? 'confirm' : ''}`} aria-label={confirmId === event.id ? `${event.title} 삭제 확인` : `${event.title} 삭제`} onClick={() => handleDelete(event)}>
                    {confirmId === event.id ? '삭제' : <Trash2 size={15} />}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="agenda-empty"><CalendarDays size={20} /><span>이 날은 아직 일정이 없어요.</span></div>
        )}

        {todos.length > 0 && (
          <>
            <h3 className="agenda-section-title">할 일</h3>
            <ul className="agenda-list">
              {todos.map((todo) => (
                <li key={todo.id} className={`agenda-row agenda-todo ${todo.done ? 'done' : ''}`}>
                  <button type="button" className={`task-check ${todo.done ? 'checked' : ''}`} aria-label={todo.done ? `${todo.title} 완료 취소` : `${todo.title} 완료 처리`} onClick={() => onToggleTodo(todo.id)}>{todo.done && <Check size={14} />}</button>
                  <span className="agenda-copy"><strong>{todo.title}</strong><small>{todo.done ? `${doneTime(todo.doneAt)} 완료` : '이날 마감'}</small></span>
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="dialog-actions">
          <button className="button button-primary agenda-add" type="button" onClick={onAdd}><Plus size={16} />이 날짜에 일정 추가</button>
        </div>
      </section>
    </div>
  );
}
