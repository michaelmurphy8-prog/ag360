// middleware.ts (root of project)
// Handles auth protection + redirects signed-in users away from landing page

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Public routes — no auth required
const isPublicRoute = createRouteMatcher([
  "/",
  "/login(.*)",
  "/signup(.*)",
  "/pricing(.*)",
  "/api/webhooks(.*)",
  "/api/waitlist",
  "/api/connect360/public-stats",
  "/api/connect360(.*)",
  "/home(.*)",
  "/discover(.*)",
  "/profile(.*)",
  "/more(.*)",
  "/messages(.*)",
  "/network(.*)",
  "/jobs(.*)",
  "/register(.*)",
  "/about(.*)",
  "/notifications(.*)",
  "/privacy-safety(.*)",
  "/language-region(.*)",
  "/terms-privacy(.*)",
  "/api/connect360(.*)",
  "/home(.*)",
  "/discover(.*)",
  "/profile(.*)",
  "/more(.*)",
  "/messages(.*)",
  "/network(.*)",
  "/jobs(.*)",
  "/register(.*)",
  "/about(.*)",
  "/notifications(.*)",
  "/privacy-safety(.*)",
  "/language-region(.*)",
  "/terms-privacy(.*)",
  "/providers(.*)",
  "/splash(.*)",
  "/auth(.*)",
  "/api/mobile(.*)",
  "/mobile(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  const { userId } = await auth();

  // If user is signed in and hitting the landing page, redirect to dashboard
  if (userId && request.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/grain360", request.url));
  }

  // Protect all non-public routes
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};