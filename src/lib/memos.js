import { dateKey } from './date';

export const MEMO_KEY = 'moa-calendar-memos';
export const MEMO_COLORS = { yellow: '노랑', blue: '파랑', green: '초록', pink: '분홍' };
// styles.css의 .memo-yellow 등 --memo-tint 값과 같게 유지한다.
export const MEMO_TINTS = { yellow: '#f5c84c', blue: '#6f8cf0', green: '#4ba77a', pink: '#e9799b' };

export const memoTitle = (memo) => memo.title.trim() || memo.body.trim().split('\n')[0] || '제목 없는 메모';
export const memoPreview = (memo) => (memo.title.trim() ? memo.body : memo.body.trim().split('\n').slice(1).join(' '));
// 날짜를 지정하기 전에 만든 메모는 마지막 저장일을 날짜로 본다.
export const memoDate = (memo) => memo.date || dateKey(new Date(memo.updatedAt));

// 날짜 최신순, 같은 날이면 최근 저장순
export const sortMemos = (memos) =>
  [...memos].sort((a, b) => memoDate(b).localeCompare(memoDate(a)) || b.updatedAt.localeCompare(a.updatedAt));
