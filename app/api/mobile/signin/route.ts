import { clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    const clerk = await clerkClient();

    const users = await clerk.users.getUserList({ emailAddress: [email] });
    if (!users.data.length) {
      return NextResponse.json({ error: "No account found for that email." }, { status: 401 });
    }

    const user = users.data[0];

    try {
      const verified = await clerk.users.verifyPassword({
        userId: user.id,
        password,
      });
      
      if (!verified) {
        return NextResponse.json({ error: "Wrong password." }, { status: 401 });
      }
    } catch (pwErr: any) {
      return NextResponse.json({ 
        error: `Password error: ${pwErr?.message || pwErr?.errors?.[0]?.message || JSON.stringify(pwErr)}` 
      }, { status: 401 });
    }

    const session = await clerk.sessions.createSession({ userId: user.id });

    return NextResponse.json({ 
      sessionId: session.id,
      userId: user.id,
    });

  } catch (err: any) {
    return NextResponse.json({ 
      error: `Server error: ${err?.message || JSON.stringify(err)}` 
    }, { status: 500 });
  }
}