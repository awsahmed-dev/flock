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
uniform float uFront;

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
  float sink = -uScroll * 0.65;                // scroll rolls the deck UP over the hero

  // back stratum — broad, slow
  vec2 q1 = p * 1.15 + vec2(t * 0.55, sink * 0.6) + par * 0.6;
  float n1 = fbm(q1);

  // front stratum — finer, faster, warped by the back field
  vec2 q2 = p * 2.35 + vec2(-t * 0.95, sink * 1.05) + par * 1.6;
  float n2 = fbm(q2 + n1 * 0.45);

  float field = n1 * 0.62 + n2 * 0.48;

  // BACK deck: bold, steady scenery. FRONT deck: rolls in from the
  // bottom on scroll and whites out the whole viewport.
  float lo = mix(0.40, 0.55 - uScroll * 0.72, uFront);
  float hi = mix(0.64, 0.76 - uScroll * 0.50, uFront);
  float cov = smoothstep(lo, hi, field + uFront * uScroll * 0.18);

  // vertical shaping: back = fuller up top; front = surges up from below
  float bandBack = smoothstep(-0.15, 0.30, uv.y);
  float bandFront = smoothstep(uScroll * 2.0 - 1.15, uScroll * 2.0 - 0.25, 1.0 - uv.y);
  cov *= mix(bandBack, max(bandFront, smoothstep(0.6, 0.95, uScroll)), uFront);

  // readability well — back layer only; the front deck covers everything
  vec2 c = uv - vec2(0.5, 0.52);
  c.x *= uRes.x / uRes.y * 0.72;
  float well = mix(0.30, 1.0, smoothstep(0.16, 0.5, length(c)));
  cov *= mix(well, 1.0, uFront);

  // lighting: density just above → bright tops, shaded bellies
  float above = fbm(q1 + vec2(0.0, 0.09)) * 0.62 + fbm(q2 + vec2(0.0, 0.16) + n1 * 0.45) * 0.48;
  float lit = clamp(0.72 + (field - above) * 3.2, 0.3, 1.15);

  // silver-lining: extra sparkle on thin lit edges
  float rim = smoothstep(0.47, 0.5, field) * (1.0 - smoothstep(0.5, 0.62, field));
  vec3 col = mix(uShadow, uCloud, lit) + rim * 0.18;

  float gate = mix(1.0, smoothstep(0.02, 0.4, uScroll), uFront);
  float alpha = cov * clamp(uOpacity + uScroll * 0.5 * uFront, 0.0, 1.0) * gate;
  gl_FragColor = vec4(col * alpha, alpha);     // premultiplied
}
`;

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

export function CloudCanvas({ light, front = false }: { light: boolean; front?: boolean }) {
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
      front: gl.getUniformLocation(prog, "uFront"),
    };

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    // ── page-driven uniforms ──
    let scrollV = 0;
    let mouse = { x: 0, y: 0 };
    const smoothMouse = { x: 0, y: 0 };
    const onScroll = () => {
      const h = canvas.parentElement?.offsetHeight ?? window.innerHeight;
      scrollV = Math.min(1, Math.max(0, window.scrollY / (h * 0.9)));
      if (front) {
        // once you've punched through the deck, release the viewport
        const fade = Math.min(1, Math.max(0, (window.scrollY - h * 1.02) / (h * 0.3)));
        canvas.style.opacity = String(1 - fade);
        canvas.style.display = fade >= 1 ? "none" : "block";
      }
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
        gl.uniform3f(U.shadow, 0.66, 0.72, 0.85);
        gl.uniform1f(U.opacity, 1.0);
      } else {
        gl.uniform3f(U.cloud, 0.55, 0.6, 0.78);
        gl.uniform3f(U.shadow, 0.1, 0.12, 0.2);
        gl.uniform1f(U.opacity, 0.65);
      }
      gl.uniform1f(U.front, front ? 1.0 : 0.0);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [front]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={
        front
          ? "fixed inset-0 w-full h-full pointer-events-none z-40"
          : "absolute inset-0 w-full h-full pointer-events-none"
      }
    />
  );
}

/* ────────────────────────────────────────────────────────────────────── */

const STAR_FRAG = `
precision highp float;
uniform vec2  uRes;
uniform float uTime;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes.xy;
  vec2 p = uv * vec2(uRes.x / uRes.y, 1.0);

  vec3 col = vec3(0.0);

  // two star layers, different densities
  for (int layer = 0; layer < 2; layer++) {
    float grid = layer == 0 ? 42.0 : 90.0;
    vec2 g = floor(p * grid);
    vec2 f = fract(p * grid) - 0.5;
    float h = hash(g + float(layer) * 17.3);
    if (h > 0.93) {
      vec2 off = vec2(hash(g + 1.1), hash(g + 2.7)) - 0.5;
      float d = length(f - off * 0.7);
      float tw = 0.55 + 0.45 * sin(uTime * (0.6 + h * 2.4) + h * 40.0);
      float star = smoothstep(0.09, 0.0, d) * tw * (layer == 0 ? 1.0 : 0.55);
      col += vec3(0.85, 0.9, 1.0) * star * smoothstep(0.35, 0.9, uv.y + h * 0.3);
    }
  }

  // a shooting star every ~9s, diagonal streak with a fading tail
  float cycle = 9.0;
  float ct = mod(uTime, cycle) / cycle;
  float active = smoothstep(0.0, 0.02, ct) * (1.0 - smoothstep(0.1, 0.14, ct));
  float seed = floor(uTime / cycle);
  vec2 s0 = vec2(0.15 + hash(vec2(seed, 1.0)) * 0.6, 0.95 - hash(vec2(seed, 2.0)) * 0.25);
  vec2 dir = normalize(vec2(0.75, -0.35));
  vec2 head = s0 + dir * ct * 7.0 * (uRes.x / uRes.y) * 0.22;
  vec2 rel = (uv * vec2(uRes.x / uRes.y, 1.0)) - head * vec2(uRes.x / uRes.y, 1.0);
  float along = dot(rel, -dir);
  float across = abs(dot(rel, vec2(-dir.y, dir.x)));
  float tail = smoothstep(0.16, 0.0, along) * step(0.0, along) * smoothstep(0.006, 0.0, across);
  col += vec3(0.9, 0.94, 1.0) * tail * active;

  float a = clamp(max(max(col.r, col.g), col.b), 0.0, 1.0);
  gl_FragColor = vec4(col * 0.9, a * 0.9);
}
`;

/** Night-flight starfield — twinkling stars + a shooting star every ~9s. */
export function StarCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true });
    if (!gl) return;

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      return sh;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, STAR_FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uRes = gl.getUniformLocation(prog, "uRes");
    const uTime = gl.getUniformLocation(prog, "uTime");
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

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
    window.addEventListener("resize", resize, { passive: true });

    const draw = (t: number) => {
      resize();
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, t / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
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
