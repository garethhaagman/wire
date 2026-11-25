import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn.js";

/*
 * Halftone "Waves / Bokeh / Tidepool" shader, reduced to the one shape, particle and
 * dither it's configured with. Like the CSS fallback color in globals.css
 * (`.auth-shader`), these are illustration colors, not UI theme tokens.
 */
const UNIFORMS = {
  uLight: [-0.4932757352618994, 0.7044707580885331],
  uBg: [0.22745098039215686, 0.5333333333333333, 0.996078431372549],
  uC1: [0.12156862745098039, 0.43529411764705883, 0.47058823529411764],
  uC2: [0.6078431372549019, 0.9098039215686274, 0.8627450980392157],
  uC3: [0.9098039215686274, 0.6352941176470588, 0.47843137254901963],
  uBright: 0,
  uContrast: 1,
  uFill: 1,
  uSpeckle: 1,
  uGlow: 0.07,
  uVig: 0.2,
} as const;
const CELL_SIZE = 2.2;
const SPEED = 1;
const START_TIME = 20;

const VERTEX_SHADER = "attribute vec2 a;void main(){gl_Position=vec4(a,0.0,1.0);}";

const FRAGMENT_SHADER = `
precision highp float;
uniform vec2 uRes, uLight;
uniform float uTime, uCell, uBright, uContrast, uFill, uSpeckle, uGlow, uVig;
uniform vec3 uC1, uC2, uC3, uBg;

float hash(vec2 p){
  vec3 p3 = fract(vec3(p.xyx) * .1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), u.x),
             mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++){ v += a*noise(p); p = p*2.03 + 17.1; a *= 0.5; }
  return v;
}

// Waves: open ocean
float field(vec2 p){
  vec2 c = p - vec2(0.5*uRes.x/uRes.y, 0.5) * 2.2;
  float T = uTime;
  float h = 0.0;
  h += sin(dot(c, vec2(0.9, 0.4))*4.0 - T*0.7);
  h += 0.6*sin(dot(c, vec2(-0.3, 1.0))*6.0 - T*0.9);
  h += 0.35*sin(dot(c, vec2(0.7, -0.7))*9.0 - T*1.2);
  h += 0.2*sin(dot(c, vec2(0.2, 0.98))*14.0 - T*1.5);
  return h / 1.6;
}

float bayer2(vec2 a){ a = floor(a); return fract(dot(a, vec2(0.5, a.y*0.75))); }
float bayer4(vec2 a){ return bayer2(0.5*a)*0.25 + bayer2(a); }

void main(){
  vec2 px = gl_FragCoord.xy;
  vec2 ci = floor(px / uCell);
  vec2 l = fract(px / uCell) - 0.5;
  vec2 p = (ci + 0.5) * uCell / uRes.y * 2.2;

  float e = 0.012;
  float h  = field(p);
  float hx = field(p + vec2(e, 0.0));
  float hy = field(p + vec2(0.0, e));
  vec3 n = normalize(vec3(-(hx-h)/e*0.22, -(hy-h)/e*0.22, 1.0));
  vec3 L = normalize(vec3(uLight, 0.55));
  float diff = max(dot(n, L), 0.0);
  float spec = pow(max(dot(reflect(-L, n), vec3(0,0,1)), 0.0), 12.0);

  float b = 0.55*(0.5 + 0.5*h) + 0.35*diff*diff + 0.35*spec;
  b *= 0.8 + 0.2*fbm(p*0.6 + uTime*0.02);
  vec2 vu = gl_FragCoord.xy / uRes - 0.5;
  b *= 1.0 - uVig*dot(vu, vu)*2.0;
  b = clamp(pow(max(b, 0.0), 1.35) * 1.25, 0.0, 1.0);
  b = clamp((b - 0.5)*uContrast + 0.5 + uBright, 0.0, 1.0);

  float on = step(bayer4(ci)*0.85 + 0.06, b);           // ordered 4x4 dither
  float r = mix(0.24, 0.47, b) * uFill;
  float mask = exp(-dot(l, l) / max(r*r*0.45, 0.001));  // bokeh particle

  float k = hash(ci + 7.0);
  vec3 col = mix(uC1, uC2, smoothstep(0.15, 0.95, b));
  if (k > 1.0 - 0.14*uSpeckle) col = mix(col, uC3, 0.8);
  else if (k < 0.08*uSpeckle) col = mix(col, uC1*0.6, 0.6);
  col *= 0.6 + 0.7*b;

  float m = clamp(mask * on, 0.0, 1.0);
  gl_FragColor = vec4(mix(uBg, col, m) + mix(uC1, uC2, b) * b * uGlow, 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn("auth shader compile failed", gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}

function motionReduced(): boolean {
  return (
    document.documentElement.dataset.motion === "reduced" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Animated halftone panel. Falls back to the flat `.auth-shader` background if WebGL is unavailable. */
export function AuthShader({ className }: { className?: string }): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext("webgl", { antialias: false, premultipliedAlpha: false });
    if (!canvas || !gl) return;

    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    const program = gl.createProgram();
    if (!vs || !fs || !program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.bindAttribLocation(program, 0, "a");
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const set = (name: string, value: number | readonly number[]): void => {
      const loc = gl.getUniformLocation(program, name);
      if (typeof value === "number") gl.uniform1f(loc, value);
      else if (value.length === 2) gl.uniform2fv(loc, [...value]);
      else gl.uniform3fv(loc, [...value]);
    };
    for (const [name, value] of Object.entries(UNIFORMS)) set(name, value);

    let time = START_TIME;
    let last = performance.now();
    let frameId = 0;
    let visible = true;

    const draw = (): void => {
      set("uTime", time);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const resize = (): void => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
      set("uRes", [canvas.width, canvas.height]);
      set("uCell", Math.max(3, Math.round(CELL_SIZE * dpr)));
      draw();
    };

    const frame = (now: number): void => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      time += dt * SPEED;
      draw();
      frameId = requestAnimationFrame(frame);
    };

    const start = (): void => {
      if (frameId || !visible || motionReduced()) return;
      last = performance.now();
      frameId = requestAnimationFrame(frame);
    };
    const stop = (): void => {
      cancelAnimationFrame(frameId);
      frameId = 0;
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
      if (visible) start();
      else stop();
    });
    intersectionObserver.observe(canvas);

    resize();
    start();

    return () => {
      stop();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      // Free GPU objects but keep the context: a canvas only ever has one, so losing it
      // here would leave a remount (StrictMode, HMR) with a dead canvas.
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, []);

  return (
    <div className={cn("auth-shader relative overflow-hidden", className)} aria-hidden="true">
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />
    </div>
  );
}
