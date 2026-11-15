import { DELETE as removeStaff } from "@/app/api/studio/staff/route";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL("/api/studio/staff", request.url);
  url.searchParams.set("id", id);
  return removeStaff(
    new Request(url, { method: "DELETE", headers: request.headers }),
  );
}
