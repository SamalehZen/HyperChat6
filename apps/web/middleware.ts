import { clerkMiddleware } from "@clerk/nextjs/server";

export const runtime = "nodejs";

export default clerkMiddleware({
  publicRoutes: [
    "/admin(.*)",
    "/api/admin(.*)",
  ],
});

export const config = {
  matcher: [
    "/api/:path*",
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};
