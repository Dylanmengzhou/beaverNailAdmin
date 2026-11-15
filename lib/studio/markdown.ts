import {marked} from "marked";
import sanitizeHtml from "sanitize-html";
// HTML is sanitized once on the server; both web preview and native rich-text use this result.
export function renderMarkdown(source:string) {
 return sanitizeHtml(marked.parse(source,{async:false,gfm:true,breaks:true}) as string,{
  allowedTags:["h1","h2","h3","h4","h5","h6","p","br","hr","strong","em","del","blockquote","ul","ol","li","a","img","table","thead","tbody","tr","th","td","pre","code"],
  allowedAttributes:{a:["href","title","target","rel"],img:["src","alt","title"],code:["class"],th:["align"],td:["align"]},
  allowedSchemes:["http","https","mailto","tel"],allowedSchemesByTag:{img:["https","http"]},
  transformTags:{a:sanitizeHtml.simpleTransform("a",{rel:"noopener noreferrer",target:"_blank"})}
 });
}
