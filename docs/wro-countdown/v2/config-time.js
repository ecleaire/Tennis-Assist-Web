// Time helpers use Japan Standard Time even when the viewer is abroad.
export function jstParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);

  const result = {};
  parts.forEach(part => {
    result[part.type] = part.value;
  });
  return result;
}

function jstDateStamp(date) {
  const parts = jstParts(date);
  return Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day)
  );
}

export function calendarDaysUntilJst(targetMilliseconds, date = new Date()) {
  const targetDay = jstDateStamp(new Date(targetMilliseconds));
  const currentDay = jstDateStamp(date);
  return Math.max(
    0,
    Math.round((targetDay - currentDay) / 86400000)
  );
}

export const jstStamp = (year, month, day, hour, minute) =>
  Date.UTC(year, month - 1, day, hour - 9, minute);

export function duration(milliseconds) {
  const total = Math.max(0, Math.floor(milliseconds / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60
  };
}
