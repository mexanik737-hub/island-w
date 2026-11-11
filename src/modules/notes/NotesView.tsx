import { useEffect, useState } from "react";
import "./notes.css";
const KEY="island-w:quick-note";
export function NotesView(){const[note,setNote]=useState("");const[saved,setSaved]=useState(true);
useEffect(()=>{try{setNote(localStorage.getItem(KEY)??"");}catch{/* storage may be disabled */}},[]);
useEffect(()=>{setSaved(false);const timer=window.setTimeout(()=>{try{localStorage.setItem(KEY,note);setSaved(true);}catch{setSaved(false);}},260);return()=>window.clearTimeout(timer);},[note]);
return <section className="quick-note"><header className="quick-note-head"><span>Quick note</span><span className={"quick-note-state "+(saved?"":"quick-note-state--pending")}>{saved?"Saved on this PC":"Saving…"}</span></header>
<textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Write something down…" aria-label="Quick note"/><footer className="quick-note-foot">Private · stored locally in this Windows profile</footer></section>;
}
