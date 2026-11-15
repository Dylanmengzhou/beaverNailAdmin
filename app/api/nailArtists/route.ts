import { NextResponse } from "next/server";
import { GET as listStaff } from "@/app/api/studio/staff/route";

export async function GET(request: Request) {
  const response = await listStaff(request);
  const value = await response.json();
  return NextResponse.json(response.ok ? { nailArtists: value } : value, {
    status: response.status,
  });
}
