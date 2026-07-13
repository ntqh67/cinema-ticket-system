import { formatDateInDaNang } from './danang-date';

export const STAFF_BASE_HOURLY_RATE = 25_000;
export const STAFF_NIGHT_HOURLY_RATE = 32_500;

export function calculateStaffPay(checkInAt: Date | null, checkOutAt: Date | null) {
  if (!checkInAt || !checkOutAt || checkOutAt <= checkInAt) {
    return { baseMinutes: 0, nightMinutes: 0, totalMinutes: 0, salary: 0 };
  }

  let cursor = new Date(checkInAt);
  let baseMilliseconds = 0;
  let nightMilliseconds = 0;
  while (cursor < checkOutAt) {
    const date = formatDateInDaNang(cursor);
    const hour = Number(
      new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: '2-digit',
        hourCycle: 'h23',
      }).format(cursor),
    );
    const isNight = hour >= 22 || hour < 8;
    const boundary = isNight
      ? hour >= 22
        ? new Date(`${thisDayAfter(date)}T08:00:00.000+07:00`)
        : new Date(`${date}T08:00:00.000+07:00`)
      : new Date(`${date}T22:00:00.000+07:00`);
    const segmentEnd = boundary < checkOutAt ? boundary : checkOutAt;
    const milliseconds = segmentEnd.getTime() - cursor.getTime();
    if (isNight) nightMilliseconds += milliseconds;
    else baseMilliseconds += milliseconds;
    cursor = new Date(segmentEnd);
  }

  const baseMinutes = baseMilliseconds / 60_000;
  const nightMinutes = nightMilliseconds / 60_000;
  return {
    baseMinutes: Math.round(baseMinutes),
    nightMinutes: Math.round(nightMinutes),
    totalMinutes: Math.round(baseMinutes + nightMinutes),
    salary: Math.round(
      (baseMinutes / 60) * STAFF_BASE_HOURLY_RATE +
        (nightMinutes / 60) * STAFF_NIGHT_HOURLY_RATE,
    ),
  };
}

function thisDayAfter(date: string) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
}
