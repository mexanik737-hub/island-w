import { describe, expect, it } from "vitest";
import { parseReminder } from "./reminders";

const NOW = new Date(2026, 10, 11, 12, 0, 0);

describe("parseReminder", () => {
  it("parses relative minute and hour reminders", () => {
    expect(parseReminder("call mum in 20 minutes", NOW)?.at).toBe(NOW.getTime() + 20 * 60_000);
    expect(parseReminder("turn off oven через 2 часа", NOW)?.at).toBe(NOW.getTime() + 2 * 3_600_000);
  });

  it("parses tomorrow and local clock time", () => {
    const result = parseReminder("call mum tomorrow at 9:30", NOW);
    expect(result?.text).toBe("call mum");
    expect(new Date(result!.at).getDate()).toBe(12);
    expect(new Date(result!.at).getHours()).toBe(9);
    expect(new Date(result!.at).getMinutes()).toBe(30);
  });

  it("parses recurring daily and weekly reminders", () => {
    expect(parseReminder("pills every day at 23:00", NOW)?.repeat).toBe("daily");
    expect(parseReminder("trash каждую неделю в 18:00", NOW)?.repeat).toBe("weekly");
  });

  it("rejects incomplete and invalid requests", () => {
    expect(parseReminder("in 20 minutes", NOW)).toBeNull();
    expect(parseReminder("take medicine at 28:90", NOW)).toBeNull();
  });
});
