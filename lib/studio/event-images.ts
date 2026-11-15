import type {StudioContent} from "./content";

const emptyText=()=>({zh:"",en:"",kr:""});

// Mini program 4.0.1 reads image, title.zh and html.zh directly. Keep those
// fields even for poster-only activities, and keep image URLs relative because
// that client prefixes the website origin itself.
export function eventImages(events:StudioContent["events"]){
 return events.filter(event=>event.enabled&&event.image).map(event=>({
  id:event.id,enabled:true,
  image:/^\/api\/media\/[a-zA-Z0-9_-]+$/.test(event.image)?event.image+"?format=compatible":event.image,
  title:emptyText(),body:emptyText(),html:emptyText(),
 }));
}
