"use client";
import { usePathname } from "next/navigation";
import type { PropsWithChildren } from "react";
import { ShaderBackground } from "./shader-background";

export default function ChatBackgroundWrapper({ children }: PropsWithChildren) {
  const pathname = usePathname();
  if (pathname === "/chat") {
    return (
      <>
        <div className="pointer-events-none absolute inset-0 -z-10">
          <ShaderBackground>{null}</ShaderBackground>
        </div>
        {children}
      </>
    );
  }
  return <>{children}</>;
}
