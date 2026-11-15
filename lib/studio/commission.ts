import {z} from "zod";
import {moneySchema} from "./settlement";

export const commissionTiersSchema=z.array(z.object({
 minimum:moneySchema,
 storeRateBps:z.number().int().min(0).max(10000),
})).min(1).max(8).superRefine((tiers,ctx)=>{
 if(tiers[0].minimum!==0)ctx.addIssue({code:"custom",message:"第一档从 0 开始"});
 if(tiers.some((tier,index)=>index>0&&tier.minimum<=tiers[index-1].minimum))ctx.addIssue({code:"custom",message:"营业额门槛必须依次递增"});
});
export type CommissionTier=z.infer<typeof commissionTiersSchema>[number];
export const policyInputSchema=z.object({
 serviceId:z.string().min(1),nailArtistId:z.string().min(1).nullable().default(null),
 currency:z.enum(["KRW","CNY","USD"]).default("KRW"),
 effectiveFrom:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value=>!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value,"请选择有效的生效日期"),
 tiers:commissionTiersSchema,
});
export type CommissionSnapshot={id:string;effectiveFrom:string|null;serviceId:string;nailArtistId:string|null;currency:string;tiers:CommissionTier[]};
export function readCommissionSnapshot(value:unknown):CommissionSnapshot|null{
 const result=z.object({id:z.string(),effectiveFrom:z.string().nullable(),serviceId:z.string(),nailArtistId:z.string().nullable(),currency:z.string(),tiers:commissionTiersSchema}).safeParse(value);
 return result.success?result.data:null;
}
export function calculateCommission(price:number,revenue:number,policy:CommissionSnapshot){
 const tier=[...policy.tiers].reverse().find(tier=>revenue>=tier.minimum)!;
 const rateBps=10000-tier.storeRateBps;
 return {rateBps,storeRateBps:tier.storeRateBps,amount:Math.round(price*rateBps/10000),minimum:tier.minimum};
}
export const commissionMonth=(date:Date|string)=>new Date(date).toISOString().slice(0,7);
export function monthRange(month:string){const[y,m]=month.split("-").map(Number);return{gte:new Date(Date.UTC(y,m-1,1)),lt:new Date(Date.UTC(y,m,1))};}
