"use client";

import { useEffect, useRef } from "react";

export function RedLinesFogBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = (canvas.getContext("webgl2") as WebGL2RenderingContext | null);
    if (!gl) {
      // WebGL2 required for this shader (uses out vec4)
      return;
    }

    const vertexSource = `#version 300 es
precision highp float;
layout(location = 0) in vec2 a_position;
out vec2 vUv;
void main() {
  vUv = 0.5 * (a_position + 1.0);
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

    const fragmentSource = `#version 300 es
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform vec3 uColor;

in vec2 vUv;
out vec4 fragColor;

float g(float v){return sqrt(clamp(v,0.0,1.0));}

float beam(vec2 uv,float d,float w,float power){
  float dist=length(uv);
  return pow(clamp(1.0-abs(dist-d)/w,0.0,1.0),power);
}

void main() {
  vec2 frag=gl_FragCoord.xy;
  vec2 uv=frag/uResolution.xy;
  vec2 uvc=2.0*uv-1.0;
  uvc.x*=uResolution.x/uResolution.y;

  // downward movement
  uvc.y-=uTime*0.5;

  float topA = exp(-6.0*abs(uvc.y+0.8));
  float a = beam(uvc*0.9, 0.2, 0.6, 1.0);
  float b = beam(uvc*1.2, 0.4, 0.6, 1.0);
  float L = a + b*topA;

  // fog
  float fog=0.0;
  float mv = uTime*0.2;
  float lv = (2.0*uv.y+0.8-0.5)*4.0;
  vec2 muv=uv*mat2(0.8,0.6,-0.6,0.8);
  fog+=smoothstep(0.0,1.0,0.5+0.5*
    cos(muv.y*20.0+cos(muv.x*5.0+mv*0.5)+mv+lv));

  float LF=L+fog;
  float tone=g(LF);
  vec3 col=tone*uColor;
  float alpha=clamp(tone,0.0,1.0);

  fragColor = vec4(col,alpha);
}`;

    const compile = (type: number, source: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, source);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error("Shader compile error:\n", gl.getShaderInfoLog(sh));
        gl.deleteShader(sh);
        return null;
      }
      return sh;
    };

    const vs = compile(gl.VERTEX_SHADER, vertexSource);
    const fs = compile(gl.FRAGMENT_SHADER, fragmentSource);
    if (!vs || !fs) return;

    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program link error:\n", gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);

    // Fullscreen quad
    const vertices = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1,
    ]);
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uResolution = gl.getUniformLocation(program, "uResolution");
    const uTime = gl.getUniformLocation(program, "uTime");
    const uColor = gl.getUniformLocation(program, "uColor");

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width * dpr));
      const height = Math.max(1, Math.floor(rect.height * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, width, height);
      if (uResolution) gl.uniform2f(uResolution, width, height);
    };

    // Red color with slight softness
    if (uColor) gl.uniform3f(uColor, 1.0, 0.2, 0.2);

    const start = performance.now();
    const render = () => {
      rafRef.current = requestAnimationFrame(render);
      const t = (performance.now() - start) * 0.001; // seconds
      if (uTime) gl.uniform1f(uTime, t);
      gl.clearColor(0,0,0,0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    const onResize = () => resize();
    window.addEventListener("resize", onResize);
    resize();
    render();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
      aria-hidden="true"
    />
  );
}
