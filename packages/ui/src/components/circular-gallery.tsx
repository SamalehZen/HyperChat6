"use client";

import React, { useEffect, useRef } from "react";

type Item = { image: string; text: string };

export type CircularGalleryProps = {
  items?: Item[];
  bend?: number;
  textColor?: string;
  borderRadius?: number;
  font?: string;
};

const DEFAULT_ITEMS: Item[] = Array.from({ length: 10 }).map((_, i) => ({
  image: `https://picsum.photos/seed/cg_${i}/512/512`,
  text: `Item ${i + 1}`,
}));

const DEFAULTS = {
  bend: 3,
  textColor: "#ffffff",
  borderRadius: 0.05,
  font: "bold 30px DM Sans",
};

export const CircularGallery: React.FC<CircularGalleryProps> = ({
  items = DEFAULT_ITEMS,
  bend = DEFAULTS.bend,
  textColor = DEFAULTS.textColor,
  borderRadius = DEFAULTS.borderRadius,
  font = DEFAULTS.font,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let destroyed = false;
    let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
    let renderer: any = null;
    let camera: any = null;
    let scene: any = null;
    let group: any = null;
    let targetSpeed = 0;
    let rotation = 0;

    let handleResize: (() => void) | null = null;
    let onMouseMove: ((e: MouseEvent) => void) | null = null;
    let onWheel: ((e: WheelEvent) => void) | null = null;
    let onTouchMove: ((e: TouchEvent) => void) | null = null;

    const el = containerRef.current;

    (async () => {
      const OGL: any = await import("ogl");
      if (destroyed) return;

      renderer = new OGL.Renderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
      gl = renderer.gl;
      if (!gl) return;
      gl.clearColor(0, 0, 0, 0);
      el!.appendChild(renderer.domElement);

      camera = new OGL.Camera(gl, { fov: 35 });
      camera.position.set(0, 0, 7);
      scene = new OGL.Transform();
      group = new OGL.Transform();
      scene.addChild(group);

      const createRoundedPlaneProgram = () => {
        const vertex = /* glsl */ `
          attribute vec2 uv;
          attribute vec3 position;
          uniform mat4 modelViewMatrix;
          uniform mat4 projectionMatrix;
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `;
        const fragment = /* glsl */ `
          precision highp float;
          uniform sampler2D uTexture;
          uniform float uOpacity;
          uniform float uRadius;
          varying vec2 vUv;

          float roundedBoxSDF(vec2 p, vec2 b, float r){
            vec2 q = abs(p) - b + vec2(r);
            return length(max(q, 0.0)) - r;
          }

          void main(){
            vec2 p = (vUv - 0.5) * 2.0;
            float sdf = roundedBoxSDF(p, vec2(1.0), uRadius);
            if (sdf > 0.0) discard;
            vec4 color = texture2D(uTexture, vUv);
            gl_FragColor = vec4(color.rgb, color.a * uOpacity);
          }
        `;
        return { vertex, fragment };
      };

      const { vertex, fragment } = createRoundedPlaneProgram();

      const makeTexture = (url: string) => {
        const texture = new OGL.Texture(gl);
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          texture.image = img;
        };
        img.src = url;
        return texture;
      };

      const planes: any[] = [];
      const geo = new OGL.Plane(gl, { width: 1.2, height: 1.2, widthSegments: 1, heightSegments: 1 });

      const programCache: Record<string, any> = {};
      const getProgram = () => {
        if (!programCache.base) {
          programCache.base = new OGL.Program(gl, {
            vertex,
            fragment,
            transparent: true,
            uniforms: {
              uTexture: { value: null },
              uOpacity: { value: 1 },
              uRadius: { value: Math.max(0.0, Math.min(0.49, borderRadius)) },
            },
          });
        }
        return programCache.base;
      };

      const count = Math.max(6, items.length);
      const radius = 3.2;

      for (let i = 0; i < count; i++) {
        const item = items[i % items.length];
        const texture = makeTexture(item.image);
        const program = getProgram();
        const mesh = new OGL.Mesh(gl, { geometry: geo, program });
        mesh.program = program;
        mesh.program.uniforms.uTexture.value = texture;
        const angle = (i / count) * Math.PI * 2;
        mesh.position.set(
          Math.cos(angle) * radius,
          Math.sin(angle) * (radius * 0.45),
          0
        );
        mesh.rotation.z = angle + Math.PI * 0.5;
        mesh.setParent(group);
        planes.push(mesh);
      }

      function resize() {
        const width = el!.clientWidth || 300;
        const height = el!.clientHeight || 300;
        renderer.setSize(width, height);
        camera.perspective({ aspect: width / height });
        const scale = Math.min(width, height) / 600
        planes.forEach((m) => {
          m.scale.set(scale, scale, 1);
        });
      }

      handleResize = resize;
      window.addEventListener("resize", handleResize);
      resize();

      onMouseMove = (e: MouseEvent) => {
        const rect = el!.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        targetSpeed = x * 0.02 * bend;
      };
      el!.addEventListener("mousemove", onMouseMove);

      onTouchMove = (e: TouchEvent) => {
        const t = e.touches[0];
        if (!t) return;
        const rect = el!.getBoundingClientRect();
        const x = (t.clientX - rect.left) / rect.width - 0.5;
        targetSpeed = x * 0.02 * bend;
      };
      el!.addEventListener("touchmove", onTouchMove, { passive: true });

      onWheel = (e: WheelEvent) => {
        targetSpeed += (e.deltaY > 0 ? -1 : 1) * 0.01;
      };
      el!.addEventListener("wheel", onWheel, { passive: true });

      const tick = () => {
        if (destroyed) return;
        rotation += targetSpeed;
        targetSpeed *= 0.95;
        group.rotation.z = rotation;
        renderer.render({ scene, camera });
        rafRef.current = requestAnimationFrame(tick);
      };

      tick();
    })();

    return () => {
      destroyed = true;

      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      try {
        if (onMouseMove) containerRef.current?.removeEventListener("mousemove", onMouseMove as any);
        if (onTouchMove) containerRef.current?.removeEventListener("touchmove", onTouchMove as any);
        if (onWheel) containerRef.current?.removeEventListener("wheel", onWheel as any);
        if (handleResize) window.removeEventListener("resize", handleResize);
      } catch {}

      try {
        const canvas = containerRef.current?.querySelector("canvas");
        if (canvas && canvas.parentElement) canvas.parentElement.removeChild(canvas);
      } catch {}

      try {
        const loseCtx: any = (gl as any) && (gl as any).getExtension && (gl as any).getExtension("WEBGL_lose_context");
        if (loseCtx && loseCtx.loseContext) loseCtx.loseContext();
      } catch {}
    };
  }, [items, bend, textColor, borderRadius, font]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      style={{ position: "relative", overflow: "hidden" }}
      aria-label="Circular Gallery"
    />
  );
};

export const Component = CircularGallery;
export { CircularGallery };
