import prisma from "./prisma";
// Keep the existing tagged SQL queries while sharing the Prisma connection pool.
// The old Neon endpoints accept different row shapes; migrate their types per endpoint.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LegacyRow = Record<string, any>;

export async function sql(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<LegacyRow[]> {
  const rows = await prisma.$queryRaw<Record<string, unknown>[]>(
    strings,
    ...values,
  );
  return rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [
        key,
        typeof value === "bigint" ? value.toString() : value,
      ]),
    ),
  );
}
