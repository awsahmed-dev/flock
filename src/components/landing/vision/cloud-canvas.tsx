"use client";

import { useEffect, useRef } from "react";

/**
 * WebGL volumetric cloud field for the vision hero.
 *
 * A fullscreen fragment shader builds clouds from 5-octave rotated FBM
 * noise, domain-warped by a second field, with directional lighting
 * derived from a vertical density gradient (bright tops, shaded
 * bellies) — the classic "shader clouds" technique, no textures, no
 * libraries, ~1 draw call per frame.
 *
 * Uniforms driven from the page:
 *   uScroll — ascent through the deck: clouds sink, spread, and thin
 *   uMouse  — pointer parallax
 *   uCloud/uShadow/uOpacity — day flight vs moonlit night
 *
 * Detail choices that make it read high-end:
 *   - two cloud strata at different scales/speeds, front warped by back
 *   - readability well: density dips around the headline center
 *   - premultiplied alpha over the CSS sky gradient (no hard edges)
 *   - DPR capped at 1.5; pauses when the tab hides; draws one frame
 *     synchronously so first paint never shows an empty sky;
 *     prefers-reduced-motion keeps that single still frame.
 */

const FRAG = `
precision highp float;
uniform vec2  uRes;
uniform float uTime;
uniform float uScroll;
uniform vec2  uMouse;
uniform vec3  uCloud;
uniform vec3  uShadow;
uniform float uOpacity;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = m * p;
    a *= 0.55;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes.xy;        // 0..1, y up
  vec2 p = uv;
  p.x *= uRes.x / uRes.y;

  float t = uTime * 0.018;
  vec2 par = uMouse * 0.045;
  float sink = uScroll * 0.85;                 // ascent pushes clouds down

  // back stratum — broad, slow
  vec2 q1 = p * 1.15 + vec2(t * 0.55, sink * 0.6) + par * 0.6;
  float n1 = fbm(q1);

  // front stratum — finer, faster, warped by the back field
  vec2 q2 = p * 2.35 + vec2(-t * 0.95, sink * 1.05) + par * 1.6;
  float n2 = fbm(q2 + n1 * 0.45);

  float field = n1 * 0.62 + n2 * 0.48;

  // coverage: soft threshold, thinning as you ascend
  float cov = smoothstep(0.47, 0.78, field - uScroll * 0.08);

  // vertical band: fuller sky up top, clearing toward the fold
  cov *= smoothstep(-0.15, 0.35, uv.y);

  // readability well around the headline (center, slightly above middle)
  vec2 c = uv - vec2(0.5, 0.52);
  c.x *= uRes.x / uRes.y * 0.72;
  cov *= mix(0.38, 1.0, smoothstep(0.18, 0.52, length(c)));

  // lighting: density just above → bright tops, shaded bellies
  float above = fbm(q1 + vec2(0.0, 0.09)) * 0.62 + fbm(q2 + vec2(0.0, 0.16) + n1 * 0.45) * 0.48;
  float lit = clamp(0.72 + (field - above) * 3.2, 0.3, 1.15);

  // silver-lining: extra sparkle on thin lit edges
  float rim = smoothstep(0.47, 0.5, field) * (1.0 - smoothstep(0.5, 0.62, field));
  vec3 col = mix(uShadow, uCloud, lit) + rim * 0.18;

  float alpha = cov * uOpacity * (1.0 - uScroll * 0.45);
  gl_FragColor = vec4(col * alpha, alpha);     // premultiplied
}
`;

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

export function CloudCanvas({ light }: { light: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lightRef = useRef(light);
  lightRef.current = light;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl =
      canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true }) ||
      (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);
    if (!gl) return; // graceful: the CSS sky gradient still stands

    // ── program ──
    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      return sh;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const U = {
      res: gl.getUniformLocation(prog, "uRes"),
      time: gl.getUniformLocation(prog, "uTime"),
      scroll: gl.getUniformLocation(prog, "uScroll"),
      mouse: gl.getUniformLocation(prog, "uMouse"),
      cloud: gl.getUniformLocation(prog, "uCloud"),
      shadow: gl.getUniformLocation(prog, "uShadow"),
      opacity: gl.getUniformLocation(prog, "uOpacity"),
    };

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    // ── page-driven uniforms ──
    let scrollV = 0;
    let mouse = { x: 0, y: 0 };
    const smoothMouse = { x: 0, y: 0 };
    const onScroll = () => {
      const h = canvas.parentElement?.offsetHeight ?? window.innerHeight;
      scrollV = Math.min(1, Math.max(0, window.scrollY / (h * 0.95)));
    };
    const onMove = (e: PointerEvent) => {
      mouse = {
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      };
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: true });

    const resize = () => {
      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      const w = canvas.clientWidth * dpr;
      const h = canvas.clientHeight * dpr;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };
    resize();
    window.addEventListener("resize", resize, { passive: true });

    const draw = (tMs: number) => {
      resize();
      smoothMouse.x += (mouse.x - smoothMouse.x) * 0.04;
      smoothMouse.y += (mouse.y - smoothMouse.y) * 0.04;
      const isLight = lightRef.current;
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(U.res, canvas.width, canvas.height);
      gl.uniform1f(U.time, tMs / 1000);
      gl.uniform1f(U.scroll, scrollV);
      gl.uniform2f(U.mouse, smoothMouse.x, smoothMouse.y);
      if (isLight) {
        gl.uniform3f(U.cloud, 1.0, 1.0, 1.0);
        gl.uniform3f(U.shadow, 0.72, 0.78, 0.88);
        gl.uniform1f(U.opacity, 0.92);
      } else {
        gl.uniform3f(U.cloud, 0.5, 0.55, 0.72);
        gl.uniform3f(U.shadow, 0.12, 0.14, 0.22);
        gl.uniform1f(U.opacity, 0.5);
      }
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    // first frame synchronously — the sky is never empty
    draw(0);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let running = !reduced;
    const loop = (t: number) => {
      if (!running) return;
      draw(t);
      raf = requestAnimationFrame(loop);
    };
    if (running) raf = requestAnimationFrame(loop);

    const onVis = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!reduced) {
        running = true;
        raf = requestAnimationFrame(loop);
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", resize);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
}
