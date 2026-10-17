import { useEffect, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { ArrowLeft, ArrowRight, Check, Flame, Pencil, Plus, Smile, Sprout, Target, TrendingUp } from 'lucide-react';
import CategoryIcon from '../components/CategoryIcon';
import DiaryEditor, { MoodSummary } from '../components/DiaryEditor';
import HabitDialog from '../components/HabitDialog';
import { dateKey, formatDate, parseDateKey } from '../lib/date';
import { DIARY_KEY, averageMood, moodOf } from '../lib/diary';
import { CATEGORIES, GROWTH_KEY, currentStreak, isDone, isScheduled, monthStats } from '../lib/growth';
import { readStorage, writeStorage } from '../lib/storage';
import { WEEKDAYS } from '../lib/todos';

const daysLabel = (days) => (days.length === 7 ? '매일' : days.length === 5 && !days.includes(0) && !days.includes(6) ? '평일' : days.map((day) => WEEKDAYS[day]).join('·'));

// 자기계발: 요일별 목표 실천 체크와 그날의 기분(감정일기)을 하루 단위로 함께 기록하고 달력·통계로 돌아본다.
// initialDate: 검색 결과에서 들어오면 그 날짜를 골라 둔 채로 연다.
export default function GrowthPage({ initialDate, onFocusConsumed, setNotice }) {
  const [data, setData] = useState(() => readStorage(GROWTH_KEY, { habits: [], logs: {} }));
  const [diaries, setDiaries] = useState(() => readStorage(DIARY_KEY, []));
  const [selected, setSelected] = useState(() => initialDate || dateKey(new Date()));
  const [range, setRange] = useState(null);
  const [month, setMonth] = useState(() => dateKey(new Date()).slice(0, 7));
  const [title, setTitle] = useState('');
  const [draft, setDraft] = useState(null);
  const calendarRef = useRef(null);
  const { habits, logs } = data;
  const today = dateKey(new Date());

  useEffect(() => { writeStorage(GROWTH_KEY, data); }, [data]);
  useEffect(() => { writeStorage(DIARY_KEY, diaries); }, [diaries]);
  useEffect(() => {
    if (initialDate) onFocusConsumed();
  }, [initialDate, onFocusConsumed]);

  const toggleCheck = (habitId, key) => {
    if (key > today) return setNotice('아직 오지 않은 날은 체크할 수 없어요.');
    return setData((current) => {
      const dayLogs = current.logs[key] || [];
      const nextDay = dayLogs.includes(habitId) ? dayLogs.filter((id) => id !== habitId) : [...dayLogs, habitId];
      return { ...current, logs: { ...current.logs, [key]: nextDay } };
    });
  };
  const saveHabit = (habit) => {
    setData((current) => ({
      ...current,
      habits: habit.id ? current.habits.map((item) => (item.id === habit.id ? habit : item)) : [...current.habits, { ...habit, id: crypto.randomUUID(), createdAt: new Date().toISOString() }],
    }));
    setDraft(null);
    setNotice(habit.id ? '목표를 수정했어요.' : `'${habit.title}' 목표를 추가했어요.`);
  };
  // 목표를 지우면 그 목표의 체크 기록도 함께 지운다.
  const deleteHabit = (id) => {
    setData((current) => ({
      habits: current.habits.filter((habit) => habit.id !== id),
      logs: Object.fromEntries(Object.entries(current.logs).map(([key, ids]) => [key, ids.filter((item) => item !== id)])),
    }));
    setDraft(null);
    setNotice('목표를 삭제했어요.');
  };
  const openNew = () => setDraft({ id: '', title: '', category: 'reading', days: [0, 1, 2, 3, 4, 5, 6], startDate: today, endDate: '' });

  const entry = diaries.find((diary) => diary.date === selected);
  const saveDiary = (fields) => {
    const next = { ...fields, id: entry?.id || crypto.randomUUID(), date: selected, updatedAt: new Date().toISOString() };
    setDiaries((current) => [...current.filter((diary) => diary.date !== selected), next]);
    setNotice(`${formatDate(parseDateKey(selected), { month: 'long', day: 'numeric' })}의 기분을 기록했어요.`);
  };
  const deleteDiary = () => {
    setDiaries((current) => current.filter((diary) => diary.date !== selected));
    setNotice('기분 기록을 삭제했어요.');
  };

  const dayHabits = habits.filter((habit) => isScheduled(habit, selected));
  const dayDone = dayHabits.filter((habit) => isDone(logs, habit.id, selected)).length;
  const todayHabits = habits.filter((habit) => isScheduled(habit, today));
  const todayDone = todayHabits.filter((habit) => isDone(logs, habit.id, today)).length;
  const stats = monthStats(habits, logs, month);
  const bestStreak = Math.max(0, ...habits.map((habit) => currentStreak(habit, logs)));
  const monthDiaries = diaries.filter((diary) => diary.date.startsWith(month));
  const monthMood = averageMood(monthDiaries);

  // 달력 칸 하나에 그날의 기분 이모지와 '해낸 수/해야 할 수'를 함께 보여준다(오늘까지만).
  const dayEvents = [];
  if (range) {
    for (const date = parseDateKey(range.start); dateKey(date) < range.end && dateKey(date) <= today; date.setDate(date.getDate() + 1)) {
      const key = dateKey(date);
      const scheduled = habits.filter((habit) => isScheduled(habit, key));
      const diary = diaries.find((item) => item.date === key);
      if (!scheduled.length && !diary) continue;
      const done = scheduled.filter((habit) => isDone(logs, habit.id, key)).length;
      const level = !scheduled.length ? 'mood' : done === scheduled.length ? 'full' : done ? 'part' : 'none';
      dayEvents.push({ id: key, start: key, allDay: true, title: scheduled.length ? `${done}/${scheduled.length}` : '', classNames: [`growth-${level}`], extendedProps: { mood: diary?.mood } });
    }
  }
  const move = (direction) => calendarRef.current?.getApi()[direction]();

  return (
    <div className="page-content secondary-page theme-growth">
      <section className="welcome-row secondary-welcome"><div><div className="eyebrow"><span className="eyebrow-dot" /> GROW A LITTLE EVERY DAY</div><h1>오늘도 한 걸음 성장해요.</h1><p className="page-subtitle">작은 실천과 그날의 마음을 함께 기록하며 나를 돌봐요.</p></div><button className="button button-primary" type="button" onClick={openNew}><Plus size={17} />목표 추가</button></section>

      <section className="summary-grid growth-summary four" aria-label="자기계발 요약">
        <article className="summary-card surface-card"><span className="summary-icon themed"><Target size={18} /></span><div className="summary-copy"><span>오늘 실천</span><strong>{todayDone}/{todayHabits.length}</strong><small>{todayHabits.length ? (todayDone === todayHabits.length ? '오늘 목표를 모두 해냈어요!' : `${todayHabits.length - todayDone}개 남았어요`) : '오늘은 쉬는 날이에요'}</small></div></article>
        <article className="summary-card surface-card"><span className="summary-icon themed"><TrendingUp size={18} /></span><div className="summary-copy"><span>{Number(month.slice(5))}월 달성률</span><strong>{stats.rate}%</strong><small>{stats.done}/{stats.scheduled}번 실천</small></div></article>
        <article className="summary-card surface-card"><span className="summary-icon flame"><Flame size={18} /></span><div className="summary-copy"><span>최고 연속 달성</span><strong>{bestStreak}일</strong><small>{bestStreak ? '흐름을 이어가 보세요' : '오늘부터 시작해요'}</small></div></article>
        <article className="summary-card surface-card"><span className="summary-icon mood"><Smile size={18} /></span><div className="summary-copy"><span>{Number(month.slice(5))}월 평균 기분</span><strong>{monthDiaries.length ? `${moodOf(Math.round(monthMood)).emoji} ${monthMood.toFixed(1)}` : '-'}</strong><small>{monthDiaries.length ? `${monthDiaries.length}일 기록` : '기분을 기록해 보세요'}</small></div></article>
      </section>

      <div className="theme-layout">
        <section className="surface-card theme-calendar-card">
          <div className="todo-calendar-toolbar">
            <div className="calendar-controls">
              <button className="icon-button compact" type="button" aria-label="이전 달" onClick={() => move('prev')}><ArrowLeft size={17} /></button>
              <button className="today-button" type="button" onClick={() => { move('today'); setSelected(today); }}>오늘</button>
              <button className="icon-button compact" type="button" aria-label="다음 달" onClick={() => move('next')}><ArrowRight size={17} /></button>
            </div>
            <strong>{title}</strong>
            <span className="todo-legend"><i className="growth-full" />모두 달성<i className="growth-part" />일부<i className="growth-none" />미달성</span>
          </div>
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            initialDate={selected}
            locale="ko"
            height="auto"
            headerToolbar={false}
            eventDisplay="block"
            events={dayEvents}
            dayCellClassNames={(arg) => (dateKey(arg.date) === selected ? ['picked-day'] : [])}
            dateClick={(info) => setSelected(dateKey(info.date))}
            eventClick={(info) => setSelected(info.event.id)}
            datesSet={(info) => {
              setTitle(info.view.title);
              setMonth(dateKey(info.view.currentStart).slice(0, 7));
              setRange({ start: dateKey(info.start), end: dateKey(info.end) });
            }}
            eventContent={(arg) => {
              const { mood } = arg.event.extendedProps;
              return (
                <div className="calendar-event-content growth-cell">
                  {mood && <span className="diary-emoji" role="img" aria-label={moodOf(mood).label}>{moodOf(mood).emoji}</span>}
                  {arg.event.classNames.includes('growth-full') && <Check size={10} strokeWidth={3} />}
                  {arg.event.title && <span>{arg.event.title}</span>}
                </div>
              );
            }}
          />
        </section>

        <div className="theme-side">
          <section className="surface-card theme-side-card">
            <div className="side-card-heading"><div><span className="side-label">{selected === today ? 'TODAY' : 'MY DAY'}</span><h2>{formatDate(parseDateKey(selected), { month: 'long', day: 'numeric', weekday: 'long' })}</h2></div>{dayHabits.length > 0 && <span className="mood-average">{dayDone}/{dayHabits.length}</span>}</div>

            <h3 className="day-section-title"><Target size={14} />실천 체크</h3>
            {dayHabits.length > 0 && <div className="growth-progress" aria-hidden="true"><span style={{ width: `${(dayDone / dayHabits.length) * 100}%` }} /></div>}
            {dayHabits.length ? (
              <ul className="growth-checklist">
                {dayHabits.map((habit) => {
                  const done = isDone(logs, habit.id, selected);
                  return (
                    <li key={habit.id}>
                      <button type="button" className={`growth-check ${done ? 'done' : ''}`} style={{ '--track-color': CATEGORIES[habit.category].color }} aria-pressed={done} disabled={selected > today} onClick={() => toggleCheck(habit.id, selected)}>
                        <span className="task-check">{done && <Check size={14} />}</span>
                        <span className="growth-check-copy"><strong>{habit.title}</strong><small><CategoryIcon id={habit.category} size={12} />{CATEGORIES[habit.category].label}</small></span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : <p className="subtle-empty">{habits.length ? '이날은 실천할 목표가 없어요.' : '아직 목표가 없어요. 목표를 추가해 보세요.'}</p>}

            <h3 className="day-section-title"><Smile size={14} />오늘의 기분</h3>
            <DiaryEditor key={`${selected}-${entry?.updatedAt || 'new'}`} date={selected} entry={entry} onSave={saveDiary} onDelete={deleteDiary} />
          </section>

          <section className="surface-card theme-side-card">
            <div className="side-card-heading"><div><span className="side-label">MY GOALS</span><h2>나의 목표</h2></div><button className="icon-button compact" type="button" aria-label="목표 추가" onClick={openNew}><Plus size={17} /></button></div>
            {habits.length ? (
              <ul className="habit-list">
                {habits.map((habit) => {
                  const own = monthStats([habit], logs, month);
                  const streak = currentStreak(habit, logs);
                  return (
                    <li key={habit.id} className="habit-row" style={{ '--track-color': CATEGORIES[habit.category].color }}>
                      <span className="track-manage-icon"><CategoryIcon id={habit.category} size={15} /></span>
                      <span className="habit-copy">
                        <strong>{habit.title}</strong>
                        <small>{daysLabel(habit.days)}{habit.endDate && ` · ~${formatDate(parseDateKey(habit.endDate), { month: 'numeric', day: 'numeric' })}`}{streak > 0 && <> · <Flame size={11} />{streak}일 연속</>}</small>
                        <span className="habit-rate"><span style={{ width: `${own.rate}%` }} /></span>
                      </span>
                      <span className="habit-percent">{own.rate}%</span>
                      <button type="button" className="icon-button compact" aria-label={`${habit.title} 수정`} onClick={() => setDraft(habit)}><Pencil size={14} /></button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="empty-state compact-empty"><span><Sprout size={22} /></span><strong>첫 목표를 세워볼까요?</strong><p>독서, 운동, 공부처럼 꾸준히 하고 싶은 일을 추가해요.</p><button className="button button-primary" type="button" onClick={openNew}><Plus size={15} />목표 추가</button></div>
            )}
          </section>

          <section className="surface-card theme-side-card">
            <div className="side-card-heading"><div><span className="side-label">THIS MONTH</span><h2>이번 달 마음</h2></div></div>
            <MoodSummary entries={monthDiaries} />
          </section>
        </div>
      </div>
      {draft && <HabitDialog initial={draft} onClose={() => setDraft(null)} onSave={saveHabit} onDelete={deleteHabit} />}
    </div>
  );
}
