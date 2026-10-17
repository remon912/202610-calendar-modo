import { dateKey, parseDateKey } from './date';

export const GROWTH_KEY = 'moa-calendar-growth';

export const CATEGORIES = {
  reading: { label: '독서', color: '#3f9b8f' },
  exercise: { label: '운동', color: '#e0884f' },
  study: { label: '공부', color: '#5977ed' },
  language: { label: '어학', color: '#8b6fd6' },
  habit: { label: '생활 습관', color: '#4ba77a' },
  etc: { label: '기타', color: '#6b7280' },
};

// 목표가 그 날짜에 해야 하는 날인지: 기간 안이고 반복 요일에 해당하면 true
export const isScheduled = (habit, key) =>
  key >= habit.startDate && (!habit.endDate || key <= habit.endDate) && habit.days.includes(parseDateKey(key).getDay());

export const isDone = (logs, habitId, key) => (logs[key] || []).includes(habitId);

// 오늘(아직 안 했으면 어제)부터 거슬러 올라가며 해야 하는 날을 연속으로 해낸 횟수
export function currentStreak(habit, logs) {
  const date = new Date();
  if (!isDone(logs, habit.id, dateKey(date))) date.setDate(date.getDate() - 1);
  let streak = 0;
  for (let i = 0; i < 400; i += 1) {
    const key = dateKey(date);
    if (key < habit.startDate) break;
    if (isScheduled(habit, key)) {
      if (!isDone(logs, habit.id, key)) break;
      streak += 1;
    }
    date.setDate(date.getDate() - 1);
  }
  return streak;
}

// month('YYYY-MM')의 1일부터 오늘(또는 그 달 말일)까지 해야 하는 날 중 해낸 비율
export function monthStats(habits, logs, month) {
  const today = dateKey(new Date());
  const date = parseDateKey(`${month}-01`);
  let scheduled = 0;
  let done = 0;
  while (dateKey(date).startsWith(month) && dateKey(date) <= today) {
    const key = dateKey(date);
    for (const habit of habits) {
      if (!isScheduled(habit, key)) continue;
      scheduled += 1;
      if (isDone(logs, habit.id, key)) done += 1;
    }
    date.setDate(date.getDate() + 1);
  }
  return { scheduled, done, rate: scheduled ? Math.round((done / scheduled) * 100) : 0 };
}
