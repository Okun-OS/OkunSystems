import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getPresignedUploadUrl } from "@/lib/storage";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fileName, mimeType } = await req.json();
  if (!fileName || !mimeType) {
    return NextResponse.json({ error: "fileName and mimeType required" }, { status: 400 });
  }

  const ext = fileName.split(".").pop() ?? "mp4";
  const key = `system/welcome-video.${ext}`;

  try {
    const uploadUrl = await getPresignedUploadUrl(key, mimeType, 600);
    const publicUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
    if (!publicUrl) {
      return NextResponse.json({ error: "R2_PUBLIC_URL not configured" }, { status: 500 });
    }
    return NextResponse.json({ uploadUrl, publicVideoUrl: `${publicUrl}/${key}` });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "R2 error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { publicVideoUrl } = await req.json();
  if (!publicVideoUrl) {
    return NextResponse.json({ error: "publicVideoUrl required" }, { status: 400 });
  }

  await db.systemSetting.upsert({
    where: { key: "welcome_video_url" },
    update: { value: publicVideoUrl },
    create: { key: "welcome_video_url", value: publicVideoUrl },
  });

  return NextResponse.json({ ok: true });
}
