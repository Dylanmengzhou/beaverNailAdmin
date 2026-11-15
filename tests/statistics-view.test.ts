import test from "node:test";
import assert from "node:assert/strict";
import {artistPoints,trendPoints,type TrendRow} from "../lib/studio/statistics-view";
const rows:TrendRow[]=[
 {month:"2026-10",nailArtistId:"a",currency:"KRW",count:3,pricedCount:2,revenue:150000},
 {month:"2026-10",nailArtistId:"b",currency:"KRW",count:2,pricedCount:1,revenue:120000},
 {month:"2026-10",nailArtistId:"a",currency:"USD",count:1,pricedCount:1,revenue:100},
 {month:"2026-11",nailArtistId:"a",currency:null,count:4,pricedCount:0,revenue:0},
];
test("monthly counts include every currency, while revenue and average ticket stay in KRW",()=>{
 assert.deepEqual(trendPoints(rows,["2026-10"]),[{month:"2026-10",预约数:6,营业额:270000,客单价:90000}]);
});
test("unpriced and empty months remain zero without dropping the selected date range",()=>{
 assert.deepEqual(trendPoints(rows,["2026-11","2026-12"]),[{month:"2026-11",预约数:4,营业额:0,客单价:0},{month:"2026-12",预约数:0,营业额:0,客单价:0}]);
});
test("employee charts retain separate identities and do not add foreign currencies to KRW revenue",()=>{
 const people=[{id:"a",name:"同名员工"},{id:"b",name:"同名员工"},{id:"c",name:"无订单员工"}];
 assert.deepEqual(artistPoints(rows,people,["2026-10"],"count"),[{month:"2026-10",a:4,b:2,c:0}]);
 assert.deepEqual(artistPoints(rows,people,["2026-10"],"revenue"),[{month:"2026-10",a:150000,b:120000,c:0}]);
});
