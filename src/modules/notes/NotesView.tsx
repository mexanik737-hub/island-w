import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { addReminder, completeReminder, createFolder, createNote, deleteNote, deleteReminder, requestReminderPermission, updateNote, useNotes } from "./store";
import { useT } from "../../i18n";
import "./notes.css";

type Section = "notes" | "reminders";
const dateInput = (at: number) => {
  const date = new Date(at - new Date(at).getTimezoneOffset() * 60_000);
  return date.toISOString().slice(0, 16);
};

export function NotesView() {
  const t = useT().notes;
  const snapshot = useNotes();
  const [section, setSection] = useState<Section>("notes");
  const [folder, setFolder] = useState(snapshot.folders[0] ?? "General");
  const [selectedId, setSelectedId] = useState<string | null>(snapshot.notes[0]?.id ?? null);
  const [search, setSearch] = useState("");
  const [reminderText, setReminderText] = useState("");
  const [reminderAt, setReminderAt] = useState(dateInput(Date.now() + 3_600_000));
  const [repeat, setRepeat] = useState<"none" | "daily" | "weekly">("none");
  const [status, setStatus] = useState("");
  const editor = useRef<HTMLTextAreaElement>(null);
  const visible = useMemo(
    () => snapshot.notes.filter((note) => note.folder === folder && (note.title + " " + note.body).toLocaleLowerCase().includes(search.toLocaleLowerCase())),
    [snapshot.notes, folder, search],
  );
  const selected = visible.find((note) => note.id === selectedId) ?? visible[0] ?? null;

  useEffect(() => {
    if (selected && selected.id !== selectedId) setSelectedId(selected.id);
  }, [selected, selectedId]);

  const newNote = () => {
    const id = createNote(folder);
    setSelectedId(id);
    setSearch("");
  };
  const newFolder = () => {
    const name = window.prompt(t.folderPrompt);
    if (name?.trim()) {
      createFolder(name);
      setFolder(name.trim().slice(0, 40));
    }
  };
  const format = (before: string, after = before) => {
    const area = editor.current;
    if (!area || !selected) return;
    const start = area.selectionStart, end = area.selectionEnd;
    const selectedText = selected.body.slice(start, end) || "text";
    const next = selected.body.slice(0, start) + before + selectedText + after + selected.body.slice(end);
    updateNote(selected.id, { body: next });
    requestAnimationFrame(() => {
      area.focus();
      area.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    });
  };
  const taskLine = () => {
    const area = editor.current;
    if (!area || !selected) return;
    const start = area.selectionStart;
    const lineStart = selected.body.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
    updateNote(selected.id, { body: selected.body.slice(0, lineStart) + "- [ ] " + selected.body.slice(lineStart) });
    requestAnimationFrame(() => { area.focus(); area.setSelectionRange(start + 6, start + 6); });
  };
  const submitReminder = (event: FormEvent) => {
    event.preventDefault();
    const at = new Date(reminderAt).getTime();
    if (!reminderText.trim() || !Number.isFinite(at) || at <= Date.now()) {
      setStatus(t.reminderFuture);
      return;
    }
    addReminder(reminderText, at, repeat);
    setReminderText("");
    setStatus(t.reminderSaved);
  };
  const allowNotifications = async () => {
    const result = await requestReminderPermission();
    setStatus(result === "granted" ? t.notificationsEnabled : result === "unsupported" ? t.notificationsUnsupported : t.notificationsDenied);
  };

  return (
    <section className="notes-workspace">
      <header className="notes-topbar">
        <div className="notes-sections">
          <button className={section === "notes" ? "is-active" : ""} onClick={() => setSection("notes")}>{t.notes}</button>
          <button className={section === "reminders" ? "is-active" : ""} onClick={() => setSection("reminders")}>{t.reminders}</button>
        </div>
        {section === "notes" ? (
          <div className="notes-top-actions">
            <select value={folder} onChange={(event) => setFolder(event.target.value)} aria-label={t.folder}>
              {snapshot.folders.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <button onClick={newFolder}>{t.newFolder}</button>
            <button className="notes-primary" onClick={newNote}>{t.newNote}</button>
          </div>
        ) : <button onClick={allowNotifications}>{t.enableNotifications}</button>}
      </header>

      {section === "notes" ? (
        <div className="notes-layout">
          <aside className="notes-list">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t.search} aria-label={t.search} />
            <div className="notes-list-scroll">
              {visible.map((note) => (
                <button key={note.id} className={selected?.id === note.id ? "is-active" : ""} onClick={() => setSelectedId(note.id)}>
                  <strong>{note.title || t.untitled}</strong><span>{note.body.replace(/\s+/g, " ").slice(0, 56) || t.emptyNote}</span>
                </button>
              ))}
              {!visible.length && <p>{t.noNotes}</p>}
            </div>
          </aside>
          <div className="notes-editor">
            {selected ? (
              <>
                <div className="notes-edit-head">
                  <input value={selected.title} onChange={(event) => updateNote(selected.id, { title: event.target.value })} aria-label={t.untitled} placeholder={t.untitled} />
                  <button onClick={() => { deleteNote(selected.id); setSelectedId(null); }}>{t.delete}</button>
                </div>
                <div className="notes-format">
                  <button onClick={() => format("**")} aria-label={t.bold}><strong>B</strong></button>
                  <button onClick={() => format("*")} aria-label={t.italic}><em>I</em></button>
                  <button onClick={() => format("~~")} aria-label={t.strike}><s>S</s></button>
                  <button onClick={taskLine} aria-label={t.task}>☐ {t.task}</button>
                  <button onClick={() => format("\n- ", "")}>• {t.list}</button>
                </div>
                <textarea ref={editor} value={selected.body} onChange={(event) => updateNote(selected.id, { body: event.target.value })} placeholder={t.write} />
                <footer>{t.autoSaved} · {new Date(selected.updatedAt).toLocaleString()}</footer>
              </>
            ) : <div className="notes-empty">{t.createNote}</div>}
          </div>
        </div>
      ) : (
        <div className="reminders-panel">
          <form className="reminder-form" onSubmit={submitReminder}>
            <input value={reminderText} onChange={(event) => setReminderText(event.target.value)} placeholder={t.reminderPlaceholder} aria-label={t.reminderPlaceholder} />
            <input type="datetime-local" value={reminderAt} onChange={(event) => setReminderAt(event.target.value)} aria-label={t.reminderTime} />
            <select value={repeat} onChange={(event) => setRepeat(event.target.value as typeof repeat)} aria-label={t.repeat}>
              <option value="none">{t.once}</option><option value="daily">{t.daily}</option><option value="weekly">{t.weekly}</option>
            </select>
            <button className="notes-primary" type="submit">{t.add}</button>
          </form>
          <div className="reminders-list">
            {snapshot.reminders.map((reminder) => (
              <div className={reminder.done ? "reminder-row is-done" : "reminder-row"} key={reminder.id}>
                <button aria-label={reminder.done ? t.completed : t.markComplete} disabled={reminder.done} onClick={() => completeReminder(reminder.id)}>{reminder.done ? "✓" : "○"}</button>
                <div><strong>{reminder.text}</strong><span>{new Date(reminder.at).toLocaleString()} · {reminder.repeat === "none" ? "Once" : reminder.repeat === "daily" ? "Daily" : "Weekly"}</span></div>
                <button aria-label={t.deleteReminder} onClick={() => deleteReminder(reminder.id)}>×</button>
              </div>
            ))}
            {!snapshot.reminders.length && <p>{t.noReminders}</p>}
          </div>
          {status && <p className="notes-status" role="status">{status}</p>}
        </div>
      )}
    </section>
  );
}
