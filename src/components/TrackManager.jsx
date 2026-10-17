import { useState } from 'react';
import { Check, Lock, Pencil, Plus, Trash2, X } from 'lucide-react';
import { SYSTEM_TRACKS, TRACK_COLORS, trackStyle } from '../lib/tracks';

const SYSTEM_NOTES = { todo: '할 일 목록과 연결돼요 · 완료한 날짜에 표시' };
import TrackIcon from './TrackIcon';

// 캘린더 상단 그룹(회사·개인·쿠폰 …)을 추가·수정·삭제하는 설정 창
export default function TrackManager({ tracks, counts, onAdd, onUpdate, onDelete, onClose }) {
  const [editing, setEditing] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [error, setError] = useState('');
  const deletable = tracks.filter((track) => !track.locked);

  const startEdit = (track) => {
    setEditing({ ...track });
    setConfirmId(null);
    setError('');
  };
  const startNew = () => startEdit({ id: '', label: '', color: TRACK_COLORS[tracks.length % TRACK_COLORS.length] });
  const saveEdit = () => {
    const label = editing.label.trim();
    if (!label) return setError('그룹 이름을 입력해 주세요.');
    if ([...tracks, ...SYSTEM_TRACKS].some((track) => track.id !== editing.id && track.label === label)) return setError('같은 이름의 그룹이 이미 있어요.');
    if (editing.id) onUpdate({ ...editing, label });
    else onAdd({ ...editing, label });
    setEditing(null);
    return setError('');
  };
  const handleDelete = (track) => {
    if (confirmId !== track.id) return setConfirmId(track.id);
    setConfirmId(null);
    return onDelete(track.id);
  };
  const fallbackLabel = (id) => deletable.find((track) => track.id !== id)?.label;

  const editor = (
    <div className="track-editor">
      <input className="text-input" value={editing?.label ?? ''} onChange={(event) => setEditing((current) => ({ ...current, label: event.target.value }))} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); saveEdit(); } }} placeholder="예: 운동, 가족, 스터디" maxLength={20} aria-label="그룹 이름" autoFocus />
      <div className="color-choice small" role="group" aria-label="그룹 색상">
        {TRACK_COLORS.map((color) => (
          <button key={color} type="button" className={`color-swatch ${editing?.color === color ? 'selected' : ''}`} style={{ '--swatch': color }} aria-label={`색상 ${color}`} aria-pressed={editing?.color === color} onClick={() => setEditing((current) => ({ ...current, color }))} />
        ))}
      </div>
      <div className="track-editor-actions">
        <button className="button button-quiet" type="button" onClick={() => { setEditing(null); setError(''); }}>취소</button>
        <button className="button button-primary" type="button" onClick={saveEdit}><Check size={15} />{editing?.id ? '저장' : '추가'}</button>
      </div>
    </div>
  );

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="event-dialog track-manager" role="dialog" aria-modal="true" aria-labelledby="track-manager-title">
        <div className="dialog-heading"><div><span className="side-label">CALENDAR GROUPS</span><h2 id="track-manager-title">캘린더 그룹 설정</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="창 닫기"><X size={19} /></button></div>
        <ul className="track-manage-list">
          {tracks.map((track) => {
            if (editing?.id === track.id) return <li key={track.id} className="track-manage-row editing">{editor}</li>;
            return (
              <li key={track.id} className="track-manage-row" style={trackStyle(track.color)}>
                <span className="track-manage-icon"><TrackIcon id={track.id} size={15} /></span>
                <span className="track-manage-copy"><strong>{track.label}</strong><small>{confirmId === track.id ? (counts[track.id] ? `일정 ${counts[track.id]}개는 '${fallbackLabel(track.id)}'(으)로 옮겨져요` : '일정이 없는 그룹이에요') : `일정 ${counts[track.id] || 0}개`}</small></span>
                <button type="button" className="icon-button compact" aria-label={`${track.label} 수정`} onClick={() => startEdit(track)}><Pencil size={15} /></button>
                {track.locked ? (
                  <span className="track-lock" title="쿠폰함과 연결된 그룹이라 삭제할 수 없어요"><Lock size={14} /></span>
                ) : (
                  <button type="button" className={`icon-button compact agenda-delete ${confirmId === track.id ? 'confirm' : ''}`} disabled={deletable.length <= 1} title={deletable.length <= 1 ? '일정 그룹은 하나 이상 있어야 해요' : undefined} aria-label={confirmId === track.id ? `${track.label} 삭제 확인` : `${track.label} 삭제`} onClick={() => handleDelete(track)}>
                    {confirmId === track.id ? '삭제' : <Trash2 size={15} />}
                  </button>
                )}
              </li>
            );
          })}
          {SYSTEM_TRACKS.map((track) => (
            <li key={track.id} className="track-manage-row system" style={trackStyle(track.color)}>
              <span className="track-manage-icon"><TrackIcon id={track.id} size={15} /></span>
              <span className="track-manage-copy"><strong>{track.label}</strong><small>{SYSTEM_NOTES[track.id]}</small></span>
              <span className="track-lock" title="다른 기능과 연결된 고정 그룹이에요"><Lock size={14} /></span>
            </li>
          ))}
          {editing && !editing.id && <li className="track-manage-row editing">{editor}</li>}
        </ul>
        {error && <p className="form-error" role="alert">{error}</p>}
        {!editing && <button type="button" className="group-menu-add track-add" onClick={startNew}><Plus size={15} />새 그룹 추가</button>}
        <p className="dialog-help">그룹을 삭제하면 그 그룹의 일정은 지워지지 않고 다른 그룹으로 옮겨져요.</p>
      </section>
    </div>
  );
}
