import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// docs/AUTHENTICATED_APP_SHELL_ROUTING.md — session-aware routing lives here,
// not sprinkled across components, so it resolves server-side with no
// render-then-redirect flash.
const isAppRoute = createRouteMatcher(["/app(.*)"]);
const isRoot = createRouteMatcher(["/"]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  // §3: an authenticated user hitting the marketing homepage goes straight
  // to their app home instead of ever seeing the marketing hero.
  if (isRoot(req) && userId) {
    return NextResponse.redirect(new URL("/app", req.url));
  }

  // §10: protect the authenticated app tree, preserving the destination
  // so post-login redirect can send the user back to what they wanted.
  if (isAppRoute(req) && !userId) {
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
