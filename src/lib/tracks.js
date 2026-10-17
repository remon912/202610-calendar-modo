// 사용자가 이름·색을 바꾸고 추가·삭제할 수 있는 일정 그룹. 쿠폰은 쿠폰함과 연결돼 있어 삭제할 수 없다.
export const DEFAULT_TRACKS = [
  { id: 'work', label: '회사', color: '#5977ed' },
  { id: 'personal', label: '개인', color: '#4ba77a' },
  { id: 'coupon', label: '쿠폰', color: '#ed9a53', locked: true },
];
// 할 일은 일정이 아니라 할 일 목록에서 오므로 고정 그룹으로 둔다.
export const TODO_TRACK = { id: 'todo', label: '할 일', color: '#8b6fd6', system: true };
export const SYSTEM_TRACKS = [TODO_TRACK];
export const TRACK_COLORS = ['#5977ed', '#4ba77a', '#ed9a53', '#8b6fd6', '#d65c7a', '#2f9e8f', '#c9a227', '#6b7280'];

export const trackStyle = (color) => ({ '--track-color': color });

// 삭제된 그룹을 가리키는 일정은 첫 번째 일반 그룹으로 보여준다.
export const findTrack = (tracks, id) => tracks.find((track) => track.id === id) || tracks.find((track) => !track.locked) || tracks[0];
