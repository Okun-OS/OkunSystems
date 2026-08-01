import { NextResponse } from "next/server";
import { acceptInvitation } from "@/lib/invitations/actions";

export async function POST(request: Request) {
  const { token, name, password } = await request.json();

  if (!token || !name || !password) {
    return NextResponse.json(
      { error: "token, name und password sind erforderlich." },
      { status: 400 }
    );
  }

  const result = await acceptInvitation({ token, name, password });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ email: result.email });
}
