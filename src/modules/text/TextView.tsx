import { useMemo, useState } from "react";
import { transformText, type TextOperation } from "./transform";
import "./text.css";
const OPERATIONS:{id:TextOperation;label:string}[]=[
{id:"layout-ru-en",label:"RU → EN layout"},{id:"layout-en-ru",label:"EN → RU layout"},
{id:"upper",label:"UPPERCASE"},{id:"lower",label:"lowercase"},{id:"title",label:"Title Case"},{id:"sentence",label:"Sentence case"},
{id:"transliterate",label:"Transliterate"},{id:"json-format",label:"Format JSON"},{id:"json-minify",label:"Minify JSON"},
{id:"base64-encode",label:"Base64 encode"},{id:"base64-decode",label:"Base64 decode"},{id:"url-encode",label:"URL encode"},{id:"url-decode",label:"URL decode"}];
export function TextView(){const[input,setInput]=useState("");const[operation,setOperation]=useState<TextOperation>("layout-ru-en");const[copied,setCopied]=useState(false);const output=useMemo(()=>transformText(operation,input),[operation,input]);
const copy=async()=>{try{await navigator.clipboard.writeText(output);setCopied(true);window.setTimeout(()=>setCopied(false),1100);}catch{setCopied(false);}};
return <section className="text-tools"><header className="text-tools-head"><span className="text-tools-title">Text tools</span><select aria-label="Text operation" value={operation} onChange={e=>setOperation(e.target.value as TextOperation)}>{OPERATIONS.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select></header>
<div className="text-tools-columns"><label className="text-tools-pane"><span>Input</span><textarea value={input} onChange={e=>setInput(e.target.value)} placeholder="Paste or type text…" spellCheck={false}/></label>
<label className="text-tools-pane"><span>Result</span><textarea value={output} readOnly placeholder="The transformed text appears here…" spellCheck={false}/></label></div>
<footer className="text-tools-foot"><span>{input.length.toLocaleString()} characters</span><button type="button" onClick={copy} disabled={!output}>{copied?"Copied":"Copy result"}</button></footer></section>;
}
