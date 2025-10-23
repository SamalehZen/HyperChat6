"use client";

import { Canvas, useFrame } from '@react-three/fiber';
import { useTheme } from 'next-themes';
import { MutableRefObject, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

type DotScreenConfig = {
  dotColor: string;
  bgColor: string;
  dotOpacity: number;
};

type PointerState = {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
};

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const fragmentShader = `
  precision highp float;
  varying vec2 vUv;
  uniform vec2 u_resolution;
  uniform float u_time;
  uniform vec2 u_pointer;
  uniform vec3 u_dot_color;
  uniform vec3 u_bg_color;
  uniform float u_dot_opacity;
  uniform float u_grid_size;
  uniform float u_rotation;

  float circle(vec2 st, float radius) {
    return smoothstep(radius, radius - 0.35, length(st));
  }

  void main() {
    vec2 uv = vUv;
    float aspect = u_resolution.x / max(u_resolution.y, 1.0);
    vec2 pointer = uv - u_pointer;
    pointer.x *= aspect;
    float pointerTrail = exp(-length(pointer) * 8.0);

    vec2 gridUv = uv * u_grid_size;
    float s = sin(u_rotation);
    float c = cos(u_rotation);
    mat2 rot = mat2(c, -s, s, c);
    vec2 cell = (fract(gridUv) - 0.5) * rot;

    float timeWave = sin((gridUv.x + gridUv.y) * 0.4 + u_time * 0.4) * 0.1;
    float dots = circle(cell + timeWave, 0.35);
    float intensity = clamp(dots * u_dot_opacity * 2.8 + pointerTrail, 0.0, 1.0);
    vec3 color = mix(u_bg_color, u_dot_color, intensity);

    gl_FragColor = vec4(color, 1.0);
  }
`;

function DotScreenPlane({ config, pointer }: { config: DotScreenConfig; pointer: MutableRefObject<PointerState> }) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () =>
      ({
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(1, 1) },
        u_pointer: { value: new THREE.Vector2(0.5, 0.5) },
        u_dot_color: { value: new THREE.Color(config.dotColor) },
        u_bg_color: { value: new THREE.Color(config.bgColor) },
        u_dot_opacity: { value: config.dotOpacity },
        u_grid_size: { value: 100 },
        u_rotation: { value: 0 },
      }) satisfies Record<string, THREE.IUniform>,
    []
  );

  useFrame((state, delta) => {
    const material = materialRef.current;
    if (!material) return;
    const uTime = material.uniforms.u_time;
    uTime.value = (uTime.value as number) + delta;
    pointer.current.x += (pointer.current.targetX - pointer.current.x) * 0.12;
    pointer.current.y += (pointer.current.targetY - pointer.current.y) * 0.12;
    const uPointer = material.uniforms.u_pointer.value as THREE.Vector2;
    uPointer.set(pointer.current.x, pointer.current.y);
    const dpr = state.gl.getPixelRatio();
    const width = state.size.width * dpr;
    const height = state.size.height * dpr;
    const uResolution = material.uniforms.u_resolution.value as THREE.Vector2;
    if (uResolution.x !== width || uResolution.y !== height) {
      uResolution.set(width, height);
    }
  });

  useEffect(() => {
    const material = materialRef.current;
    if (!material) return;
    (material.uniforms.u_dot_color.value as THREE.Color).set(config.dotColor);
    (material.uniforms.u_bg_color.value as THREE.Color).set(config.bgColor);
    material.uniforms.u_dot_opacity.value = config.dotOpacity;
  }, [config]);

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial ref={materialRef} uniforms={uniforms} vertexShader={vertexShader} fragmentShader={fragmentShader} />
    </mesh>
  );
}

export function DotScreenShader() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pointer = useRef<PointerState>({ x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5 });
  const { resolvedTheme } = useTheme();

  const config = useMemo<DotScreenConfig>(() => {
    if (resolvedTheme === 'dark') {
      return { dotColor: '#FFFFFF', bgColor: '#121212', dotOpacity: 0.025 };
    }
    if (resolvedTheme === 'light') {
      return { dotColor: '#e1e1e1', bgColor: '#F4F5F5', dotOpacity: 0.15 };
    }
    return { dotColor: '#FFFFFF', bgColor: '#121212', dotOpacity: 0.05 };
  }, [resolvedTheme]);

  useEffect(() => {
    pointer.current.x = 0.5;
    pointer.current.y = 0.5;
    pointer.current.targetX = 0.5;
    pointer.current.targetY = 0.5;
  }, [config]);

  useEffect(() => {
    const updatePointer = (clientX: number, clientY: number) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const width = Math.max(rect.width, 1);
      const height = Math.max(rect.height, 1);
      const x = (clientX - rect.left) / width;
      const y = (clientY - rect.top) / height;
      pointer.current.targetX = THREE.MathUtils.clamp(x, 0, 1);
      pointer.current.targetY = THREE.MathUtils.clamp(1 - y, 0, 1);
    };

    const handlePointerMove = (event: PointerEvent) => updatePointer(event.clientX, event.clientY);
    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches[0]) {
        updatePointer(event.touches[0].clientX, event.touches[0].clientY);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('touchmove', handleTouchMove);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" aria-hidden="true">
      <Canvas
        orthographic
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true }}
        camera={{ position: [0, 0, 1], zoom: 1 }}
        style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
      >
        <color attach="background" args={[config.bgColor]} />
        <DotScreenPlane config={config} pointer={pointer} />
      </Canvas>
    </div>
  );
}
