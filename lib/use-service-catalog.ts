"use client";
import {useEffect,useState} from "react";
import {adminApi} from "./admin-api";
import {DEFAULT_CONTENT,type StudioContent} from "./studio/content";
export function useServiceCatalog(){
 const [catalog,setCatalog]=useState(DEFAULT_CONTENT.services);
 useEffect(()=>{const control=new AbortController();void adminApi<StudioContent>("/api/studio/content",{signal:control.signal}).then(c=>setCatalog(c.services)).catch(()=>{});return()=>control.abort();},[]);
 return catalog;
}
