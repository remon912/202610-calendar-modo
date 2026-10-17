import { useState } from 'react';
import { Trash2, X } from 'lucide-react';
import CategoryIcon from './CategoryIcon';
import DatePicker from './DatePicker';
import { CATEGORIES } from '../lib/growth';
import { WEEKDAYS } from '../lib/todos';

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

export default function HabitDialog({ initial, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const toggleDay = (day) => update('days', form.days.includes(day) ? form.days.filter((item) => item !== day) : [...form.days, day].sort());
  const everyDay = form.days.length === 7;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.title.trim()) return setError('목표 이름을 입력해 주세요.');
    if (!form.days.length) return setError('실천할 요일을 하나 이상 골라 주세요.');
    if (!form.startDate) return setError('시작일을 정해 주세요.');
    if (form.endDate && form.endDate < form.startDate) return setError('종료일은 시작일과 같거나 늦어야 해요.');
    return onSave({ ...form, title: form.title.trim() });
  };

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="event-dialog theme-growth" role="dialog" aria-modal="true" aria-labelledby="habit-dialog-title">
        <div className="dialog-heading"><div><span className="side-label">{form.id ? 'EDIT GOAL' : 'NEW GOAL'}</span><h2 id="habit-dialog-title">{form.id ? '목표 수정하기' : '새 목표 만들기'}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="창 닫기"><X size={19} /></button></div>
        <form onSubmit={handleSubmit}>
          <label className="field-label" htmlFor="habit-title">무엇을 꾸준히 할까요?</label>
          <input id="habit-title" className="text-input event-title-input" value={form.title} onChange={(event) => update('title', event.target.value)} placeholder="예: 책 20쪽 읽기, 스쿼트 50개" autoFocus maxLength={60} />

          <label className="field-label">분야</label>
          <div className="category-choice" role="group" aria-label="분야">
            {Object.entries(CATEGORIES).map(([id, category]) => (
              <button key={id} type="button" className={`track-choice-button colored ${form.category === id ? 'selected' : ''}`} style={{ '--track-color': category.color }} aria-pressed={form.category === id} onClick={() => update('category', id)}><CategoryIcon id={id} size={15} />{category.label}</button>
            ))}
          </div>

          <label className="field-label">실천 요일</label>
          <div className="weekday-choice">
            {WEEKDAYS.map((label, day) => (
              <button key={label} type="button" className={`weekday-button ${form.days.includes(day) ? 'selected' : ''} ${day === 0 ? 'sun' : day === 6 ? 'sat' : ''}`} aria-pressed={form.days.includes(day)} onClick={() => toggleDay(day)}>{label}</button>
            ))}
          </div>
          <label className="all-day-toggle"><input type="checkbox" checked={everyDay} onChange={() => update('days', everyDay ? [] : ALL_DAYS)} /><span>매일</span></label>

          <div className="time-fields">
            <label><span className="field-label">시작일</span><DatePicker value={form.startDate} onChange={(value) => update('startDate', value)} ariaLabel="시작일" /></label>
            <label><span className="field-label">종료일 <span className="optional-label">선택</span></span><DatePicker value={form.endDate} min={form.startDate} onChange={(value) => update('endDate', value)} clearable placeholder="종료일 없음" ariaLabel="종료일" /></label>
          </div>

          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="dialog-actions">
            {form.id && <button className="button button-danger-quiet" type="button" onClick={() => (confirmDelete ? onDelete(form.id) : setConfirmDelete(true))}><Trash2 size={16} />{confirmDelete ? '한 번 더 누르면 삭제' : '삭제'}</button>}
            <span className="dialog-spacer" />
            <button className="button button-quiet" type="button" onClick={onClose}>취소</button>
            <button className="button button-primary" type="submit">{form.id ? '변경 저장' : '목표 추가'}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
