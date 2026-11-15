import test from "node:test";
import assert from "node:assert/strict";
import {commissionForPrice,settlementInputSchema,commissionUpdateSchema} from "../lib/studio/settlement";
test("commission uses final price, rounds to whole currency units, and accepts zero",()=>{
 assert.equal(commissionForPrice(100000,2500),25000);
 assert.equal(commissionForPrice(99999,3333),33330);
 assert.equal(commissionForPrice(100000,0),0);
 assert.equal(commissionForPrice(0,10000),0);
});
test("settlement validates integer prices and strips client-supplied commission",()=>{
 const value={reservationid:"test",price:"100000",currency:"KRW",paymentMethod:"cash",receivedAmount:20000,commissionRateBps:10000,commissionAmount:100000};
 assert.deepEqual(settlementInputSchema.parse(value),{reservationid:"test",price:100000,currency:"KRW",paymentMethod:"cash"});
 for(const price of ["",null,-1,1.1,"1e5",2147483648])assert.equal(settlementInputSchema.safeParse({...value,price}).success,false);
 for(const rateBps of [-1,10001,1.5])assert.equal(commissionUpdateSchema.safeParse({serviceId:"test",rateBps,expectedVersion:0}).success,false);
 assert.equal(commissionUpdateSchema.parse({serviceId:"test",rateBps:0,expectedVersion:0}).rateBps,0);
});
