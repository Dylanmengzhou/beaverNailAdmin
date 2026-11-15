import test from "node:test";
import assert from "node:assert/strict";
import {restDayOverview,storeDayStatus,type RestStaff,type TimeOff} from "../lib/studio/time-off-display";

const breakAt=(startsAt:string,endsAt:string,nailArtistId:string|null=null):TimeOff=>({id:startsAt,nailArtistId,nailArtist:null,startsAt,endsAt,reason:null});

test("the store calendar follows the configured weekly closure",()=>{
 assert.equal(storeDayStatus("2026-11-16",[1],[]).kind,"closed");
 assert.equal(storeDayStatus("2026-11-16",[2],[]).kind,"open");
});
test("one employee's break does not close the store",()=>{
 assert.equal(storeDayStatus("2026-11-15",[],[breakAt("2026-11-15T00:00:00+09:00","2026-11-16T00:00:00+09:00","bella")]).kind,"open");
});
test("a short store break is displayed as partial, rather than a whole day closed",()=>{
 assert.equal(storeDayStatus("2026-11-15",[],[breakAt("2026-11-15T10:00:00+09:00","2026-11-15T12:00:00+09:00")]).kind,"partial");
});
test("adjacent or overlapping breaks can cover a full store day",()=>{
 const records=[breakAt("2026-11-15T00:00:00+09:00","2026-11-15T13:00:00+09:00"),breakAt("2026-11-15T12:00:00+09:00","2026-11-16T00:00:00+09:00")];
 assert.equal(storeDayStatus("2026-11-15",[],records).kind,"closed");
});
test("gaps between breaks still leave part of the day open",()=>{
 const records=[breakAt("2026-11-15T00:00:00+09:00","2026-11-15T10:00:00+09:00"),breakAt("2026-11-15T12:00:00+09:00","2026-11-16T00:00:00+09:00")];
 assert.equal(storeDayStatus("2026-11-15",[],records).kind,"partial");
});
test("midnight boundaries use Korea time and an exclusive end",()=>{
 const records=[breakAt("2026-11-15T00:00:00+09:00","2026-11-16T00:00:00+09:00")];
 assert.equal(storeDayStatus("2026-11-15",[],records).kind,"closed");
 assert.equal(storeDayStatus("2026-11-16",[],records).kind,"open");
});

const employee=(id:string,days=[0,1,2,3,4,5,6]):RestStaff=>({id,name:id,active:true,services:["nails"],durationMinutes:120,schedule:[{days,start:"10:00",end:"18:00"}]});

test("the calendar names the employee and shows the exact personal break period",()=>{
 const result=restDayOverview("2026-11-15",[],[breakAt("2026-11-15T10:00:00+09:00","2026-11-15T12:00:00+09:00","bella")],[employee("bella"),employee("nana")]);
 assert.equal(result.store.kind,"open");assert.deepEqual(result.people,[{id:"bella",name:"bella",period:"10:00–12:00",reason:"临时休息"}]);
});
test("whole-store days off do not duplicate employee leave",()=>{
 const staff=[employee("bella"),employee("nana")];
 const personal=breakAt("2026-11-16T10:00:00+09:00","2026-11-16T12:00:00+09:00","bella");
 for(const [weekly,records] of [[ [1],[personal] ],[ [],[personal,breakAt("2026-11-16T00:00:00+09:00","2026-11-17T00:00:00+09:00")] ]] as const){
  const result=restDayOverview("2026-11-16",weekly,records,staff);
  assert.equal(result.store.kind,"closed");assert.deepEqual(result.people,[]);
 }
 assert.equal(restDayOverview("2026-11-16",[],[personal],staff).people[0].name,"bella");
});
test("employee days without a shift are visible even without a manual time-off record",()=>{
 const result=restDayOverview("2026-11-15",[],[],[employee("bella",[1,2,3,4,5]),employee("nana")]);
 assert.deepEqual(result.people,[{id:"bella",name:"bella",period:"全天",reason:"当天无排班"}]);
});
test("a shift on either assigned service counts as working that day",()=>{
 const person={...employee("bella",[]),services:["nails","makeup"],serviceSettings:{nails:{durationMinutes:120,schedule:[{days:[1],start:"10:00",end:"18:00"}]},makeup:{durationMinutes:60,schedule:[{days:[0],start:"10:00",end:"16:00"}]}}};
 assert.deepEqual(restDayOverview("2026-11-15",[],[],[person]).people,[]);
});
test("partial store closures retain the period and do not label everyone as off all day",()=>{
 const result=restDayOverview("2026-11-15",[],[breakAt("2026-11-15T10:00:00+09:00","2026-11-15T12:00:00+09:00")],[employee("bella")]);
 assert.equal(result.store.kind,"partial");assert.deepEqual(result.storePeriods,["10:00–12:00"]);assert.deepEqual(result.people,[{id:"bella",name:"bella",period:"10:00–12:00",reason:"临时店休"}]);
});
test("overlapping personal periods are merged without duplicate employee names",()=>{
 const result=restDayOverview("2026-11-15",[],[breakAt("2026-11-15T10:00:00+09:00","2026-11-15T12:00:00+09:00","bella"),breakAt("2026-11-15T11:00:00+09:00","2026-11-15T14:00:00+09:00","bella")],[employee("bella")]);
 assert.equal(result.people.length,1);assert.equal(result.people[0].period,"10:00–14:00");
});
