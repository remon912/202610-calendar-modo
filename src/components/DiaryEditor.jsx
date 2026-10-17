import { useState } from 'react';
import { Check, HeartHandshake, Trash2 } from 'lucide-react';
import { dateKey } from '../lib/date';
import { EMOTIONS, MOODS } from '../lib/diary';

// 하루의 기분(5단계)·감정 태그·짧은 일기를 남기는 입력 영역. 날짜가 바뀌면 key로 다시 만든다.
export default function DiaryEditor({ date, entry, onSave, onDelete }) {
  const [mood, setMood] = useState(entry?.mood ?? null);
  const [emotions, setEmotions] = useState(entry?.emotions ?? []);
  const [content, setContent] = useState(entry?.content ?? '');
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isFuture = date > dateKey(new Date());
  const dirty = mood !== (entry?.mood ?? null) || content !== (entry?.content ?? '') || emotions.join() !== (entry?.emotions ?? []).join();

  const toggleEmotion = (emotion) => setEmotions((current) => current.includes(emotion) ? current.filter((item) => item !== emotion) : [...current, emotion]);
  const save = () => {
    if (isFuture) return setError('아직 오지 않은 날의 기분은 기록할 수 없어요.');
    if (!mood) return setError('기분을 골라 주세요.');
    return onSave({ mood, emotions, content: content.trim() });
  };

  return (
    <div className="diary-editor">
      <div className="mood-picker" role="radiogroup" aria-label="기분">
        {MOODS.map((item) => (
          <button key={item.value} type="button" role="radio" aria-checked={mood === item.value} className={`mood-option ${mood === item.value ? 'selected' : ''}`} style={{ '--mood-color': item.color }} disabled={isFuture} onClick={() => { setMood(item.value); setError(''); }}>
            <span className="mood-emoji" aria-hidden="true">{item.emoji}</span><span>{item.label}</span>
          </button>
        ))}
      </div>
      <span className="field-label">어떤 감정이었나요? <span className="optional-label">여러 개 선택</span></span>
      <div className="emotion-chips">
        {EMOTIONS.map((emotion) => <button key={emotion} type="button" className={`emotion-chip ${emotions.includes(emotion) ? 'selected' : ''}`} aria-pressed={emotions.includes(emotion)} disabled={isFuture} onClick={() => toggleEmotion(emotion)}>{emotion}</button>)}
      </div>
      <label className="field-label" htmlFor="diary-content">오늘의 이야기 <span className="optional-label">선택</span></label>
      <textarea id="diary-content" className="text-input diary-content" value={content} onChange={(event) => setContent(event.target.value)} placeholder="오늘 있었던 일, 배운 점, 떠오른 생각을 적어보세요." maxLength={3000} rows={4} disabled={isFuture} />
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="memo-actions">
        {entry && <button className="button button-danger-quiet" type="button" onClick={() => (confirmDelete ? onDelete() : setConfirmDelete(true))}><Trash2 size={15} />{confirmDelete ? '한 번 더 누르면 삭제' : '삭제'}</button>}
        <span className="dialog-spacer" />
        <button className="button button-primary" type="button" onClick={save} disabled={!dirty || isFuture}><Check size={15} />{entry ? '기분 수정' : '기분 기록'}</button>
      </div>
    </div>
  );
}

// 한 달 동안의 기분 분포·평균·자주 느낀 감정
export function MoodSummary({ entries }) {
  if (!entries.length) return <p className="subtle-empty">이번 달에는 아직 기분 기록이 없어요. 날짜를 골라 기록해 보세요.</p>;
  const emotionCounts = entries.flatMap((diary) => diary.emotions).reduce((counts, emotion) => ({ ...counts, [emotion]: (counts[emotion] || 0) + 1 }), {});
  const topEmotions = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
  return (
    <>
      <ul className="mood-bars">
        {MOODS.map((mood) => {
          const count = entries.filter((diary) => diary.mood === mood.value).length;
          return (
            <li key={mood.value}>
              <span className="mood-bar-label"><span aria-hidden="true">{mood.emoji}</span>{mood.label}</span>
              <span className="mood-bar-track"><span style={{ width: `${(count / entries.length) * 100}%`, background: mood.color }} /></span>
              <span className="mood-bar-count">{count}일</span>
            </li>
          );
        })}
      </ul>
      {topEmotions.length > 0 && <p className="mood-top"><HeartHandshake size={14} />자주 느낀 감정 {topEmotions.map(([emotion, count]) => <span key={emotion} className="emotion-chip static">{emotion} {count}</span>)}</p>}
    </>
  );
}
