import { dateKey, parseDateKey } from './date';

export const REPEAT_LABELS = { none: '반복 안 함', daily: '매일', weekly: '매주', monthly: '매월' };
export const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
export const MAX_REPEAT = 366;
export const PRIORITY_LABELS = { 1: '높음', 2: '보통', 3: '낮음' };

// 반복 규칙을 기간 안의 날짜 목록으로 펼친다. 한도를 넘었는지 알 수 있도록 MAX_REPEAT + 1개까지만 만든다.
export function repeatDates({ freq, start, end, weekdays = [] }) {
  if (!start || !end || end < start) return [];
  const first = parseDateKey(start);
  const last = parseDateKey(end);
  const dates = [];
  if (freq === 'monthly') {
    const day = first.getDate();
    for (let offset = 0; dates.length <= MAX_REPEAT; offset += 1) {
      const date = new Date(first.getFullYear(), first.getMonth() + offset, day);
      if (date > last) break;
      // 31일처럼 그 달에 없는 날짜는 건너뛴다(다음 달 1일로 밀리지 않게).
      if (date.getDate() === day) dates.push(dateKey(date));
    }
    return dates;
  }
  for (const date = new Date(first); date <= last && dates.length <= MAX_REPEAT; date.setDate(date.getDate() + 1)) {
    if (freq === 'daily' || weekdays.includes(date.getDay())) dates.push(dateKey(date));
  }
  return dates;
}

export function repeatSummary(repeat) {
  if (!repeat || repeat.freq === 'none') return '';
  const days = repeat.freq === 'weekly' ? ` ${repeat.weekdays.map((day) => WEEKDAYS[day]).join('·')}` : '';
  return `${REPEAT_LABELS[repeat.freq]}${days}`;
}

// 반복 할 일은 아직 안 한 회차 중 가장 이른 것 하나만 목록에 보여준다(1년치가 한꺼번에 쌓이지 않게).
export function collapseSeries(openTodos) {
  const sorted = [...openTodos].sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));
  const seen = new Map();
  const result = [];
  for (const todo of sorted) {
    if (!todo.seriesId) {
      result.push(todo);
    } else if (seen.has(todo.seriesId)) {
      seen.get(todo.seriesId).remaining += 1;
    } else {
      const entry = { ...todo, remaining: 0 };
      seen.set(todo.seriesId, entry);
      result.push(entry);
    }
  }
  return result;
}
