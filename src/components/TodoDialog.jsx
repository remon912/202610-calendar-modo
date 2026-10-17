import { useState } from 'react';
import { CalendarCheck, Repeat, Trash2, X } from 'lucide-react';
import DatePicker from './DatePicker';
import { dateKey, formatDate, parseDateKey } from '../lib/date';
import { MAX_REPEAT, PRIORITY_LABELS, REPEAT_LABELS, WEEKDAYS, repeatDates, repeatSummary } from '../lib/todos';

export default function TodoDialog({ initial, onClose, onSave, onDelete }) {
  // 완료일 기본값은 기존 완료일, 없으면 오늘
  const [form, setForm] = useState(() => ({ ...initial, doneDate: initial.doneAt ? dateKey(new Date(initial.doneAt)) : dateKey(new Date()) }));
  const todayKey = dateKey(new Date());
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const isNew = !form.id;
  const repeat = form.repeat;
  const repeating = isNew && repeat.freq !== 'none';
  const dates = repeating ? repeatDates({ ...repeat, start: form.dueDate }) : [];

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const updateRepeat = (key, value) => setForm((current) => ({ ...current, repeat: { ...current.repeat, [key]: value } }));
  const chooseFreq = (freq) => {
    const start = form.dueDate || dateKey(new Date());
    setForm((current) => ({
      ...current,
      dueDate: freq === 'none' ? current.dueDate : start,
      repeat: {
        ...current.repeat,
        freq,
        weekdays: freq === 'weekly' && !current.repeat.weekdays.length ? [parseDateKey(start).getDay()] : current.repeat.weekdays,
      },
    }));
  };
  const toggleWeekday = (day) => updateRepeat('weekdays', repeat.weekdays.includes(day)
    ? repeat.weekdays.filter((item) => item !== day)
    : [...repeat.weekdays, day].sort());

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.title.trim()) return setError('할 일 이름을 입력해 주세요.');
    if (form.done && (!form.doneDate || form.doneDate > todayKey)) return setError('완료일은 오늘이나 그 이전 날짜로 골라 주세요.');
    if (repeating) {
      if (!form.dueDate || !repeat.end) return setError('반복할 기간(시작일·종료일)을 정해 주세요.');
      if (repeat.end < form.dueDate) return setError('종료일은 시작일과 같거나 늦어야 해요.');
      if (repeat.freq === 'weekly' && !repeat.weekdays.length) return setError('반복할 요일을 하나 이상 골라 주세요.');
      if (!dates.length) return setError('이 기간에는 반복되는 날짜가 없어요.');
      if (dates.length > MAX_REPEAT) return setError(`반복은 최대 ${MAX_REPEAT}회까지 만들 수 있어요. 기간을 줄여 주세요.`);
    }
    return onSave({ ...form, title: form.title.trim() }, dates);
  };
  const handleDelete = (scope) => {
    if (confirmDelete !== scope) return setConfirmDelete(scope);
    return onDelete(form, scope);
  };

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="event-dialog" role="dialog" aria-modal="true" aria-labelledby="todo-dialog-title">
        <div className="dialog-heading"><div><span className="side-label">{isNew ? 'NEW TASK' : 'EDIT TASK'}</span><h2 id="todo-dialog-title">{isNew ? '새 할 일 만들기' : '할 일 수정하기'}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="창 닫기"><X size={19} /></button></div>
        <form onSubmit={handleSubmit}>
          <label className="field-label" htmlFor="todo-title">할 일</label>
          <input id="todo-title" className="text-input event-title-input" value={form.title} onChange={(event) => update('title', event.target.value)} placeholder="무엇을 해야 하나요?" autoFocus maxLength={200} />

          <label className="field-label">우선순위</label>
          <div className="track-choice" role="group" aria-label="우선순위">
            {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
              <button key={value} type="button" className={`track-choice-button priority-choice p${value} ${form.priority === Number(value) ? 'selected' : ''}`} aria-pressed={form.priority === Number(value)} onClick={() => update('priority', Number(value))}>{label}</button>
            ))}
          </div>

          {isNew && (
            <>
              <label className="field-label"><Repeat size={14} /> 반복</label>
              <div className="track-choice" role="group" aria-label="반복 주기">
                {Object.entries(REPEAT_LABELS).map(([freq, label]) => (
                  <button key={freq} type="button" className={`track-choice-button group-kind ${repeat.freq === freq ? 'selected' : ''}`} aria-pressed={repeat.freq === freq} onClick={() => chooseFreq(freq)}>{label}</button>
                ))}
              </div>
              {repeat.freq === 'weekly' && (
                <div className="weekday-choice" role="group" aria-label="반복 요일">
                  {WEEKDAYS.map((label, day) => (
                    <button key={label} type="button" className={`weekday-button ${repeat.weekdays.includes(day) ? 'selected' : ''} ${day === 0 ? 'sun' : day === 6 ? 'sat' : ''}`} aria-pressed={repeat.weekdays.includes(day)} onClick={() => toggleWeekday(day)}>{label}</button>
                  ))}
                </div>
              )}
            </>
          )}

          {repeating ? (
            <div className="time-fields">
              <label><span className="field-label">시작일</span><DatePicker value={form.dueDate} onChange={(value) => update('dueDate', value)} ariaLabel="반복 시작일" /></label>
              <label><span className="field-label">종료일</span><DatePicker value={repeat.end} min={form.dueDate} onChange={(value) => updateRepeat('end', value)} placeholder="종료일 선택" ariaLabel="반복 종료일" /></label>
            </div>
          ) : (
            <>
              <label className="field-label" htmlFor="todo-due">마감일 <span className="optional-label">선택</span></label>
              <DatePicker id="todo-due" value={form.dueDate} onChange={(value) => update('dueDate', value)} clearable placeholder="마감일 없음" ariaLabel="마감일" />
            </>
          )}
          {repeating && dates.length > 0 && (
            <p className="repeat-preview">
              <Repeat size={13} />
              {dates.length > MAX_REPEAT
                ? `${MAX_REPEAT}회를 넘어요. 기간을 줄여 주세요.`
                : `${repeatSummary(repeat)} · ${formatDate(parseDateKey(dates[0]), { month: 'long', day: 'numeric' })}부터 ${formatDate(parseDateKey(dates[dates.length - 1]), { month: 'long', day: 'numeric' })}까지 총 ${dates.length}개를 만들어요.`}
            </p>
          )}

          {!isNew && (
            <>
              <label className="all-day-toggle"><input type="checkbox" checked={form.done} onChange={(event) => update('done', event.target.checked)} /><span>완료</span></label>
              {form.done && (
                <>
                  <label className="field-label" htmlFor="todo-done-date"><CalendarCheck size={14} /> 완료일</label>
                  <DatePicker id="todo-done-date" value={form.doneDate} max={todayKey} onChange={(value) => update('doneDate', value)} ariaLabel="완료일" />
                  <p className="dialog-help">완료일에 맞춰 캘린더의 그 날짜에 표시돼요.</p>
                </>
              )}
              {form.seriesId && <p className="dialog-help"><Repeat size={13} /> {repeatSummary(form.repeat)} 반복 할 일 중 하나예요.</p>}
            </>
          )}

          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="dialog-actions wrap">
            {!isNew && (
              <button className="button button-danger-quiet" type="button" onClick={() => handleDelete('one')}><Trash2 size={16} />{confirmDelete === 'one' ? '한 번 더 누르면 삭제' : form.seriesId ? '이 할 일만 삭제' : '삭제'}</button>
            )}
            {!isNew && form.seriesId && (
              <button className="button button-danger-quiet" type="button" onClick={() => handleDelete('following')}>{confirmDelete === 'following' ? '한 번 더 누르면 삭제' : '남은 반복 모두 삭제'}</button>
            )}
            <span className="dialog-spacer" />
            <button className="button button-quiet" type="button" onClick={onClose}>취소</button>
            <button className="button button-primary" type="submit">{isNew ? (repeating && dates.length ? `${dates.length}개 추가` : '할 일 추가') : '변경 저장'}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
