import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, CalendarDays, Check, GripHorizontal, Plus, StickyNote, Trash2, X } from 'lucide-react';
import { dateKey, formatDate, parseDateKey } from '../lib/date';
import { MEMO_COLORS, memoDate, memoPreview, memoTitle, sortMemos } from '../lib/memos';
import { readStorage, writeStorage } from '../lib/storage';
import DatePicker from './DatePicker';

const POSITION_KEY = 'moa-calendar-memo-position';
const EDGE = 12;

const formatSavedAt = (iso) =>
  new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
const newMemo = (date = dateKey(new Date())) => ({ id: '', title: '', body: '', color: 'yellow', date });

// 창 크기가 바뀌거나 드래그로 화면 밖에 나가도 메모장이 보이도록 위치를 화면 안으로 제한한다.
function clampPosition({ x, y }, panel) {
  const width = panel?.offsetWidth ?? 340;
  const height = panel?.offsetHeight ?? 420;
  return {
    x: Math.max(EDGE, Math.min(x, window.innerWidth - width - EDGE)),
    y: Math.max(EDGE, Math.min(y, window.innerHeight - height - EDGE)),
  };
}

// target: 열자마자 편집할 메모 { id } 또는 새 메모의 날짜 { date }. 메모 목록은 App이 가지고 있다.
export default function MemoPad({ memos, saveMemos, target, onClose, setNotice }) {
  const [draft, setDraft] = useState(() => {
    if (target?.id) {
      const memo = memos.find((item) => item.id === target.id);
      if (memo) return { ...memo, date: memoDate(memo) };
    }
    return target?.date ? newMemo(target.date) : null;
  });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [position, setPosition] = useState(() => {
    const saved = readStorage(POSITION_KEY, null);
    return saved && clampPosition(saved, null);
  });
  const panelRef = useRef(null);
  const dragRef = useRef(null);

  const saved = draft?.id ? memos.find((memo) => memo.id === draft.id) : null;
  const dirty = Boolean(draft) && (saved
    ? draft.title !== saved.title || draft.body !== saved.body || draft.color !== saved.color || draft.date !== memoDate(saved)
    : Boolean(draft.title.trim() || draft.body.trim()));

  useEffect(() => {
    const keepInView = () => setPosition((current) => current && clampPosition(current, panelRef.current));
    window.addEventListener('resize', keepInView);
    return () => window.removeEventListener('resize', keepInView);
  }, []);

  const confirmLeave = () => !dirty || window.confirm('저장하지 않은 내용이 있어요. 저장하지 않고 나갈까요?');
  const openDraft = (memo) => {
    if (!confirmLeave()) return;
    setDraft(memo.id ? { ...memo, date: memoDate(memo) } : memo);
    setConfirmDelete(false);
  };
  const startNew = () => openDraft(newMemo());
  const goBack = () => {
    if (!confirmLeave()) return;
    setDraft(null);
    setConfirmDelete(false);
  };
  const close = () => {
    if (confirmLeave()) onClose();
  };
  const update = (key, value) => setDraft((current) => ({ ...current, [key]: value }));

  const persist = (next) => {
    if (saveMemos(next)) return true;
    setNotice('메모를 저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.');
    return false;
  };
  const saveDraft = () => {
    if (!draft.title.trim() && !draft.body.trim()) {
      setNotice('메모 내용을 입력해 주세요.');
      return;
    }
    if (!draft.date) {
      setNotice('메모를 남길 날짜를 골라 주세요.');
      return;
    }
    const memo = { ...draft, id: draft.id || crypto.randomUUID(), updatedAt: new Date().toISOString() };
    const next = draft.id ? memos.map((item) => (item.id === memo.id ? memo : item)) : [memo, ...memos];
    if (!persist(next)) return;
    setDraft(memo);
    setNotice(`${formatDate(parseDateKey(memo.date), { month: 'long', day: 'numeric' })}에 메모를 저장했어요.`);
  };
  const deleteDraft = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    if (!persist(memos.filter((memo) => memo.id !== draft.id))) return;
    setDraft(null);
    setConfirmDelete(false);
    setNotice('메모를 삭제했어요.');
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') close();
    if (draft && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      if (dirty) saveDraft();
    }
  };

  // 데스크톱에서만 헤더를 잡고 끌어 옮긴다. 모바일은 하단 시트로 고정.
  const startDrag = (event) => {
    if (event.button !== 0 || event.target.closest('button') || window.matchMedia('(max-width: 700px)').matches) return;
    const rect = panelRef.current.getBoundingClientRect();
    dragRef.current = { dx: event.clientX - rect.left, dy: event.clientY - rect.top };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveDrag = (event) => {
    if (!dragRef.current) return;
    setPosition(clampPosition({ x: event.clientX - dragRef.current.dx, y: event.clientY - dragRef.current.dy }, panelRef.current));
  };
  const endDrag = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    writeStorage(POSITION_KEY, position);
  };

  const sortedMemos = sortMemos(memos);

  return (
    <section
      ref={panelRef}
      className={`memo-pad ${position ? 'positioned' : ''}`}
      style={position ? { '--memo-x': `${position.x}px`, '--memo-y': `${position.y}px` } : undefined}
      role="dialog"
      aria-labelledby="memo-pad-title"
      onKeyDown={handleKeyDown}
    >
      <header className="memo-pad-header" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}>
        {draft
          ? <button type="button" className="icon-button compact" aria-label="메모 목록으로" onClick={goBack}><ArrowLeft size={17} /></button>
          : <span className="memo-pad-icon"><StickyNote size={16} /></span>}
        <h2 id="memo-pad-title">{draft ? (draft.id ? '메모 수정' : '새 메모') : '메모장'}</h2>
        {!draft && <span className="memo-count">{memos.length}</span>}
        <GripHorizontal className="memo-grip" size={16} aria-hidden="true" />
        {!draft && <button type="button" className="icon-button compact" aria-label="새 메모 추가" onClick={startNew}><Plus size={17} /></button>}
        <button type="button" className="icon-button compact" aria-label="메모장 닫기" onClick={close}><X size={17} /></button>
      </header>

      {draft ? (
        <div className="memo-editor">
          <label className="memo-date-field">
            <CalendarDays size={15} />
            <span>날짜</span>
            <DatePicker value={draft.date} onChange={(value) => update('date', value)} ariaLabel="메모 날짜" />
          </label>
          <input className="text-input memo-title-input" value={draft.title} onChange={(event) => update('title', event.target.value)} placeholder="제목 (선택)" aria-label="메모 제목" maxLength={100} autoFocus={!draft.id} />
          <textarea className={`memo-body memo-${draft.color}`} value={draft.body} onChange={(event) => update('body', event.target.value)} placeholder="떠오르는 생각을 적어두세요" aria-label="메모 내용" maxLength={5000} />
          <div className="memo-colors" role="group" aria-label="메모 색상">
            {Object.entries(MEMO_COLORS).map(([id, label]) => (
              <button key={id} type="button" className={`memo-swatch memo-${id} ${draft.color === id ? 'selected' : ''}`} aria-label={label} aria-pressed={draft.color === id} onClick={() => update('color', id)} />
            ))}
            <span className="memo-status" aria-live="polite">
              {dirty ? '저장하지 않은 변경 사항' : saved ? `${formatSavedAt(saved.updatedAt)} 저장됨` : ''}
            </span>
          </div>
          <div className="memo-actions">
            {draft.id && <button className="button button-danger-quiet" type="button" onClick={deleteDraft}><Trash2 size={15} />{confirmDelete ? '한 번 더 누르면 삭제' : '삭제'}</button>}
            <span className="dialog-spacer" />
            <button className="button button-primary" type="button" onClick={saveDraft} disabled={!dirty}><Check size={15} />저장</button>
          </div>
        </div>
      ) : sortedMemos.length ? (
        <ul className="memo-list">
          {sortedMemos.map((memo) => (
            <li key={memo.id}>
              <button type="button" className={`memo-item memo-${memo.color}`} onClick={() => openDraft(memo)}>
                <strong>{memoTitle(memo)}</strong>
                {memoPreview(memo).trim() && <span>{memoPreview(memo)}</span>}
                <small>{formatDate(parseDateKey(memoDate(memo)), { month: 'long', day: 'numeric', weekday: 'short' })}</small>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="memo-empty">
          <span><StickyNote size={22} /></span>
          <strong>아직 메모가 없어요</strong>
          <p>캘린더를 보면서 떠오른 생각을 적어두세요.</p>
          <button className="button button-primary" type="button" onClick={startNew}><Plus size={15} />새 메모</button>
        </div>
      )}
    </section>
  );
}
