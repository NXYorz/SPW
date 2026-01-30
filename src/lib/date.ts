export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function toISODate(d: Date): string {
  const year = d.getFullYear();
  const month = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${year}-${month}-${day}`;
}

export function atNoon(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
}

export function startOfMonth(anchor: Date): Date {
  return atNoon(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
}

export function addMonths(anchor: Date, delta: number): Date {
  return atNoon(new Date(anchor.getFullYear(), anchor.getMonth() + delta, 1));
}

export function formatMonthTitle(anchor: Date): string {
  return `${anchor.getFullYear()} 年 ${pad2(anchor.getMonth() + 1)} 月`;
}

export function getMonthGrid(anchor: Date, weekStartsOnMonday = true): Array<{ date: Date; inMonth: boolean }> {
  const first = startOfMonth(anchor);
  const year = first.getFullYear();
  const month = first.getMonth();

  const firstDay = atNoon(new Date(year, month, 1));
  const weekday = firstDay.getDay(); // 0 Sun .. 6 Sat
  const offset = weekStartsOnMonday ? (weekday === 0 ? 6 : weekday - 1) : weekday;

  const gridStart = atNoon(new Date(year, month, 1 - offset));
  const cells: Array<{ date: Date; inMonth: boolean }> = [];

  for (let i = 0; i < 42; i += 1) {
    const cell = atNoon(new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i));
    cells.push({ date: cell, inMonth: cell.getMonth() === month });
  }

  return cells;
}

export function isSameISODate(a: string, b: string): boolean {
  return a === b;
}
