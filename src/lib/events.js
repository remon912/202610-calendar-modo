import { dateKey, parseDateKey } from './date';

// 일정은 start(시작일)~endDate(종료일, 없으면 시작일과 같음)에 걸쳐 있다.
export const eventEnd = (event) => (event.endDate && event.endDate > event.start ? event.endDate : event.start);
export const isMultiDay = (event) => eventEnd(event) !== event.start;
export const occursOn = (event, key) => event.start <= key && key <= eventEnd(event);

export const addDays = (key, days) => {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + days);
  return dateKey(date);
};

const shortKey = (key) => `${Number(key.slice(5, 7))}.${Number(key.slice(8, 10))}`;
// 기간 일정의 '10.20~10.22' 표시
export const rangeLabel = (event) => `${shortKey(event.start)}~${shortKey(eventEnd(event))}`;
