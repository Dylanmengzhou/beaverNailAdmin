"use client";

import {createContext,useCallback,useContext,useEffect,useId,useLayoutEffect,useRef,useState,type ReactNode} from "react";
import {useRouter} from "next/navigation";
import {FileWarning} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Dialog,DialogContent,DialogDescription,DialogFooter,DialogTitle} from "@/components/ui/dialog";

type Draft={discard:()=>void};
type Guard={register:(id:string,draft:Draft|null)=>void;confirmNavigation:(navigate:()=>void)=>void};
const GuardContext=createContext<Guard|null>(null);
const historyKey="__beaverDraftPosition";

export function UnsavedChangesProvider({children}:{children:ReactNode}){
 const router=useRouter();
 const drafts=useRef(new Map<string,Draft>());
 const pendingRef=useRef<{run:()=>void}|null>(null);
 const [pending,setPending]=useState<{run:()=>void}|null>(null);
 const register=useCallback((id:string,draft:Draft|null)=>{
  if(draft)drafts.current.set(id,draft);else drafts.current.delete(id);
 },[]);
 const confirmNavigation=useCallback((navigate:()=>void)=>{
  if(!drafts.current.size){navigate();return;}
  if(pendingRef.current)return;
  const next={run:navigate};pendingRef.current=next;setPending(next);
 },[]);
 const cancel=()=>{pendingRef.current=null;setPending(null);};
 const leave=()=>{
  const next=pendingRef.current;
  if(!next)return;
  const discarded=[...drafts.current.values()];drafts.current.clear();
  pendingRef.current=null;setPending(null);
  discarded.forEach(draft=>draft.discard());
  next.run();
 };

 useEffect(()=>{
  const history=window.history;
  const push=history.pushState,replace=history.replaceState;
  let position=Number.isSafeInteger(history.state?.[historyKey])?history.state[historyKey]:0;
  let currentHref=location.href;
  let restoring:(()=>void)|null=null;
  let allowTraversal=false;
  let allowedAnchor:HTMLAnchorElement|null=null;
  replace.call(history,{...history.state,[historyKey]:position},"",currentHref);
  const pushState:History["pushState"]=function(data,unused,url){
   position+=1;push.call(history,{...data,[historyKey]:position},unused,url);currentHref=location.href;
  };
  const replaceState:History["replaceState"]=function(data,unused,url){
   replace.call(history,{...data,[historyKey]:position},unused,url);currentHref=location.href;
  };
  history.pushState=pushState;history.replaceState=replaceState;
  const onBeforeUnload=(event:BeforeUnloadEvent)=>{
   if(!drafts.current.size)return;
   event.preventDefault();event.returnValue="";
  };
  const onClick=(event:MouseEvent)=>{
   if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
   const anchor=(event.target instanceof Element?event.target:event.target instanceof Node?event.target.parentElement:null)?.closest<HTMLAnchorElement>("a[href]");
   if(!anchor||anchor.hasAttribute("download")||(anchor.target&&anchor.target!=="_self"))return;
   if(allowedAnchor===anchor){allowedAnchor=null;return;}
   const destination=new URL(anchor.href,location.href),current=new URL(location.href);
   if(!["http:","https:"].includes(destination.protocol))return;
   if(destination.origin===current.origin&&destination.pathname===current.pathname&&destination.search===current.search)return;
   if(!drafts.current.size)return;
   event.preventDefault();event.stopImmediatePropagation();
   confirmNavigation(()=>{
    if(anchor.isConnected){allowedAnchor=anchor;anchor.click();allowedAnchor=null;}
    else if(destination.origin===location.origin)router.push(destination.pathname+destination.search+destination.hash);
    else location.assign(destination.href);
   });
  };
  const onPopState=(event:PopStateEvent)=>{
   const target=Number.isSafeInteger(event.state?.[historyKey])?event.state[historyKey]:position-1;
   if(restoring){
    event.stopImmediatePropagation();
    if(target===position&&location.href===currentHref){const show=restoring;restoring=null;show();}
    else history.go(position-target);
    return;
   }
   if(allowTraversal||!drafts.current.size){allowTraversal=false;position=target;currentHref=location.href;return;}
   event.stopImmediatePropagation();
   const delta=target-position,targetHref=location.href;
   if(!delta){
    replace.call(history,{...history.state,[historyKey]:position},"",currentHref);
    confirmNavigation(()=>router.push(targetHref));return;
   }
   // Restore the current entry before opening the dialog, so cancel keeps both
   // the editor and the URL. Approved traversal then reaches the original entry.
   restoring=()=>confirmNavigation(()=>{allowTraversal=true;history.go(delta);});
   history.go(-delta);
  };
  document.addEventListener("click",onClick,true);
  window.addEventListener("beforeunload",onBeforeUnload);
  window.addEventListener("popstate",onPopState,true);
  return()=>{
   document.removeEventListener("click",onClick,true);
   window.removeEventListener("beforeunload",onBeforeUnload);
   window.removeEventListener("popstate",onPopState,true);
   if(history.pushState===pushState)history.pushState=push;
   if(history.replaceState===replaceState)history.replaceState=replace;
  };
 },[confirmNavigation,router]);

 return <GuardContext.Provider value={{register,confirmNavigation}}>
  {children}
  <Dialog open={!!pending} onOpenChange={open=>{if(!open)cancel();}}>
   <DialogContent className="unsaved-changes-dialog" closeLabel="关闭提醒，继续编辑">
    <span className="unsaved-dialog-icon"><FileWarning size={25}/></span>
    <DialogTitle>还有未保存的内容</DialogTitle>
    <DialogDescription>离开后，尚未保存的填写内容将丢失。要放弃更改并离开吗？</DialogDescription>
    <DialogFooter><Button type="button" variant="outline" onClick={cancel}>继续编辑</Button><Button type="button" variant="destructive" onClick={leave}>放弃更改并离开</Button></DialogFooter>
   </DialogContent>
  </Dialog>
 </GuardContext.Provider>;
}

export function useUnsavedNavigation(){
 const guard=useContext(GuardContext);
 if(!guard)throw new Error("Draft protection requires UnsavedChangesProvider");
 return guard.confirmNavigation;
}

export function useUnsavedChanges(dirty:boolean,onDiscard:()=>void){
 const guard=useContext(GuardContext),id=useId(),discard=useRef(onDiscard);
 discard.current=onDiscard;
 if(!guard)throw new Error("Draft protection requires UnsavedChangesProvider");
 const register=guard.register;
 useLayoutEffect(()=>{
  register(id,dirty?{discard:()=>discard.current()}:null);
  return()=>register(id,null);
 },[dirty,id,register]);
 return guard.confirmNavigation;
}
