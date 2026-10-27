import { useMemo } from 'react';
import { format, parseISO, subMonths, eachDayOfInterval } from 'date-fns';

/**
 * Calendar heatmap for the last 6 months.
 * Completions are a Set of YYYY-MM-DD strings.
 */
export default function CalendarHeatmap({ completions, color = '#6366f1', today }) {
  const doneSet = useMemo(() => new Set(completions), [completions]);

  const { weeks, months } = useMemo(() => {
    const todayD = parseISO(today);
    const startD = subMonths(todayD, 6);

    // Align to Sunday
    const startSunday = new Date(startD);
    startSunday.setUTCDate(startSunday.getUTCDate() - startSunday.getUTCDay());

    const days = eachDayOfInterval({ start: startSunday, end: todayD });

    // Split into weeks (columns)
    const weeksArr = [];
    let week = [];
    let monthLabels = [];
    let lastMonth = -1;

    days.forEach((d, i) => {
      const ds = format(d, 'yyyy-MM-dd');
      week.push({ date: ds, d });

      if (d.getUTCMonth() !== lastMonth) {
        monthLabels.push({ col: Math.floor(i / 7), label: format(d, 'MMM') });
        lastMonth = d.getUTCMonth();
      }

      if ((i + 1) % 7 === 0) {
        weeksArr.push(week);
        week = [];
      }
    });
    if (week.length) weeksArr.push(week);

    return { weeks: weeksArr, months: monthLabels };
  }, [today]);

  return (
    <div>
      {/* Month labels */}
      <div style={{ display: 'flex', gap: 3, marginBottom: 4, paddingLeft: 28 }}>
        {months.map((m, i) => (
          <div
            key={i}
            style={{
              fontSize: '0.65rem',
              color: 'var(--text-muted)',
              minWidth: 14 * 1 + 3, // approximate column width
              width: (weeks.length > m.col ? 17 : 14) + 'px',
              marginLeft: i === 0 ? m.col * 17 + 'px' : 0,
            }}
          >
            {m.label}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 4 }}>
        {/* Day labels */}
        <div
          style={{
            display: 'grid',
            gridTemplateRows: 'repeat(7, 14px)',
            gap: 3,
            fontSize: '0.6rem',
            color: 'var(--text-muted)',
            alignItems: 'center',
            marginTop: 0,
          }}
        >
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d, i) =>
            i % 2 === 0 ? <div key={d}>{d}</div> : <div key={d} />
          )}
        </div>

        {/* Grid */}
        <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateRows: 'repeat(7, 14px)',
              gridAutoColumns: '14px',
              gridAutoFlow: 'column',
              gap: 3,
            }}
          >
            {weeks.map((week) =>
              week.map(({ date, d }) => {
                const completed = doneSet.has(date);
                const isFuture = date > today;
                return (
                  <div
                    key={date}
                    data-tooltip={format(d, 'MMM d, yyyy') + (completed ? ' ✓' : '')}
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 3,
                      background: isFuture
                        ? 'transparent'
                        : completed
                        ? color
                        : 'var(--bg-elevated)',
                      boxShadow: completed ? `0 0 4px ${color}66` : 'none',
                      position: 'relative',
                      cursor: completed ? 'default' : 'default',
                      opacity: isFuture ? 0 : 1,
                      transition: 'transform 0.15s ease',
                    }}
                    title={format(d, 'MMM d, yyyy') + (completed ? ' ✓' : '')}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.4)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginTop: 12,
          justifyContent: 'flex-end',
          fontSize: '0.7rem',
          color: 'var(--text-muted)',
        }}
      >
        <span>Less</span>
        {[0.15, 0.35, 0.55, 0.75, 1].map((opacity, i) => (
          <div
            key={i}
            style={{
              width: 12,
              height: 12,
              borderRadius: 2,
              background: i === 0 ? 'var(--bg-elevated)' : color,
              opacity: i === 0 ? 1 : opacity,
            }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
