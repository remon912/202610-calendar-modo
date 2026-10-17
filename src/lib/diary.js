export const DIARY_KEY = 'moa-calendar-diaries';

// 기분은 5단계. 색은 캘린더 칸과 통계 막대에 쓴다.
export const MOODS = [
  { value: 5, emoji: '😄', label: '아주 좋음', color: '#f0a03a' },
  { value: 4, emoji: '🙂', label: '좋음', color: '#6dbb72' },
  { value: 3, emoji: '😐', label: '보통', color: '#98a2b5' },
  { value: 2, emoji: '😔', label: '우울', color: '#7390d8' },
  { value: 1, emoji: '😢', label: '힘듦', color: '#b07cc6' },
];
export const moodOf = (value) => MOODS.find((mood) => mood.value === value) || MOODS[2];

export const EMOTIONS = ['행복', '감사', '설렘', '뿌듯', '평온', '피곤', '불안', '짜증', '외로움', '슬픔'];

export const averageMood = (entries) => (entries.length ? entries.reduce((sum, diary) => sum + diary.mood, 0) / entries.length : 0);
