import { clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    const clerk = await clerkClient();

    // Find user
    const users = await clerk.users.getUserList({ emailAddress: [email] });
    if (!users.data.length) {
      return NextResponse.json({ error: "No account found for that email." }, { status: 401 });
    }

    const user = users.data[0];

    // Verify password
    try {
      await clerk.users.verifyPassword({ userId: user.id, password });
    } catch (err: any) {
      return NextResponse.json({ error: "Wrong password." }, { status: 401 });
    }

    // Create a sign-in token the client can redeem
    const signInToken = await clerk.signInTokens.createSignInToken({
      userId: user.id,
      expiresInSeconds: 60,
    });

    return NextResponse.json({ token: signInToken.token });

  } catch (err: any) {
    return NextResponse.json({ 
      error: `Server error: ${err?.message || JSON.stringify(err)}` 
    }, { status: 500 });
  }
}