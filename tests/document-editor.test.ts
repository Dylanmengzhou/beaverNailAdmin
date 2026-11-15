import test from "node:test";
import assert from "node:assert/strict";
import {MarkdownManager} from "@tiptap/markdown";
import {documentExtensions} from "../lib/studio/document-extensions";
import {renderMarkdown} from "../lib/studio/markdown";

const manager=()=>new MarkdownManager({extensions:documentExtensions(),markedOptions:{gfm:true,breaks:true}});

test("existing multilingual stories preserve headings, lists, images, links and tables when edited",()=>{
 const source=[
  "# 工作室故事 ✨","","欢迎光临 **Beaver & Aura**。","第二行保留换行。","",
  "## Our story","","- 第一项","- 두 번째 항목","","1. 预约","2. 到店","",
  "> 每一天，漂亮一点。","","[联系我们](https://example.com/contact?lang=zh)","",
  "![门店照片](/api/media/studio-photo?format=compatible)","",
  "| 服务 | 价格 |","| --- | --- |","| 美甲 | 50,000 |","",
 ].join("\n");
 const markdown=manager(),document=markdown.parse(source),output=markdown.serialize(document);
 assert.deepEqual(markdown.parse(output),document);
 const html=renderMarkdown(output);
 for(const expected of ["<h1>","<h2>","<strong>","<ul>","<ol>","<blockquote>","<table>","두 번째 항목","/api/media/studio-photo?format=compatible","https://example.com/contact?lang=zh","<br />"])
  assert.ok(html.includes(expected),expected+" should survive the editor and public renderer");
});

test("document formatting still exports Markdown consumed by the existing public API",()=>{
 const markdown=manager();
 const output=markdown.serialize({type:"doc",content:[
  {type:"heading",attrs:{level:2},content:[{type:"text",text:"关于我们"}]},
  {type:"paragraph",content:[{type:"text",text:"文字加粗",marks:[{type:"bold"}]}]},
  {type:"bulletList",content:[{type:"listItem",content:[{type:"paragraph",content:[{type:"text",text:"欢迎到店"}]}]}]},
 ]});
 assert.match(output,/## 关于我们/);assert.match(output,/\*\*文字加粗\*\*/);
 assert.match(renderMarkdown(output),/<li>欢迎到店<\/li>/);
});
