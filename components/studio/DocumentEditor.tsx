"use client";

import {useEffect,useMemo,useRef,useState} from "react";
import {EditorContent,useEditor,useEditorState,type Editor} from "@tiptap/react";
import {ChevronDown,ImagePlus,Link2,Plus,Redo2,Undo2} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Dialog,DialogContent,DialogDescription,DialogFooter,DialogTitle} from "@/components/ui/dialog";
import {DropdownMenu,DropdownMenuContent,DropdownMenuItem,DropdownMenuSeparator,DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {documentExtensions} from "@/lib/studio/document-extensions";

type Props={value:string;onChange:(value:string)=>void;disabled:boolean;onImageUpload:(file:File)=>Promise<string|undefined>};

export default function DocumentEditor({value,onChange,disabled,onImageUpload}:Props){
 const latest=useRef(value),change=useRef(onChange),file=useRef<HTMLInputElement>(null);
 change.current=onChange;
 const [formatOpen,setFormatOpen]=useState(false),[linkOpen,setLinkOpen]=useState(false);
 const [link,setLink]=useState(""),[linkText,setLinkText]=useState(""),[linkError,setLinkError]=useState("");
 const pending=useRef<((editor:Editor)=>void)|null>(null);
 const extensions=useMemo(documentExtensions,[]);
 const editor=useEditor({
  extensions,content:value,contentType:"markdown",immediatelyRender:false,
  editorProps:{attributes:{role:"textbox","aria-label":"关于我们正文","aria-multiline":"true",class:"document-body"}},
  onUpdate:({editor})=>{const next=editor.getMarkdown();latest.current=next;change.current(next);},
 });
 const state=useEditorState({editor,selector:({editor})=>({
  bold:editor?.isActive("bold"),italic:editor?.isActive("italic"),strike:editor?.isActive("strike"),
  heading1:editor?.isActive("heading",{level:1}),heading2:editor?.isActive("heading",{level:2}),heading3:editor?.isActive("heading",{level:3}),
  bullet:editor?.isActive("bulletList"),ordered:editor?.isActive("orderedList"),quote:editor?.isActive("blockquote"),
  table:editor?.isActive("table"),
  undo:editor?.can().undo(),redo:editor?.can().redo(),
 })});
 useEffect(()=>{if(editor&&value!==latest.current){editor.commands.setContent(value,{contentType:"markdown",emitUpdate:false});latest.current=value;}},[value,editor]);
 useEffect(()=>{editor?.setEditable(!disabled,false);},[disabled,editor]);
 const afterDialog=(event:Event)=>{
  event.preventDefault();
  if(editor){if(pending.current)pending.current(editor);else editor.commands.focus();}
  pending.current=null;
 };
 const apply=(action:(editor:Editor)=>void)=>{pending.current=action;setFormatOpen(false);};
 const openLink=()=>{
  if(!editor)return;
  if(editor.isActive("link"))editor.commands.extendMarkRange("link");
  const {from,to}=editor.state.selection;
  setLink(editor.getAttributes("link").href||"");setLinkText(editor.state.doc.textBetween(from,to));setLinkError("");setLinkOpen(true);
 };
 const applyLink=()=>{
  const href=link.trim();
  if(!/^(https?:\/\/|mailto:|tel:)/i.test(href)){setLinkError("请输入完整的网址，以 https:// 开头");return;}
  pending.current=current=>{
   const {from,to}=current.state.selection;
   const selected=current.state.doc.textBetween(from,to);
   if(linkText.trim()&&linkText!==selected)current.chain().focus().insertContent({type:"text",text:linkText.trim(),marks:[{type:"link",attrs:{href}}]}).run();
   else if(from===to&&!selected)current.chain().focus().insertContent({type:"text",text:href,marks:[{type:"link",attrs:{href}}]}).run();
   else current.chain().focus().extendMarkRange("link").setLink({href}).run();
  };
  setLinkOpen(false);
 };
 const insertImage=async(image:File)=>{
  if(!editor)return;
  const position=editor.state.selection.from,url=await onImageUpload(image);
  if(url&&!editor.isDestroyed)editor.chain().focus().insertContentAt(Math.min(position,editor.state.doc.content.size),{type:"image",attrs:{src:url,alt:image.name}}).run();
 };
 const choices=[
  {label:"正文",active:!state?.heading1&&!state?.heading2&&!state?.heading3,action:(e:Editor)=>{e.chain().focus().setParagraph().run();}},
  ...([1,2,3] as const).map(level=>({label:["大标题","标题","小标题"][level-1],active:editor?.isActive("heading",{level}),action:(e:Editor)=>{e.chain().focus().setHeading({level}).run();}})),
 ];
 return <section className="document-editor" aria-label="文档编辑器" aria-busy={disabled}>
  <div className="document-toolbar" role="toolbar" aria-label="文档工具">
   <Button type="button" variant="ghost" disabled={disabled||!editor} onClick={()=>setFormatOpen(true)}>格式<ChevronDown size={14}/></Button>
   <DropdownMenu modal={false}><DropdownMenuTrigger asChild><Button type="button" variant="ghost" disabled={disabled||!editor}><Plus size={15}/>插入</Button></DropdownMenuTrigger><DropdownMenuContent align="start" className="document-insert-menu" onCloseAutoFocus={event=>event.preventDefault()}>
    <DropdownMenuItem onSelect={openLink}><Link2/>链接</DropdownMenuItem>
    <DropdownMenuItem onSelect={()=>file.current?.click()}><ImagePlus/>图片</DropdownMenuItem>
    <DropdownMenuSeparator/>
    <DropdownMenuItem onSelect={()=>editor?.chain().focus().insertTable({rows:3,cols:2,withHeaderRow:true}).run()}>表格</DropdownMenuItem>
    {state?.table&&editor&&<><DropdownMenuItem onSelect={()=>editor.chain().focus().addRowAfter().run()}>添加一行</DropdownMenuItem><DropdownMenuItem onSelect={()=>editor.chain().focus().addColumnAfter().run()}>添加一列</DropdownMenuItem><DropdownMenuItem onSelect={()=>editor.chain().focus().deleteRow().run()}>删除当前行</DropdownMenuItem><DropdownMenuItem onSelect={()=>editor.chain().focus().deleteColumn().run()}>删除当前列</DropdownMenuItem><DropdownMenuItem onSelect={()=>editor.chain().focus().deleteTable().run()}>删除表格</DropdownMenuItem></>}
    <DropdownMenuItem onSelect={()=>editor?.chain().focus().setHorizontalRule().run()}>分隔线</DropdownMenuItem>
   </DropdownMenuContent></DropdownMenu>
   <span className="document-toolbar-spacer"/>
   <Button type="button" variant="ghost" aria-label="撤销" title="撤销" disabled={disabled||!state?.undo} onMouseDown={event=>event.preventDefault()} onClick={()=>editor?.chain().focus().undo().run()}><Undo2 size={17}/></Button>
   <Button type="button" variant="ghost" aria-label="重做" title="重做" disabled={disabled||!state?.redo} onMouseDown={event=>event.preventDefault()} onClick={()=>editor?.chain().focus().redo().run()}><Redo2 size={17}/></Button>
  </div>
  <input ref={file} type="file" hidden accept="image/jpeg,image/png,image/webp" aria-label="选择文档图片" disabled={disabled} onChange={event=>{const image=event.target.files?.[0];event.target.value="";if(image)void insertImage(image);}}/>
  <EditorContent editor={editor}/>
  <Dialog open={formatOpen} onOpenChange={setFormatOpen}><DialogContent mobileSheet className="document-format-dialog" closeLabel="关闭格式" onCloseAutoFocus={afterDialog}>
   <DialogTitle>文字格式</DialogTitle><DialogDescription className="sr-only">为选中文字或当前段落设置格式</DialogDescription>
   <div className="document-format-blocks">{choices.map(item=><Button key={item.label} type="button" variant="ghost" aria-pressed={item.active} onClick={()=>apply(item.action)}>{item.label}</Button>)}</div>
   <div className="document-format-marks">
    <Button type="button" variant="ghost" aria-pressed={state?.bold} onClick={()=>apply(e=>{e.chain().focus().toggleBold().run();})}><strong>加粗</strong></Button>
    <Button type="button" variant="ghost" aria-pressed={state?.italic} onClick={()=>apply(e=>{e.chain().focus().toggleItalic().run();})}><em>斜体</em></Button>
    <Button type="button" variant="ghost" aria-pressed={state?.strike} onClick={()=>apply(e=>{e.chain().focus().toggleStrike().run();})}><s>删除线</s></Button>
   </div>
   <div className="document-format-lists">
    <Button type="button" variant="ghost" aria-pressed={state?.bullet} onClick={()=>apply(e=>{e.chain().focus().toggleBulletList().run();})}>项目列表</Button>
    <Button type="button" variant="ghost" aria-pressed={state?.ordered} onClick={()=>apply(e=>{e.chain().focus().toggleOrderedList().run();})}>编号列表</Button>
    <Button type="button" variant="ghost" aria-pressed={state?.quote} onClick={()=>apply(e=>{e.chain().focus().toggleBlockquote().run();})}>引用</Button>
   </div>
   <Button type="button" variant="ghost" className="document-clear-format" onClick={()=>apply(e=>{e.chain().focus().unsetAllMarks().clearNodes().run();})}>清除格式</Button>
  </DialogContent></Dialog>
  <Dialog open={linkOpen} onOpenChange={setLinkOpen}><DialogContent className="document-link-dialog" closeLabel="取消插入链接" onCloseAutoFocus={afterDialog}>
   <DialogTitle>插入链接</DialogTitle><DialogDescription className="sr-only">填写链接地址和显示文字</DialogDescription>
   <form onSubmit={event=>{event.preventDefault();applyLink();}}>
    <Label htmlFor="document-link-text">显示文字</Label><Input id="document-link-text" value={linkText} onChange={event=>setLinkText(event.target.value)} placeholder="链接名称"/>
    <Label htmlFor="document-link-url">链接地址</Label><Input id="document-link-url" type="url" value={link} onChange={event=>setLink(event.target.value)} placeholder="https://" aria-describedby={linkError?"document-link-error":undefined}/>
    {linkError&&<p id="document-link-error" role="alert">{linkError}</p>}
    <DialogFooter><Button type="button" variant="ghost" onClick={()=>setLinkOpen(false)}>取消</Button><Button type="submit">插入</Button></DialogFooter>
   </form>
  </DialogContent></Dialog>
 </section>;
}
