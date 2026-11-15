import {z} from "zod";

export const moneySchema=z.union([z.number(),z.string().regex(/^\d+$/)]).transform(Number).pipe(z.number().int().min(0).max(2147483647));
export const settlementInputSchema=z.object({
 reservationid:z.string().min(1),price:moneySchema,
 currency:z.enum(["KRW","CNY","USD"]),paymentMethod:z.enum(["cash","memberCard","card","wechat","alipay"]),
 version:z.number().int().nonnegative().optional(),policyId:z.string().min(1).optional(),
});
export const commissionUpdateSchema=z.object({serviceId:z.string().min(1),rateBps:z.number().int().min(0).max(10000).nullable(),expectedVersion:z.number().int().nonnegative()});
export const commissionForPrice=(price:number,rateBps:number)=>Math.round(price*rateBps/10000);
export const currencyLabel=(currency:string|null)=>({KRW:"韩元",CNY:"人民币",USD:"美元"}[currency||""]||currency||"未标记币种");
export const settlementStatusLabel=(status:string)=>({pending:"待审核",approved:"已确认",rejected:"已退回",withdrawn:"已撤回",cancelled:"预约已取消"}[status]||status);
export type CommissionRule={rateBps:number|null;version:number};
export type CommissionRules=Record<string,CommissionRule>;
