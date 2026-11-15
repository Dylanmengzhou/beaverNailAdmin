import { NextResponse } from "next/server";
import { PUT } from "@/app/api/studio/staff/route";
import { apiError } from "@/lib/studio/http";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await PUT(
      new Request(new URL("/api/studio/staff", request.url), {
        method: "PUT",
        headers: request.headers,
        body: JSON.stringify({
          services: ["nails"],
          active: true,
          durationMinutes: 120,
          schedule: [
            { days: [0, 1, 2, 3, 4, 5, 6], start: "10:00", end: "16:00" },
          ],
          ...body,
        }),
      }),
    );
    const value = await response.json();
    return response.ok
      ? NextResponse.json(
          { message: "员工已创建", artist: value },
          { status: 201 },
        )
      : NextResponse.json(value, { status: response.status });
  } catch (error) {
    return apiError(error);
  }
}
