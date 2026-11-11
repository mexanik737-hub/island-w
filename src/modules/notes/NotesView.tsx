import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { addReminder, completeReminder, createFolder, createNote, deleteNote, deleteReminder, requestReminderPermission, updateNote, useNotes } from "./store";
import "./notes.css";

type Section = "notes" | "reminders";
const dateInput = (at: number) => {
  const date = new Date(at - new Date(at).getTimezoneOffset() * 60_000);
  return date.toISOString().slice(0, 16);
};

export function NotesView() {
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
    const name = window.prompt("Folder name");
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
      setStatus("Choose a reminder time in the future and enter its text.");
      return;
    }
    addReminder(reminderText, at, repeat);
    setReminderText("");
    setStatus("Reminder saved on this PC.");
  };
  const allowNotifications = async () => {
    const result = await requestReminderPermission();
    setStatus(result === "granted" ? "Windows notifications enabled." : result === "unsupported" ? "This WebView does not expose desktop notifications." : "Notification permission was not granted.");
  };

  return (
    <section className="notes-workspace">
      <header className="notes-topbar">
        <div className="notes-sections">
          <button className={section === "notes" ? "is-active" : ""} onClick={() => setSection("notes")}>Notes</button>
          <button className={section === "reminders" ? "is-active" : ""} onClick={() => setSection("reminders")}>Reminders</button>
        </div>
        {section === "notes" ? (
          <div className="notes-top-actions">
            <select value={folder} onChange={(event) => setFolder(event.target.value)} aria-label="Folder">
              {snapshot.folders.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <button onClick={newFolder}>New folder</button>
            <button className="notes-primary" onClick={newNote}>New note</button>
          </div>
        ) : <button onClick={allowNotifications}>Enable notifications</button>}
      </header>

      {section === "notes" ? (
        <div className="notes-layout">
          <aside className="notes-list">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search notes" aria-label="Search notes" />
            <div className="notes-list-scroll">
              {visible.map((note) => (
                <button key={note.id} className={selected?.id === note.id ? "is-active" : ""} onClick={() => setSelectedId(note.id)}>
                  <strong>{note.title || "Untitled"}</strong><span>{note.body.replace(/\s+/g, " ").slice(0, 56) || "Empty note"}</span>
                </button>
              ))}
              {!visible.length && <p>No notes in this folder.</p>}
            </div>
          </aside>
          <div className="notes-editor">
            {selected ? (
              <>
                <div className="notes-edit-head">
                  <input value={selected.title} onChange={(event) => updateNote(selected.id, { title: event.target.value })} aria-label="Note title" placeholder="Untitled" />
                  <button onClick={() => { deleteNote(selected.id); setSelectedId(null); }}>Delete</button>
                </div>
                <div className="notes-format">
                  <button onClick={() => format("**")} aria-label="Bold"><strong>B</strong></button>
                  <button onClick={() => format("*")} aria-label="Italic"><em>I</em></button>
                  <button onClick={() => format("~~")} aria-label="Strikethrough"><s>S</s></button>
                  <button onClick={taskLine} aria-label="Task checkbox">☐ Task</button>
                  <button onClick={() => format("\n- ", "")}>• List</button>
                </div>
                <textarea ref={editor} value={selected.body} onChange={(event) => updateNote(selected.id, { body: event.target.value })} placeholder="Write a note. Formatting shortcuts are available above." />
                <footer>Auto-saved locally · {new Date(selected.updatedAt).toLocaleString()}</footer>
              </>
            ) : <div className="notes-empty">Create a note to get started.</div>}
          </div>
        </div>
      ) : (
        <div className="reminders-panel">
          <form className="reminder-form" onSubmit={submitReminder}>
            <input value={reminderText} onChange={(event) => setReminderText(event.target.value)} placeholder="What should Island remind you about?" aria-label="Reminder text" />
            <input type="datetime-local" value={reminderAt} onChange={(event) => setReminderAt(event.target.value)} aria-label="Reminder time" />
            <select value={repeat} onChange={(event) => setRepeat(event.target.value as typeof repeat)} aria-label="Repeat">
              <option value="none">Once</option><option value="daily">Every day</option><option value="weekly">Every week</option>
            </select>
            <button className="notes-primary" type="submit">Add</button>
          </form>
          <div className="reminders-list">
            {snapshot.reminders.map((reminder) => (
              <div className={reminder.done ? "reminder-row is-done" : "reminder-row"} key={reminder.id}>
                <button aria-label={reminder.done ? "Completed" : "Mark complete"} disabled={reminder.done} onClick={() => completeReminder(reminder.id)}>{reminder.done ? "✓" : "○"}</button>
                <div><strong>{reminder.text}</strong><span>{new Date(reminder.at).toLocaleString()} · {reminder.repeat === "none" ? "Once" : reminder.repeat === "daily" ? "Daily" : "Weekly"}</span></div>
                <button aria-label="Delete reminder" onClick={() => deleteReminder(reminder.id)}>×</button>
              </div>
            ))}
            {!snapshot.reminders.length && <p>No reminders yet.</p>}
          </div>
          {status && <p className="notes-status" role="status">{status}</p>}
        </div>
      )}
    </section>
  );
}
