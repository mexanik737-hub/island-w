import { useSyncExternalStore } from "react";

export interface NoteRecord {
  id: string;
  title: string;
  body: string;
  folder: string;
  updatedAt: number;
}
export interface ReminderRecord {
  id: string;
  text: string;
  at: number;
  repeat: "none" | "daily" | "weekly";
  done: boolean;
}
interface NotesSnapshot {
  notes: NoteRecord[];
  folders: string[];
  reminders: ReminderRecord[];
}
const KEY = "island-w:notes-v1";
const DEFAULT_FOLDER = "General";
const empty: NotesSnapshot = { notes: [], folders: [DEFAULT_FOLDER], reminders: [] };

function read(): NotesSnapshot {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty;
    const value = JSON.parse(raw) as Partial<NotesSnapshot>;
    return {
      notes: Array.isArray(value.notes) ? value.notes : [],
      folders: Array.isArray(value.folders) && value.folders.length ? value.folders : [DEFAULT_FOLDER],
      reminders: Array.isArray(value.reminders) ? value.reminders : [],
    };
  } catch {
    return empty;
  }
}
let snapshot = read();
const listeners = new Set<() => void>();
let serviceStarted = false;

function publish(next: NotesSnapshot) {
  snapshot = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage quota or policy */ }
  listeners.forEach((listener) => listener());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function useNotes(): NotesSnapshot {
  return useSyncExternalStore(subscribe, () => snapshot, () => snapshot);
}
export function createNote(folder = DEFAULT_FOLDER): string {
  const id = crypto.randomUUID();
  const note: NoteRecord = { id, title: "Untitled", body: "", folder, updatedAt: Date.now() };
  publish({ ...snapshot, notes: [note, ...snapshot.notes] });
  return id;
}
export function updateNote(id: string, change: Partial<Pick<NoteRecord, "title" | "body" | "folder">>) {
  publish({ ...snapshot, notes: snapshot.notes.map((note) => note.id === id ? { ...note, ...change, updatedAt: Date.now() } : note) });
}
export function deleteNote(id: string) {
  publish({ ...snapshot, notes: snapshot.notes.filter((note) => note.id !== id) });
}
export function createFolder(name: string) {
  const folder = name.trim().slice(0, 40);
  if (!folder || snapshot.folders.some((item) => item.toLocaleLowerCase() === folder.toLocaleLowerCase())) return;
  publish({ ...snapshot, folders: [...snapshot.folders, folder] });
}
export function addReminder(text: string, at: number, repeat: ReminderRecord["repeat"]) {
  if (!text.trim() || !Number.isFinite(at) || at <= Date.now()) return;
  const reminder: ReminderRecord = { id: crypto.randomUUID(), text: text.trim(), at, repeat, done: false };
  publish({ ...snapshot, reminders: [...snapshot.reminders, reminder].sort((a, b) => a.at - b.at) });
}
export function deleteReminder(id: string) {
  publish({ ...snapshot, reminders: snapshot.reminders.filter((reminder) => reminder.id !== id) });
}
export function completeReminder(id: string) {
  const reminder = snapshot.reminders.find((item) => item.id === id);
  if (!reminder) return;
  if (reminder.repeat === "none") {
    publish({ ...snapshot, reminders: snapshot.reminders.map((item) => item.id === id ? { ...item, done: true } : item) });
    return;
  }
  const interval = reminder.repeat === "daily" ? 86_400_000 : 604_800_000;
  let at = reminder.at + interval;
  while (at <= Date.now()) at += interval;
  publish({ ...snapshot, reminders: snapshot.reminders.map((item) => item.id === id ? { ...item, at, done: false } : item).sort((a, b) => a.at - b.at) });
}
export async function requestReminderPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof Notification === "undefined") return "unsupported";
  if (Notification.permission !== "default") return Notification.permission;
  return Notification.requestPermission();
}
function checkReminders() {
  const now = Date.now();
  const due = snapshot.reminders.filter((item) => !item.done && item.at <= now);
  if (!due.length) return;
  const reminders = snapshot.reminders.map((item) => {
    if (item.done || item.at > now) return item;
    if (item.repeat === "none") return { ...item, done: true };
    const interval = item.repeat === "daily" ? 86_400_000 : 604_800_000;
    let at = item.at + interval;
    while (at <= now) at += interval;
    return { ...item, at };
  });
  publish({ ...snapshot, reminders: reminders.sort((a, b) => a.at - b.at) });
  for (const reminder of due) {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      try { new Notification("Island reminder", { body: reminder.text, tag: reminder.id }); } catch { /* native permission may be unavailable */ }
    }
    window.dispatchEvent(new CustomEvent("island:reminder-fired", { detail: { id: reminder.id, text: reminder.text } }));
  }
}
/** Runs independently of the Notes tab, so reminders still fire while the island is closed. */
export function startNotesService(): void {
  if (serviceStarted) return;
  serviceStarted = true;
  window.setInterval(checkReminders, 1000);
  checkReminders();
}
