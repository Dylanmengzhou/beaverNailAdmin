import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import {TableKit} from "@tiptap/extension-table";
import {TaskItem,TaskList} from "@tiptap/extension-list";
import Placeholder from "@tiptap/extension-placeholder";
import {Markdown} from "@tiptap/markdown";

// Keep Markdown as the stored format so the website and existing mini program
// continue to consume the same content. Editing itself uses rendered blocks.
export function documentExtensions(){
 return [
  StarterKit.configure({link:{openOnClick:false},underline:false}),
  Image.configure({inline:true}),
  TableKit,
  TaskList,
  TaskItem.configure({nested:true}),
  Placeholder.configure({placeholder:"写下你的工作室故事…"}),
  Markdown.configure({markedOptions:{gfm:true,breaks:true}}),
 ];
}
