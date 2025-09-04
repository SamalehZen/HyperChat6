import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs"; // 🚀 important pour éviter Edge

export default clerkMiddleware((auth, req) => {
  return NextResponse.next();
});

export const config = {
  matcher: [
    "/api/:path*",
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};
