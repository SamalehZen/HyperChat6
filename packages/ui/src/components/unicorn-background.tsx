"use client";
import React, { useEffect, useRef, useState, Suspense } from "react";
import { cn } from "../lib/utils";
const UnicornScene = React.lazy(() => import("unicornstudio-react"));

export function UnicornBackground({ projectId, className }: { projectId: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const update = () => {
      if (!ref.current) return;
      const { width, height } = ref.current.getBoundingClientRect();
      setSize({ w: Math.round(width), h: Math.round(height) });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <div
      ref={ref}
      className={cn("absolute inset-0 w-full h-full pointer-events-none z-0", className)}
      aria-hidden="true"
    >
      {size.w > 0 && size.h > 0 && (
        <Suspense fallback={null}>
          <UnicornScene production={true} projectId={projectId} width={size.w} height={size.h} />
        </Suspense>
      )}
    </div>
  );
}
