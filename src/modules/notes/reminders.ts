export type ReminderRepeat = "none" | "daily" | "weekly";
export interface ParsedReminder {
  text: string;
  at: number;
  repeat: ReminderRepeat;
}

function clockDate(now: Date, hourText: string, minuteText = "0", meridiem?: string, addDays = 0): Date | null {
  let hour = Number(hourText);
  const minute = Number(minuteText);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  if (meridiem) {
    const suffix = meridiem.toLowerCase();
    if (hour < 1 || hour > 12) return null;
    hour = (hour % 12) + (suffix === "pm" ? 12 : 0);
  }
  const result = new Date(now);
  result.setDate(result.getDate() + addDays);
  result.setHours(hour, minute, 0, 0);
  return result;
}

/** Deterministic subset of natural reminder phrases in English and Russian. */
export function parseReminder(input: string, now = new Date()): ParsedReminder | null {
  const value = input.trim().replace(/\s+/g, " ");
  if (value.length < 5) return null;

  const relative = /^(.*?)\s+(?:in|через)\s+(\d{1,4})\s+(minutes?|mins?|hours?|hrs?|days?|минут(?:у|ы)?|час(?:а|ов)?|дн(?:я|ей)?)$/i.exec(value);
  if (relative) {
    const amount = Number(relative[2]);
    const unit = relative[3].toLowerCase();
    const factor = /^(?:m|min|minute|minutes|мин)/.test(unit) ? 60_000
      : /^(?:h|hr|hour|hours|час)/.test(unit) ? 3_600_000
      : 86_400_000;
    const text = relative[1].trim();
    if (!text || amount <= 0) return null;
    return { text, at: now.getTime() + amount * factor, repeat: "none" };
  }

  const recurring = /^(.*?)\s+(every day|daily|every week|weekly|каждый день|каждую неделю)\s+(?:at|в)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i.exec(value);
  if (recurring) {
    const text = recurring[1].trim();
    if (!text) return null;
    const repeat: ReminderRepeat = /^(?:every week|weekly|каждую неделю)$/i.test(recurring[2]) ? "weekly" : "daily";
    const due = clockDate(now, recurring[3], recurring[4], recurring[5]);
    if (!due) return null;
    if (due.getTime() <= now.getTime()) due.setDate(due.getDate() + (repeat === "weekly" ? 7 : 1));
    return { text, at: due.getTime(), repeat };
  }

  const dated = /^(.*?)\s+(today|tomorrow|сегодня|завтра)(?:\s+(?:at|в)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?$/i.exec(value);
  if (dated) {
    const text = dated[1].trim();
    if (!text) return null;
    const tomorrow = /^(?:tomorrow|завтра)$/i.test(dated[2]);
    const due = clockDate(now, dated[3] ?? "9", dated[4] ?? "0", dated[5], tomorrow ? 1 : 0);
    if (!due) return null;
    if (!dated[3] && due.getTime() <= now.getTime()) due.setTime(now.getTime() + 60 * 60 * 1000);
    return { text, at: due.getTime(), repeat: "none" };
  }

  const atTime = /^(.*?)\s+(?:at|в)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i.exec(value);
  if (atTime) {
    const text = atTime[1].trim();
    if (!text) return null;
    const due = clockDate(now, atTime[2], atTime[3], atTime[4]);
    if (!due) return null;
    if (due.getTime() <= now.getTime()) due.setDate(due.getDate() + 1);
    return { text, at: due.getTime(), repeat: "none" };
  }
  return null;
}
