import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { dateKey, formatDate, parseDateKey } from '../lib/date';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const POPOVER_WIDTH = 312;
const POPOVER_HEIGHT = 400;

// 화면 밖으로 나가지 않게 입력칸 아래(공간이 없으면 위)에 띄운다.
function placeBelow(trigger) {
  const rect = trigger.getBoundingClientRect();
  const width = Math.min(POPOVER_WIDTH, window.innerWidth - 16);
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
  const below = rect.bottom + 6;
  const top = below + POPOVER_HEIGHT > window.innerHeight ? Math.max(8, rect.top - POPOVER_HEIGHT - 6) : below;
  return { top, left, width };
}

// 연도·월을 바로 고를 수 있는 날짜 선택기. value/onChange는 'YYYY-MM-DD' 문자열(없으면 '').
export default function DatePicker({ id, value, onChange, min, max, clearable = false, placeholder = '날짜 선택', ariaLabel }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('days');
  const [cursor, setCursor] = useState({ year: 2026, month: 0 });
  const [position, setPosition] = useState(null);
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const todayKey = dateKey(new Date());

  const openPicker = () => {
    const base = parseDateKey(value || (min && min > todayKey ? min : todayKey));
    setCursor({ year: base.getFullYear(), month: base.getMonth() });
    setMode('days');
    setPosition(placeBelow(triggerRef.current));
    setOpen(true);
  };
  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return undefined;
    const closeOutside = (event) => {
      if (!popoverRef.current?.contains(event.target) && !triggerRef.current?.contains(event.target)) setOpen(false);
    };
    const follow = () => setPosition(placeBelow(triggerRef.current));
    // Esc는 선택기만 닫는다: 캡처 단계에서 막아 메모장·대화상자의 Esc 처리까지 가지 않게 한다.
    const closeOnEscape = (event) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      setOpen(false);
    };
    document.addEventListener('mousedown', closeOutside);
    window.addEventListener('keydown', closeOnEscape, true);
    window.addEventListener('resize', follow);
    window.addEventListener('scroll', follow, true);
    return () => {
      document.removeEventListener('mousedown', closeOutside);
      window.removeEventListener('keydown', closeOnEscape, true);
      window.removeEventListener('resize', follow);
      window.removeEventListener('scroll', follow, true);
    };
  }, [open]);

  const outOfRange = (key) => (min && key < min) || (max && key > max);
  const pick = (key) => {
    if (outOfRange(key)) return;
    onChange(key);
    close();
  };
  const shiftMonth = (delta) => setCursor(({ year, month }) => {
    const date = new Date(year, month + delta, 1);
    return { year: date.getFullYear(), month: date.getMonth() };
  });
  const shift = (direction) => {
    if (mode === 'days') shiftMonth(direction);
    else if (mode === 'months') setCursor((current) => ({ ...current, year: current.year + direction }));
    else setCursor((current) => ({ ...current, year: current.year + direction * 12 }));
  };

  // 6주(42칸) 달력: 그 달 1일이 있는 주의 일요일부터
  const first = new Date(cursor.year, cursor.month, 1);
  const days = Array.from({ length: 42 }, (_, index) => new Date(cursor.year, cursor.month, index - first.getDay() + 1));
  const yearStart = Math.floor(cursor.year / 12) * 12;

  return (
    <>
      <button ref={triggerRef} id={id} type="button" className={`text-input date-trigger ${value ? '' : 'empty'}`} aria-label={ariaLabel} aria-haspopup="dialog" aria-expanded={open} onClick={() => (open ? setOpen(false) : openPicker())}>
        <CalendarDays size={15} />
        <span>{value ? formatDate(parseDateKey(value), { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }) : placeholder}</span>
      </button>
      {open && position && createPortal(
        <div
          ref={popoverRef}
          className="date-popover"
          style={{ top: position.top, left: position.left, width: position.width }}
          role="dialog"
          aria-label="날짜 선택"
        >
          <div className="date-popover-head">
            <button type="button" className="date-nav" aria-label={mode === 'days' ? '이전 달' : mode === 'months' ? '이전 해' : '이전 12년'} onClick={() => shift(-1)}><ChevronLeft size={18} /></button>
            <div className="date-head-labels">
              <button type="button" className={`date-head-button ${mode === 'years' ? 'active' : ''}`} onClick={() => setMode(mode === 'years' ? 'days' : 'years')}>{mode === 'years' ? `${yearStart}–${yearStart + 11}` : `${cursor.year}년`}<ChevronDown size={14} /></button>
              {mode !== 'years' && <button type="button" className={`date-head-button ${mode === 'months' ? 'active' : ''}`} onClick={() => setMode(mode === 'months' ? 'days' : 'months')}>{cursor.month + 1}월<ChevronDown size={14} /></button>}
            </div>
            <button type="button" className="date-nav" aria-label={mode === 'days' ? '다음 달' : mode === 'months' ? '다음 해' : '다음 12년'} onClick={() => shift(1)}><ChevronRight size={18} /></button>
          </div>

          {mode === 'years' && (
            <div className="date-choice-grid">
              {Array.from({ length: 12 }, (_, index) => yearStart + index).map((year) => (
                <button key={year} type="button" className={`date-choice ${year === cursor.year ? 'selected' : ''} ${year === new Date().getFullYear() ? 'current' : ''}`} onClick={() => { setCursor((current) => ({ ...current, year })); setMode('months'); }}>{year}</button>
              ))}
            </div>
          )}
          {mode === 'months' && (
            <div className="date-choice-grid">
              {Array.from({ length: 12 }, (_, month) => month).map((month) => (
                <button key={month} type="button" className={`date-choice ${month === cursor.month ? 'selected' : ''}`} onClick={() => { setCursor((current) => ({ ...current, month })); setMode('days'); }}>{month + 1}월</button>
              ))}
            </div>
          )}
          {mode === 'days' && (
            <div className="date-days" role="grid">
              {WEEKDAYS.map((label, index) => <span key={label} className={`date-weekday ${index === 0 ? 'sun' : index === 6 ? 'sat' : ''}`}>{label}</span>)}
              {days.map((date) => {
                const key = dateKey(date);
                const classes = ['date-day', date.getMonth() !== cursor.month && 'other', key === todayKey && 'today', key === value && 'selected', date.getDay() === 0 && 'sun', date.getDay() === 6 && 'sat'].filter(Boolean).join(' ');
                return <button key={key} type="button" className={classes} disabled={outOfRange(key)} aria-pressed={key === value} aria-label={formatDate(date, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })} onClick={() => pick(key)}>{date.getDate()}</button>;
              })}
            </div>
          )}

          <div className="date-popover-foot">
            {clearable && value ? <button type="button" className="date-foot-button" onClick={() => { onChange(''); close(); }}>지우기</button> : <span />}
            <button type="button" className="date-foot-button primary" disabled={outOfRange(todayKey)} onClick={() => pick(todayKey)}>오늘</button>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
