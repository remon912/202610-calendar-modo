import { useEffect, useRef, useState } from 'react';
import { CalendarDays, ListTodo, Search, Smile, Sprout, StickyNote, X } from 'lucide-react';
import { dateKey, formatDate, parseDateKey } from '../lib/date';
import { DIARY_KEY, moodOf } from '../lib/diary';
import { CATEGORIES, GROWTH_KEY } from '../lib/growth';
import { memoDate, memoPreview, memoTitle } from '../lib/memos';
import { readStorage } from '../lib/storage';
import { findTrack } from '../lib/tracks';
import { eventEnd, isMultiDay } from '../lib/events';

const SECTIONS = [
  { type: 'event', label: '일정', icon: CalendarDays },
  { type: 'todo', label: '할 일', icon: ListTodo },
  { type: 'memo', label: '메모', icon: StickyNote },
  { type: 'habit', label: '자기계발 목표', icon: Sprout },
  { type: 'diary', label: '기분 기록', icon: Smile },
];
const PER_SECTION = 5;
const shortDate = (key) => formatDate(parseDateKey(key), { month: 'long', day: 'numeric', weekday: 'short' });

// 검색어를 띄어쓰기로 나눠 모든 단어가 들어 있으면 일치로 본다.
const matcher = (query) => {
  const words = query.trim().toLocaleLowerCase('ko').split(/\s+/).filter(Boolean);
  return (...fields) => {
    const text = fields.filter(Boolean).join(' ').toLocaleLowerCase('ko');
    return words.every((word) => text.includes(word));
  };
};

function Highlight({ text, query }) {
  const word = query.trim().split(/\s+/)[0];
  if (!word || !text) return text || null;
  const index = text.toLocaleLowerCase('ko').indexOf(word.toLocaleLowerCase('ko'));
  if (index < 0) return text;
  return <>{text.slice(0, index)}<mark>{text.slice(index, index + word.length)}</mark>{text.slice(index + word.length)}</>;
}

// 앱 전체 검색 창: 일정·할 일·메모·자기계발 목표·기분 기록을 한 번에 찾는다.
export default function SearchPalette({ events, todos, memos, tracks, onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [stored] = useState(() => ({ growth: readStorage(GROWTH_KEY, { habits: [] }), diaries: readStorage(DIARY_KEY, []) }));
  const listRef = useRef(null);

  const match = matcher(query);
  const results = [];
  if (query.trim()) {
    for (const event of events) {
      if (!match(event.title, event.location, event.memo)) continue;
      const track = findTrack(tracks, event.track);
      results.push({ type: 'event', key: `e-${event.id}`, title: event.title, meta: `${shortDate(event.start)}${isMultiDay(event) ? ` ~ ${shortDate(eventEnd(event))}` : ''} · ${track.label}${event.allDay ? ' · 종일' : ` · ${event.startTime}`}${event.location ? ` · ${event.location}` : ''}`, item: event, sort: event.start });
    }
    // 반복 할 일은 같은 묶음에서 하나만 보여준다.
    const seenSeries = new Set();
    for (const todo of [...todos].sort((a, b) => Number(a.done) - Number(b.done) || (a.dueDate || '9999').localeCompare(b.dueDate || '9999'))) {
      if (!match(todo.title)) continue;
      if (todo.seriesId) {
        if (seenSeries.has(todo.seriesId)) continue;
        seenSeries.add(todo.seriesId);
      }
      const meta = todo.done && todo.doneAt ? `${shortDate(dateKey(new Date(todo.doneAt)))} 완료` : todo.dueDate ? `${shortDate(todo.dueDate)} 마감` : '마감일 없음';
      results.push({ type: 'todo', key: `t-${todo.id}`, title: todo.title, meta: `${meta}${todo.seriesId ? ' · 반복' : ''}`, item: todo, done: todo.done });
    }
    for (const memo of memos) {
      if (!match(memo.title, memo.body)) continue;
      results.push({ type: 'memo', key: `m-${memo.id}`, title: memoTitle(memo), meta: `${shortDate(memoDate(memo))}${memoPreview(memo).trim() ? ` · ${memoPreview(memo).trim().slice(0, 40)}` : ''}`, item: memo });
    }
    for (const habit of stored.growth.habits) {
      const category = CATEGORIES[habit.category] || CATEGORIES.etc;
      if (!match(habit.title, category.label)) continue;
      results.push({ type: 'habit', key: `h-${habit.id}`, title: habit.title, meta: `${category.label} · ${shortDate(habit.startDate)}부터`, item: habit });
    }
    for (const diary of [...stored.diaries].sort((a, b) => b.date.localeCompare(a.date))) {
      const mood = moodOf(diary.mood);
      if (!match(diary.content, mood.label, ...diary.emotions)) continue;
      results.push({ type: 'diary', key: `d-${diary.id}`, title: `${mood.emoji} ${diary.content.split('\n')[0] || mood.label}`, meta: `${shortDate(diary.date)} · ${[mood.label, ...diary.emotions].join(' · ')}`, item: diary });
    }
  }
  const sections = SECTIONS.map((section) => {
    const all = results.filter((result) => result.type === section.type);
    return { ...section, total: all.length, items: all.slice(0, PER_SECTION) };
  }).filter((section) => section.items.length);
  const flat = sections.flatMap((section) => section.items);
  const current = Math.min(active, Math.max(flat.length - 1, 0));

  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [current, query]);

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') onClose();
    if (!flat.length) return;
    if (event.key === 'ArrowDown') { event.preventDefault(); setActive((current + 1) % flat.length); }
    if (event.key === 'ArrowUp') { event.preventDefault(); setActive((current - 1 + flat.length) % flat.length); }
    if (event.key === 'Enter') { event.preventDefault(); onSelect(flat[current]); }
  };

  return (
    <div className="modal-backdrop search-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="search-palette" role="dialog" aria-modal="true" aria-label="앱 검색" onKeyDown={handleKeyDown}>
        <div className="search-input-row">
          <Search size={19} />
          <input value={query} onChange={(event) => { setQuery(event.target.value); setActive(0); }} placeholder="일정, 할 일, 메모, 목표, 기분 기록 검색" aria-label="검색어" autoFocus />
          <button type="button" className="icon-button compact" aria-label="검색 닫기" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="search-results" ref={listRef} role="listbox" aria-label="검색 결과">
          {!query.trim() && <p className="search-hint">찾고 싶은 단어를 입력해 보세요. 띄어쓰기로 여러 단어를 함께 찾을 수 있어요.<br />↑↓로 이동하고 Enter로 열어요.</p>}
          {query.trim() && !flat.length && <p className="search-hint">'{query.trim()}'에 대한 결과가 없어요.</p>}
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <div key={section.type} className="search-section">
                <h3><Icon size={13} />{section.label}<span>{section.total > PER_SECTION ? `${PER_SECTION}/${section.total}` : section.total}</span></h3>
                {section.items.map((result) => {
                  const index = flat.indexOf(result);
                  return (
                    <button key={result.key} type="button" role="option" aria-selected={index === current} className={`search-result ${index === current ? 'active' : ''} ${result.done ? 'done' : ''}`} onMouseEnter={() => setActive(index)} onClick={() => onSelect(result)}>
                      <strong><Highlight text={result.title} query={query} /></strong>
                      <small><Highlight text={result.meta} query={query} /></small>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
