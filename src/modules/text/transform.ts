export type TextOperation = "layout-ru-en" | "layout-en-ru" | "upper" | "lower" | "title" | "sentence" | "transliterate" | "json-format" | "json-minify" | "base64-encode" | "base64-decode" | "url-encode" | "url-decode";
const EN_LOWER = "qwertyuiop[]asdfghjkl;'zxcvbnm,.";
const RU_LOWER = "йцукенгшщзхъфывапролджэячсмитьбю";
const EN_UPPER = EN_LOWER.toUpperCase(), RU_UPPER = RU_LOWER.toUpperCase();
function layout(text:string,from:string,to:string):string{const map=new Map<string,string>();for(let i=0;i<from.length;i++)map.set(from[i],to[i]??from[i]);return [...text].map(ch=>map.get(ch)??ch).join("");}
function transliterate(text:string):string{const map:Record<string,string>={а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"yo",ж:"zh",з:"z",и:"i",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"kh",ц:"ts",ч:"ch",ш:"sh",щ:"shch",ы:"y",э:"e",ю:"yu",я:"ya",ь:"",ъ:""};return [...text].map(ch=>{const lower=ch.toLocaleLowerCase("ru-RU"),value=map[lower];if(value===undefined)return ch;return ch===lower?value:value.length?value[0].toUpperCase()+value.slice(1):"";}).join("");}
function encodeBase64(text:string):string{const bytes=new TextEncoder().encode(text);let binary="";for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(binary);}
function decodeBase64(text:string):string{const binary=atob(text.replace(/\s+/g,""));return new TextDecoder("utf-8",{fatal:true}).decode(Uint8Array.from(binary,ch=>ch.charCodeAt(0)));}
export function transformText(operation:TextOperation,text:string,invalid?:string):string{try{switch(operation){
case "layout-ru-en":return layout(text,RU_LOWER+RU_UPPER,EN_LOWER+EN_UPPER);
case "layout-en-ru":return layout(text,EN_LOWER+EN_UPPER,RU_LOWER+RU_UPPER);
case "upper":return text.toLocaleUpperCase();case "lower":return text.toLocaleLowerCase();
case "title":return text.replace(/(^|[\s\-])([\p{L}\p{N}])/gu,(_m,prefix:string,letter:string)=>prefix+letter.toLocaleUpperCase());
case "sentence":return text.replace(/(^|[.!?]\s+)([\p{L}])/gu,(_m,prefix:string,letter:string)=>prefix+letter.toLocaleUpperCase());
case "transliterate":return transliterate(text);case "json-format":return JSON.stringify(JSON.parse(text),null,2);case "json-minify":return JSON.stringify(JSON.parse(text));
case "base64-encode":return encodeBase64(text);case "base64-decode":return decodeBase64(text);case "url-encode":return encodeURIComponent(text);case "url-decode":return decodeURIComponent(text);
}}catch(error){return invalid ?? "Error: "+(error instanceof Error?error.message:String(error));}}
