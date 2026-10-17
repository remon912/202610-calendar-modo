import { createElement } from 'react';
import { BriefcaseBusiness, Gift, ListTodo, Sun, Tag } from 'lucide-react';

const ICONS = { work: BriefcaseBusiness, personal: Sun, coupon: Gift, todo: ListTodo };

// 기본 그룹은 고유 아이콘, 사용자가 만든 그룹은 태그 아이콘을 쓴다.
export default function TrackIcon({ id, size = 14 }) {
  return createElement(ICONS[id] || Tag, { size });
}
