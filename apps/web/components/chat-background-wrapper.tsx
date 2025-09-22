"use client";
import { usePathname } from "next/navigation";
import type { PropsWithChildren } from "react";
import { ShaderBackground } from "./shader-background";

export default function ChatBackgroundWrapper({ children }: PropsWithChildren) {
  const pathname = usePathname();
  if (pathname === "/chat") {
    return <ShaderBackground>{children}</ShaderBackground>;
  }
  return <>{children}</>;
}
