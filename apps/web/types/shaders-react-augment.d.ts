import type React from "react";

declare module "@paper-design/shaders-react" {
  export const MeshGradient: React.FC<any>;
  export interface MeshGradientProps {
    backgroundColor?: string;
    wireframe?: boolean | "true" | "false";
  }
}
