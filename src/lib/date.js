// 날짜는 'YYYY-MM-DD' 문자열(로컬 기준)로 저장·비교한다.
export const dateKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const parseDateKey = (key) => new Date(`${key}T00:00:00`);

// 시각은 그대로 두고 날짜만 바꾼다(완료일을 고쳐도 주·일 보기의 완료 시각은 유지).
export const moveToDate = (iso, key) => {
  const date = new Date(iso);
  const [year, month, day] = key.split('-').map(Number);
  date.setFullYear(year, month - 1, day);
  return date.toISOString();
};

export const formatDate = (date, options = { month: 'long', day: 'numeric', weekday: 'short' }) =>
  new Intl.DateTimeFormat('ko-KR', options).format(date);
