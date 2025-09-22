"use client";
import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

export interface RedBeamBackgroundProps {
  className?: string;
  style?: React.CSSProperties;
  color?: string;
  intensity?: number;
  mouseTiltStrength?: number;
  performance?: { minFps?: number; maxFps?: number; dprFloor?: number };
}

function supportsWebGL(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return !!(
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")
    );
  } catch {
    return false;
  }
}

function createFullscreenTriangle() {
  const geometry = new THREE.BufferGeometry();
  const vertices = new Float32Array([
    -1, -1, 0,
    3, -1, 0,
    -1, 3, 0,
  ]);
  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  return geometry;
}

const vertexShader = `#version 300 es
precision highp float;
layout(location = 0) in vec3 position;

out vec2 vUv;

void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position, 1.0);
}
`;

const fragmentShader = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 outColor;

uniform float uTime;
uniform vec2 uResolution;
uniform vec3 uColor;
uniform float uIntensity;
uniform float uAlpha;
uniform vec2 uBeamStart;
uniform vec2 uBeamEnd;
uniform float uBeamWidth; // relative to min(res)
uniform float uFogAmount;

float sdSegment(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

void main() {
  vec2 res = uResolution;
  vec2 p = vUv * res;
  vec2 a = uBeamStart * res;
  vec2 b = uBeamEnd * res;
  float d = sdSegment(p, a, b);

  float minDim = min(res.x, res.y);
  float halfW = uBeamWidth * minDim * 0.5;
  float beam = smoothstep(halfW, 0.0, d);

  vec2 dir = normalize(b - a + 1e-5);
  vec2 ortho = vec2(-dir.y, dir.x);
  float t = uTime * 0.08;
  float fogLine = dot((p - a), dir) / length(b - a);
  float fogDist = dot((p - a), ortho);
  float fogBase = noise(vec2(fogLine * 4.0 + t, fogDist * 0.02 - t)) * 0.6 + 0.4;
  float fog = fogBase * uFogAmount;

  float alpha = (beam * uIntensity * 0.9 + fog * 0.35) * uAlpha;
  vec2 q = vUv * (1.0 - vUv);
  float vignette = pow(q.x * q.y * 4.0, 0.25);
  alpha *= vignette + 0.4;

  outColor = vec4(uColor, alpha);
}
`;

export function RedBeamBackground({
  className,
  style,
  color = "#FF4444",
  intensity = 0.9,
  mouseTiltStrength = 0,
  performance: perfOptions,
}: RedBeamBackgroundProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stoppedRef = useRef(false);

  const perf = useMemo(
    () => ({
      minFps: perfOptions?.minFps ?? 50,
      maxFps: perfOptions?.maxFps ?? 58,
      dprFloor: perfOptions?.dprFloor ?? 0.6,
    }),
    [perfOptions]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!supportsWebGL()) return;
    const container = containerRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: "high-performance" });
    renderer.setClearColor(0x000000, 0);
    renderer.autoClear = true;
    renderer.setPixelRatio(Math.max(perf.dprFloor, Math.min(window.devicePixelRatio || 1, 1)));

    const canvas = renderer.domElement;
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    canvas.style.pointerEvents = "none";
    container.appendChild(canvas);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const geometry = createFullscreenTriangle();

    const mat = new THREE.RawShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uColor: { value: new THREE.Color(color) },
        uIntensity: { value: intensity },
        uAlpha: { value: 0.7 },
        uBeamStart: { value: new THREE.Vector2(0.35, -0.15) },
        uBeamEnd: { value: new THREE.Vector2(0.88, 0.55) },
        uBeamWidth: { value: 0.0075 },
        uFogAmount: { value: 0.75 },
      },
    });

    const mesh = new THREE.Mesh(geometry, mat);
    scene.add(mesh);

    let animationId = 0;
    let lastTime = now();
    let lastFpsCheck = lastTime;
    let frames = 0;

    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        stoppedRef.current = !entry.isIntersecting;
      },
      { threshold: 0 }
    );
    io.observe(container);

    const onResize = () => {
      const { clientWidth, clientHeight } = container;
      renderer.setSize(clientWidth, clientHeight, false);
      (mat.uniforms.uResolution.value as THREE.Vector2).set(clientWidth, clientHeight);
    };

    const onVisibility = () => {
      if (document.hidden) {
        stoppedRef.current = true;
      } else {
        stoppedRef.current = false;
        lastTime = now();
        lastFpsCheck = lastTime;
        frames = 0;
        loop();
      }
    };

    const onContextLost = (e: Event) => {
      e.preventDefault();
      stoppedRef.current = true;
    };

    canvas.addEventListener("webglcontextlost", onContextLost as EventListener, false);

    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);

    onResize();

    const isDark = document.documentElement.classList.contains("dark");
    (mat.uniforms.uAlpha as any).value = isDark ? 0.7 : 0.55;

    let tiltX = 0, tiltY = 0;
    const handleMouse = (e: MouseEvent) => {
      if (mouseTiltStrength <= 0) return;
      const rect = container.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      tiltX = ((e.clientY - cy) / rect.height) * mouseTiltStrength;
      tiltY = ((e.clientX - cx) / rect.width) * mouseTiltStrength;
      const baseStart = new THREE.Vector2(0.35, -0.15);
      const baseEnd = new THREE.Vector2(0.88, 0.55);
      (mat.uniforms.uBeamStart.value as THREE.Vector2).set(baseStart.x + tiltX * 0.03, baseStart.y + tiltY * 0.03);
      (mat.uniforms.uBeamEnd.value as THREE.Vector2).set(baseEnd.x + tiltY * 0.02, baseEnd.y + tiltX * 0.02);
    };
    window.addEventListener("mousemove", handleMouse);

    function now() {
      if (typeof window !== "undefined" && window.performance && typeof window.performance.now === "function") {
        return window.performance.now();
      }
      return Date.now();
    }

    const loop = () => {
      if (stoppedRef.current) {
        animationId = requestAnimationFrame(loop);
        return;
      }

      const _now = now();
      const dt = (_now - lastTime) / 1000;
      lastTime = _now;

      frames++;
      if (_now - lastFpsCheck > 1000) {
        const fps = (frames * 1000) / (_now - lastFpsCheck);
        frames = 0;
        lastFpsCheck = _now;
        const currentPR = renderer.getPixelRatio();
        if (fps < perf.minFps && currentPR > perf.dprFloor) {
          renderer.setPixelRatio(Math.max(perf.dprFloor, currentPR - 0.1));
          onResize();
        } else if (fps > perf.maxFps && currentPR < (window.devicePixelRatio || 1)) {
          renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, currentPR + 0.1));
          onResize();
        }
      }

      (mat.uniforms.uTime as any).value += dt;
      renderer.render(scene, camera);
      animationId = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      cancelAnimationFrame(animationId);
      io.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", handleMouse);
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("webglcontextlost", onContextLost as EventListener);

      geometry.dispose();
      (mat as THREE.Material).dispose();
      renderer.dispose();
      if (canvas.parentElement === container) container.removeChild(canvas);
    };
  }, [color, intensity, mouseTiltStrength, perf.dprFloor, perf.maxFps, perf.minFps]);

  return (
    <div
      ref={containerRef}
      className={["pointer-events-none absolute inset-0 z-0", className || ""].join(" ")}
      style={style}
      aria-hidden="true"
    />
  );
}

export default RedBeamBackground;
