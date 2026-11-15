import {resolve} from "node:path";
import {readFile} from "node:fs/promises";
import {PrismaClient} from "@prisma/client";

// Run with an explicitly chosen env file. This additive migration never changes
// existing prices, member balances, commission snapshots, or employee roles.
if(!process.argv.includes("--apply"))throw new Error("Pass --apply with the intended database environment");
const db=new PrismaClient(),name="20261115_settlement_review";
async function main(){
try{
 const sql=await readFile(resolve(__dirname,"../prisma/changes/20261115_settlement_review.sql"),"utf8");
 if(/(?:^|;)\s*(?:--[^\n]*\n\s*)*(?:DROP|TRUNCATE|DELETE|UPDATE)\b/i.test(sql))throw new Error("Only additive schema changes are allowed");
 const applied=await db.$transaction(async tx=>{
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(94271632)::text`;
  await tx.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS "_StudioMigration" ("name" TEXT PRIMARY KEY, "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP)');
  const existing=await tx.$queryRaw<{name:string}[]>`SELECT "name" FROM "_StudioMigration" WHERE "name"=${name}`;
  if(existing.length)return false;
  for(const statement of sql.split(";").map(statement=>statement.trim()).filter(Boolean))await tx.$executeRawUnsafe(statement);
  await tx.$executeRaw`INSERT INTO "_StudioMigration" ("name") VALUES (${name})`;
  return true;
 },{maxWait:10000,timeout:60000});
 console.log(applied?"Settlement review schema applied; existing business data preserved":"Settlement review schema already applied");
}finally{await db.$disconnect();}

}
main().catch(error=>{console.error(error);process.exitCode=1;});
