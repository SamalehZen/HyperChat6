"use client";

import { useEffect, useRef } from "react";

export function NeuralNoiseBackground({
  color = [0.9, 0.2, 0.4],
  opacity = 0.95,
  speed = 0.001,
}: {
  color?: [number, number, number];
  opacity?: number;
  speed?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const glRef = useRef<WebGLRenderingContext | WebGL2RenderingContext | null>(null);
  const uniformsRef = useRef<Record<string, WebGLUniformLocation | null>>({});
  const pointer = useRef({ x: 0, y: 0, tX: 0, tY: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    const vsSource = `
      precision mediump float;
      varying vec2 vUv;
      attribute vec2 a_position;
      void main() {
        vUv = 0.5 * (a_position + 1.0);
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;
    const fsSource = `
      precision mediump float;
      varying vec2 vUv;
      uniform float u_time;
      uniform float u_ratio;
      uniform vec2 u_pointer_position;
      uniform vec3 u_color;
      uniform float u_speed;
      
      vec2 rotate(vec2 uv, float th) {
        return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv;
      }
      
      float neuro_shape(vec2 uv, float t, float p) {
        vec2 sine_acc = vec2(0.0);
        vec2 res = vec2(0.0);
        float scale = 8.0;
        for (int j = 0; j < 15; j++) {
          uv = rotate(uv, 1.0);
          sine_acc = rotate(sine_acc, 1.0);
          vec2 layer = uv * scale + float(j) + sine_acc - t;
          sine_acc += sin(layer) + 2.4 * p;
          res += (0.5 + 0.5 * cos(layer)) / scale;
          scale *= 1.2;
        }
        return res.x + res.y;
      }
      
      void main() {
        vec2 uv = 0.5 * vUv;
        // Maintain circular falloff across aspect ratios
        vec2 center = vUv - 0.5;
        center.x *= u_ratio;
        
        vec2 pointer = vUv - u_pointer_position;
        pointer.x *= u_ratio;
        float p = clamp(length(pointer), 0.0, 1.0);
        p = 0.5 * pow(1.0 - p, 2.0);
        
        float t = u_speed * u_time;
        vec3 col = vec3(0.0);
        float noise = neuro_shape(uv, t, p);
        noise = 1.2 * pow(noise, 3.0);
        noise += pow(noise, 10.0);
        noise = max(0.0, noise - 0.5);
        // Aspect-correct radial falloff so it reaches both left and right edges evenly
        noise *= max(0.0, 1.0 - length(center));
        col = u_color * noise;
        gl_FragColor = vec4(col, noise);
      }
    `;

    const gl = (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")) as
      | WebGLRenderingContext
      | WebGL2RenderingContext
      | null;
    if (!gl) return;
    glRef.current = gl;

    const createShader = (source: string, type: number) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compile error:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const createProgram = (vs: WebGLShader, fs: WebGLShader) => {
      const program = gl.createProgram()!;
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("Program link error:", gl.getProgramInfoLog(program));
        return null;
      }
      return program;
    };

    const vs = createShader(vsSource, gl.VERTEX_SHADER)!;
    const fs = createShader(fsSource, gl.FRAGMENT_SHADER)!;
    if (!vs || !fs) return;

    const program = createProgram(vs, fs);
    if (!program) return;
    gl.useProgram(program);

    // Quad covering full screen
    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Uniforms
    const getUniform = (name: string) => gl.getUniformLocation(program, name);
    uniformsRef.current = {
      u_time: getUniform("u_time"),
      u_ratio: getUniform("u_ratio"),
      u_pointer_position: getUniform("u_pointer_position"),
      u_color: getUniform("u_color"),
      u_speed: getUniform("u_speed"),
    };

    // Initial uniforms
    gl.uniform3f(uniformsRef.current.u_color, color[0], color[1], color[2]);
    gl.uniform1f(uniformsRef.current.u_speed, speed);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width * devicePixelRatio));
      const height = Math.max(1, Math.floor(rect.height * devicePixelRatio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform1f(uniformsRef.current.u_ratio, canvas.width / canvas.height);
    };

    const onPointerMove = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const x = (clientX - rect.left) / Math.max(1, rect.width);
      const y = (clientY - rect.top) / Math.max(1, rect.height);
      pointer.current.tX = x * rect.width; // store in CSS px for smoothing
      pointer.current.tY = y * rect.height;
    };

    const pointermove = (e: PointerEvent) => onPointerMove(e.clientX, e.clientY);
    const touchmove = (e: TouchEvent) => {
      if (e.targetTouches[0]) onPointerMove(e.targetTouches[0].clientX, e.targetTouches[0].clientY);
    };
    const click = (e: MouseEvent) => onPointerMove(e.clientX, e.clientY);

    window.addEventListener("pointermove", pointermove);
    window.addEventListener("touchmove", touchmove);
    window.addEventListener("click", click);
    window.addEventListener("resize", resize);

    resize();

    const render = () => {
      rafRef.current = requestAnimationFrame(render);
      // Smooth pointer
      pointer.current.x += (pointer.current.tX - pointer.current.x) * 0.2;
      pointer.current.y += (pointer.current.tY - pointer.current.y) * 0.2;

      const rect = canvas.getBoundingClientRect();
      const px = Math.max(0, Math.min(1, pointer.current.x / Math.max(1, rect.width)));
      const py = Math.max(0, Math.min(1, pointer.current.y / Math.max(1, rect.height)));

      gl.uniform1f(uniformsRef.current.u_time, performance.now());
      gl.uniform2f(uniformsRef.current.u_pointer_position, px, 1 - py);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    render();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("pointermove", pointermove);
      window.removeEventListener("touchmove", touchmove);
      window.removeEventListener("click", click);
      window.removeEventListener("resize", resize);

      // Cleanup GL resources
      const current = glRef.current;
      if (current) {
        // WebGL buffers and program will be GC'd when context is lost; explicit disposal API is limited
      }
    };
  }, [color, speed]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
      style={{ opacity }}
      aria-hidden="true"
    />
  );
}
