export type TrendRow={month:string;nailArtistId:string|null;currency:string|null;count:number;pricedCount:number;revenue:number};
export type TrendArtist={id:string;name:string};

export function trendPoints(rows:TrendRow[],months:string[]){
 return months.map(month=>{
  const selected=rows.filter(row=>row.month===month),krw=selected.filter(row=>row.currency==="KRW");
  const revenue=krw.reduce((sum,row)=>sum+row.revenue,0),priced=krw.reduce((sum,row)=>sum+row.pricedCount,0);
  return {month,预约数:selected.reduce((sum,row)=>sum+row.count,0),营业额:revenue,客单价:priced?Math.round(revenue/priced):0};
 });
}
export function artistPoints(rows:TrendRow[],artists:TrendArtist[],months:string[],metric:"count"|"revenue"){
 return months.map(month=>Object.fromEntries([["month",month],...artists.map(artist=>[artist.id,rows.filter(row=>row.month===month&&row.nailArtistId===artist.id&&(metric==="count"||row.currency==="KRW")).reduce((sum,row)=>sum+(metric==="count"?row.count:row.revenue),0)])]));
}
