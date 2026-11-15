import test from "node:test";
import assert from "node:assert/strict";
import {calculateCommission,policyInputSchema,type CommissionSnapshot} from "../lib/studio/commission";
const old:CommissionSnapshot={id:"old",effectiveFrom:"2026-10-01",serviceId:"nails",nailArtistId:null,currency:"KRW",tiers:[{minimum:0,storeRateBps:6000},{minimum:4000000,storeRateBps:5000}]};
test("shop cut and employee commission are complements, including the exact threshold",()=>{
 assert.deepEqual(calculateCommission(100000,3999999,old),{rateBps:4000,storeRateBps:6000,amount:40000,minimum:0});
 assert.deepEqual(calculateCommission(100000,4000000,old),{rateBps:5000,storeRateBps:5000,amount:50000,minimum:4000000});
 const newer={...old,tiers:[{minimum:0,storeRateBps:5000},{minimum:4000000,storeRateBps:4000}]};
 assert.equal(calculateCommission(100000,4000000,newer).amount,60000);
 assert.equal(calculateCommission(100000,4000000,old).amount,50000);
});
test("invalid dates, repeated thresholds, missing zero tier and invalid percentages are rejected",()=>{
 const input={serviceId:"nails",effectiveFrom:"2026-10-20",tiers:old.tiers};
 assert.equal(policyInputSchema.safeParse(input).success,true);
 for(const patch of [{effectiveFrom:"2026-02-30"},{tiers:[{minimum:1,storeRateBps:5000}]},{tiers:[{minimum:0,storeRateBps:5000},{minimum:0,storeRateBps:4000}]},{tiers:[{minimum:0,storeRateBps:10001}]}])assert.equal(policyInputSchema.safeParse({...input,...patch}).success,false);
});
