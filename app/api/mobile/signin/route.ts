import { clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    const clerk = await clerkClient();

    // Verify credentials by checking the user exists and password is valid
    const users = await clerk.users.getUserList({ emailAddress: [email] });
    if (!users.data.length) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const user = users.data[0];

    // Use Clerk's verifyPassword
    const verified = await clerk.users.verifyPassword({
      userId: user.id,
      password,
    });

    if (!verified) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    // Create a session token
    const token = await clerk.sessions.createSession({ userId: user.id });

    return NextResponse.json({ 
      sessionId: token.id,
      userId: user.id,
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }
}