"use client";

/**
 * CONCEPT D — "FLIGHT MODE". The page is a cockpit window.
 *
 * A 3D paper plane flies a spline through a living sky; your scroll is
 * the throttle (aerodynamics.nl DNA). The flight crosses one full day —
 * morning blue → teal noon → sunset → night with stars → golden dawn —
 * one atmosphere per trip phase, marked by glowing gates the plane
 * threads. Massive chunky typography with a cycling word, a floating
 * pill nav, an altimeter, and a custom cursor carry the umano DNA.
 *
 * Tech: react-three-fiber. One Points cloud field (single draw call,
 * CanvasTexture sprite), one Points starfield, four gate toruses, a
 * hand-built paper-plane BufferGeometry with banked turns, camera on a
 * chase rig with pointer sway. Scroll/pointer live in refs — zero React
 * re-renders inside the frame loop. DPR capped, noindex, reduced-motion
 * and no-WebGL fallbacks.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Logo } from "@/components/ui/logo";

/* ── the day cycle: one atmosphere per phase ─────────────────────────── */
const ATMOS = [
  { sky: "#BFD9EC", fog: "#D9E8F2", label: "Flight plan", clock: "T−89", word: "PLAN", hue: "#6D5AE6", ink: "#141414" },
  { sky: "#8FC7C0", fog: "#BFE0DB", label: "Pre-flight", clock: "T−7", word: "PACK", hue: "#0C7A6F", ink: "#0E2B27" },
  { sky: "#E8956B", fog: "#F2BC9A", label: "Cruise", clock: "DAY 3", word: "SPLIT", hue: "#B4441B", ink: "#3A1505" },
  { sky: "#131A33", fog: "#1C2340", label: "Black box", clock: "HOME", word: "WRAP", hue: "#E0B252", ink: "#F5E9C8" },
  { sky: "#E9C97E", fog: "#F2DEAE", label: "Sawa", clock: "NEXT", word: "SAWA", hue: "#8F6400", ink: "#2E2005" },
] as const;

/* ── station copy — cockpit voice, this concept only ─────────────────── */
const STATIONS = [
  {
    lead: "File the flight plan, ",
    accent: "sawa.",
    body: "Votes land, day chips fill, readiness climbs — the trip stops being a maybe.",
    rx: "“so… are we actually going??”",
    tx: "CLEARED ✈",
  },
  {
    lead: "Every switch flips ",
    accent: "green.",
    body: "Docs pinned to day one, weather in — and the board calls out the one bag still unpacked, by name.",
    rx: "“can someone resend the airbnb link?”",
    tx: "PINNED · ROW 1",
  },
  {
    lead: "Burn the fuel ",
    accent: "evenly.",
    body: "Tonight's ¥12,400 splits itself four ways before the change hits the tray — even offline.",
    rx: "“who paid for the taxi?”",
    tx: "EVEN BURN · ¥3,100",
  },
  {
    lead: "Play back the ",
    accent: "whole flight.",
    body: "Five days become one reel — settled, shared, and already asking where next.",
    rx: "“send pics pls”",
    tx: "REEL SHARED ✦",
  },
] as const;

function lerpColor(a: string, b: string, t: number) {
  const ca = new THREE.Color(a);
  return ca.lerp(new THREE.Color(b), t);
}
// where each atmosphere peaks along the flight — night owns the WRAP leg,
// dawn only breaks at the very end for the finale
const ATMOS_STOPS = [0, 0.3, 0.55, 0.82, 1];

function atmosphereAt(p: number) {
  let seg = 0;
  while (seg < ATMOS_STOPS.length - 2 && p > ATMOS_STOPS[seg + 1]) seg++;
  const t = (p - ATMOS_STOPS[seg]) / (ATMOS_STOPS[seg + 1] - ATMOS_STOPS[seg]);
  const e = THREE.MathUtils.clamp(t, 0, 1) ** 2 * (3 - 2 * THREE.MathUtils.clamp(t, 0, 1));
  return {
    sky: lerpColor(ATMOS[seg].sky, ATMOS[seg + 1].sky, e),
    fog: lerpColor(ATMOS[seg].fog, ATMOS[seg + 1].fog, e),
    night: seg === 3 ? 1 - e : seg === 2 ? e : 0,
  };
}

/* ── flight path ─────────────────────────────────────────────────────── */
function makeCurve() {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 11; i++) {
    pts.push(
      new THREE.Vector3(
        Math.sin(i * 1.15) * 26 + Math.sin(i * 0.5) * 10,
        Math.sin(i * 0.8) * 7 + Math.cos(i * 1.7) * 4,
        -i * 46,
      ),
    );
  }
  return new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.5);
}

/* ── paper plane: a folded dart, six triangles ───────────────────────── */
function paperPlaneGeometry() {
  const nose = [0, 0, -3];
  const tailL = [-2.6, 0.25, 2.2];
  const tailR = [2.6, 0.25, 2.2];
  const spineT = [0, 0.55, 2.0];
  const keel = [0, -0.85, 1.9];
  const v = new Float32Array([
    // left wing
    ...nose, ...tailL, ...spineT,
    // right wing
    ...nose, ...spineT, ...tailR,
    // keel, both faces
    ...nose, ...spineT, ...keel,
    ...nose, ...keel, ...spineT,
  ]);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(v, 3));
  g.computeVertexNormals();
  return g;
}

/* ── soft round sprite for clouds ────────────────────────────────────── */
function cloudTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 62);
  grad.addColorStop(0, "rgba(255,255,255,0.95)");
  grad.addColorStop(0.55, "rgba(255,255,255,0.45)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

interface Rig {
  p: number;        // smoothed scroll progress
  target: number;   // raw scroll progress
  mx: number;
  my: number;
}

function FlightWorld({ rig }: { rig: React.MutableRefObject<Rig> }) {
  const { scene, camera } = useThree();
  const curve = useMemo(makeCurve, []);
  const planeGeo = useMemo(paperPlaneGeometry, []);
  const cloudTex = useMemo(cloudTexture, []);
  const planeRef = useRef<THREE.Mesh>(null);
  const starsRef = useRef<THREE.Points>(null);
  const cloudMatRef = useRef<THREE.PointsMaterial>(null);

  // cloud field hugging the path
  const cloudGeo = useMemo(() => {
    const N = 340;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const t = i / N;
      const base = curve.getPointAt(Math.min(0.999, t));
      pos[i * 3] = base.x + (Math.random() - 0.5) * 90;
      pos[i * 3 + 1] = base.y - 6 - Math.random() * 26;
      pos[i * 3 + 2] = base.z + (Math.random() - 0.5) * 60;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, [curve]);

  // starfield (visible at night)
  const starGeo = useMemo(() => {
    const N = 700;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 900;
      pos[i * 3 + 1] = Math.random() * 260 - 30;
      pos[i * 3 + 2] = -Math.random() * 560;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);

  const gates = useMemo(
    () =>
      [0.2, 0.42, 0.64, 0.86].map((t, i) => ({
        pos: curve.getPointAt(t),
        tan: curve.getTangentAt(t),
        hue: ["#8B7CFF", "#3EC5B7", "#FF8A5C", "#E0B252"][i],
      })),
    [curve],
  );

  const tmp = useMemo(
    () => ({
      m: new THREE.Matrix4(),
      q: new THREE.Quaternion(),
      up: new THREE.Vector3(0, 1, 0),
      look: new THREE.Vector3(),
      cam: new THREE.Vector3(),
    }),
    [],
  );

  useFrame((state) => {
    const r = rig.current;
    // inertial throttle — the plane eases toward the scroll position
    r.p += (r.target - r.p) * 0.045;
    const p = THREE.MathUtils.clamp(r.p, 0.0001, 0.9999);

    // atmosphere
    const a = atmosphereAt(p);
    scene.background = a.sky;
    scene.fog = new THREE.Fog(a.fog, 30, 240);
    if (starsRef.current) {
      (starsRef.current.material as THREE.PointsMaterial).opacity = a.night * 0.9;
    }
    if (cloudMatRef.current) {
      // moonlit clouds — dim toward slate blue as night falls
      cloudMatRef.current.color.setRGB(
        1 - a.night * 0.62,
        1 - a.night * 0.58,
        1 - a.night * 0.42,
      );
    }

    // plane on the spline, banking through turns
    const pos = curve.getPointAt(p);
    const tan = curve.getTangentAt(p);
    const ahead = curve.getTangentAt(Math.min(0.999, p + 0.012));
    const bank = THREE.MathUtils.clamp((ahead.x - tan.x) * 38, -0.9, 0.9);
    const plane = planeRef.current;
    if (plane) {
      const bob = Math.sin(state.clock.elapsedTime * 1.6) * 0.35;
      plane.position.set(pos.x, pos.y + bob * 0.4, pos.z);
      tmp.look.copy(pos).add(tan);
      tmp.m.lookAt(plane.position, tmp.look, tmp.up);
      plane.quaternion.setFromRotationMatrix(tmp.m);
      plane.rotateZ(-bank);
      plane.rotateX(bob * 0.05);
    }

    // chase camera with pointer sway
    const back = curve.getPointAt(Math.max(0, p - 0.022));
    tmp.cam.set(
      back.x + r.mx * 4.5,
      back.y + 3.2 + r.my * 2.2,
      back.z + 9,
    );
    camera.position.lerp(tmp.cam, 0.12);
    camera.lookAt(pos.x, pos.y + 0.6, pos.z - 4);
  });

  return (
    <>
      <hemisphereLight args={["#ffffff", "#8899bb", 1.15]} />
      <directionalLight position={[40, 60, 20]} intensity={1.4} />

      {/* the traveler */}
      <mesh ref={planeRef} geometry={planeGeo} scale={0.72}>
        <meshStandardMaterial
          color="#FDFDFD"
          side={THREE.DoubleSide}
          flatShading
          roughness={0.55}
          metalness={0.05}
          emissive="#6D5AE6"
          emissiveIntensity={0.06}
        />
      </mesh>

      {/* phase gates */}
      {gates.map((g, i) => (
        <group key={i} position={g.pos.toArray()} quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), g.tan)}>
          <mesh>
            <torusGeometry args={[7.5, 0.28, 12, 64]} />
            <meshStandardMaterial color={g.hue} emissive={g.hue} emissiveIntensity={0.85} roughness={0.3} />
          </mesh>
          <pointLight color={g.hue} intensity={140} distance={46} />
        </group>
      ))}

      {/* cloud deck */}
      <points geometry={cloudGeo}>
        <pointsMaterial
          ref={cloudMatRef}
          map={cloudTex}
          size={34}
          transparent
          opacity={0.9}
          depthWrite={false}
          sizeAttenuation
          color="#ffffff"
        />
      </points>

      {/* stars — fade in at night */}
      <points ref={starsRef} geometry={starGeo}>
        <pointsMaterial size={0.9} transparent opacity={0} depthWrite={false} color="#EAF0FF" sizeAttenuation={false} />
      </points>
    </>
  );
}

/* ── real app screens, light mode — what a user actually sees ────────── */

const CREW = [
  { ch: "A", hue: "#6D5AE6" },
  { ch: "S", hue: "#0C7A6F" },
  { ch: "T", hue: "#D06A3A" },
  { ch: "P", hue: "#8F6400" },
];

const SHOT = {
  canvas: "#F6F5F1",
  card: "#FFFFFF",
  ink: "#141414",
  sub: "rgba(20,20,20,0.55)",
  faint: "rgba(20,20,20,0.38)",
  line: "rgba(20,20,20,0.08)",
};

/** light-mode phone chrome shared by all four screens */
function AppShot({
  header,
  title,
  chip,
  hue,
  children,
}: {
  header: string;
  title: string;
  chip: string;
  hue: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-[26px] border overflow-hidden"
      style={{
        background: SHOT.canvas,
        borderColor: "rgba(20,20,20,0.12)",
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.8), 0 44px 130px -40px ${hue}88`,
      }}
    >
      {/* status bar */}
      <div className="flex items-center justify-between px-5 pt-2.5">
        <span className="text-[9px] font-bold tabular-nums" style={{ color: SHOT.faint }}>
          9:41
        </span>
        <span className="flex items-end gap-[2px]">
          {[3, 5, 7].map((h) => (
            <span key={h} className="w-[3px] rounded-sm" style={{ height: h, background: SHOT.faint }} />
          ))}
        </span>
      </div>
      {/* app header */}
      <div className="flex items-center justify-between px-4 pt-2 pb-2.5">
        <div>
          <p className="text-[9px] font-black tracking-[0.2em] uppercase" style={{ color: SHOT.faint }}>
            {header}
          </p>
          <p className="text-[14px] font-bold leading-tight" style={{ color: SHOT.ink }}>
            {title}
          </p>
        </div>
        <span
          className="rounded-full px-2.5 py-1 text-[10px] font-bold"
          style={{ color: hue, background: `${hue}14`, border: `1px solid ${hue}33` }}
        >
          {chip}
        </span>
      </div>
      <div className="px-3 pb-3 flex flex-col gap-2">{children}</div>
    </div>
  );
}

/** small white module card inside a shot */
function ShotCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      className="rounded-2xl border p-3 transition-all duration-500"
      style={{ background: SHOT.card, borderColor: SHOT.line, ...style }}
    >
      {children}
    </div>
  );
}

const appear = (p: number, at: number): React.CSSProperties => ({
  opacity: p >= at ? 1 : 0,
  transform: p >= at ? "translateY(0)" : "translateY(10px)",
});

/** PLAN — the NOW planning cockpit */
function PlanShot({ p }: { p: number }) {
  const readiness = Math.round(Math.max(0, Math.min(1, (p - 0.15) / 0.5)) * 57);
  return (
    <AppShot header="Now · Planning" title="Tokyo 🗼" chip="In 106 days" hue="#6D5AE6">
      <ShotCard style={appear(p, 0.08)}>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[11px] font-bold" style={{ color: SHOT.ink }}>
            Trip readiness
          </p>
          <p className="text-[11px] font-black tabular-nums" style={{ color: "#4C7A2F" }}>
            {readiness}%
          </p>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(20,20,20,0.08)" }}>
          <div
            className="h-full me-auto rounded-full transition-[width] duration-200"
            style={{ width: `${readiness}%`, background: "#4C7A2F" }}
          />
        </div>
        <p className="mt-1.5 text-[9.5px]" style={{ color: SHOT.sub }}>
          Dates ✓ · Crew ✓ · Stays ✓ · Packing 5%
        </p>
      </ShotCard>

      <ShotCard style={appear(p, 0.32)}>
        <p className="text-[9px] font-black tracking-[0.16em] uppercase mb-2" style={{ color: SHOT.faint }}>
          Plan days
        </p>
        <div className="flex gap-1.5">
          {[
            { d: "Sun 8", n: 3, hue: "#D06A3A" },
            { d: "Mon 9", n: 2, hue: "#0C7A6F" },
            { d: "Tue 10", n: 2, hue: "#6D5AE6" },
          ].map((c, i) => (
            <span
              key={c.d}
              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold transition-all duration-400"
              style={{ borderColor: SHOT.line, color: SHOT.ink, ...appear(p, 0.36 + i * 0.09) }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.hue }} />
              {c.d} <span style={{ color: SHOT.faint }}>· {c.n}</span>
            </span>
          ))}
        </div>
      </ShotCard>

      <ShotCard style={appear(p, 0.66)}>
        <div className="flex items-center justify-between">
          <div className="flex -space-x-1.5">
            {CREW.map((c, i) => (
              <span
                key={c.ch}
                className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-black text-white transition-all duration-400"
                style={{ background: c.hue, ...appear(p, 0.7 + i * 0.06) }}
              >
                {c.ch}
              </span>
            ))}
          </div>
          <span className="text-[10.5px] font-bold" style={{ color: SHOT.sub, ...appear(p, 0.9) }}>
            4 going — it&apos;s real ✈
          </span>
        </div>
      </ShotCard>
    </AppShot>
  );
}

/** PACK — the departure board */
function PackShot({ p }: { p: number }) {
  const packed = p >= 0.84;
  return (
    <AppShot header="Departure board" title="Tokyo 🗼" chip="T−7" hue="#0C7A6F">
      <ShotCard style={appear(p, 0.08)}>
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold" style={{ color: SHOT.ink }}>
            Saturday · landing day
          </p>
          <p className="text-[11px] font-bold" style={{ color: SHOT.sub }}>
            21° ⛅
          </p>
        </div>
        <p className="mt-0.5 text-[9.5px]" style={{ color: SHOT.sub }}>
          perfect walking weather, pack light
        </p>
      </ShotCard>

      {[
        { label: "Airbnb check-in", note: "pinned to Day 1", at: 0.3 },
        { label: "JR passes", note: "in the doc wallet", at: 0.48 },
      ].map((r) => (
        <ShotCard key={r.label} style={appear(p, r.at)}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold" style={{ color: SHOT.ink }}>
                {r.label}
              </p>
              <p className="text-[9.5px]" style={{ color: SHOT.sub }}>
                {r.note}
              </p>
            </div>
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white"
              style={{ background: "#0C7A6F" }}
            >
              ✓
            </span>
          </div>
        </ShotCard>
      ))}

      <ShotCard
        style={{
          ...appear(p, 0.62),
          borderColor: packed ? "rgba(12,122,111,0.35)" : "rgba(143,100,0,0.35)",
          background: packed ? "rgba(12,122,111,0.06)" : "rgba(224,178,82,0.10)",
        }}
      >
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold" style={{ color: SHOT.ink }}>
            Tariq&apos;s bag 🦖
          </p>
          <span
            className="text-[9px] font-black tracking-[0.14em] uppercase"
            style={{ color: packed ? "#0C7A6F" : "#8F6400" }}
          >
            {packed ? "Packed ✓" : "3 items left…"}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(20,20,20,0.08)" }}>
          <div
            className="h-full me-auto rounded-full transition-[width] duration-300"
            style={{
              width: `${Math.round(Math.max(0.05, Math.min(1, (p - 0.62) / 0.26)) * 100)}%`,
              background: packed ? "#0C7A6F" : "#E0B252",
            }}
          />
        </div>
      </ShotCard>
    </AppShot>
  );
}

/** SPLIT — the money screen */
function SplitShot({ p }: { p: number }) {
  const split = p >= 0.55;
  return (
    <AppShot header="Money" title="Day 3 · Tokyo" chip="Live" hue="#D06A3A">
      <ShotCard style={appear(p, 0.08)}>
        <p className="text-[9px] font-black tracking-[0.16em] uppercase" style={{ color: SHOT.faint }}>
          Your balance
        </p>
        <p className="mt-0.5 text-[19px] font-black tabular-nums" style={{ color: "#0C7A6F" }}>
          +¥3,100
        </p>
        <p className="text-[9.5px]" style={{ color: SHOT.sub }}>
          you&apos;re owed — no chasing needed
        </p>
      </ShotCard>

      <ShotCard style={appear(p, 0.3)}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold" style={{ color: SHOT.ink }}>
              Izakaya, round two 🏮
            </p>
            <p className="text-[9.5px]" style={{ color: SHOT.sub }}>
              scanned from a crumpled receipt
            </p>
          </div>
          <span className="text-[14px] font-black tabular-nums" style={{ color: "#D06A3A" }}>
            ¥12,400
          </span>
        </div>
        {/* the split happens */}
        <div className="mt-2.5 grid grid-cols-4 gap-1.5">
          {CREW.map((c, i) => (
            <div
              key={c.ch}
              className="rounded-lg border px-1 py-1.5 text-center transition-all duration-400"
              style={{ borderColor: SHOT.line, ...appear(p, 0.55 + i * 0.07) }}
            >
              <span
                className="mx-auto mb-1 w-4.5 h-4.5 rounded-full flex items-center justify-center text-[8px] font-black text-white"
                style={{ background: c.hue, width: 18, height: 18 }}
              >
                {c.ch}
              </span>
              <span className="block text-[8.5px] font-bold tabular-nums" style={{ color: split ? SHOT.ink : SHOT.faint }}>
                ¥3,100
              </span>
            </div>
          ))}
        </div>
      </ShotCard>

      <div
        className="rounded-full border px-3 py-1.5 text-center text-[10px] font-black tracking-[0.12em] uppercase transition-all duration-500"
        style={{
          borderColor: "rgba(12,122,111,0.35)",
          background: "rgba(12,122,111,0.08)",
          color: "#0C7A6F",
          ...appear(p, 0.9),
        }}
      >
        Settled before dessert · zero IOUs
      </div>
    </AppShot>
  );
}

/** WRAP — the recap */
function WrapShot({ p }: { p: number }) {
  const tiles = ["#6D5AE6", "#D06A3A", "#0C7A6F", "#E0B252", "#8F6400", "#B4441B"];
  return (
    <AppShot header="The Wrap" title="Tokyo, together" chip="Home" hue="#8F6400">
      <ShotCard style={appear(p, 0.08)}>
        <div className="grid grid-cols-3 gap-1.5">
          {tiles.map((hue, i) => (
            <div
              key={i}
              className="aspect-square rounded-lg transition-all duration-400"
              style={{
                background: `linear-gradient(135deg, ${hue}55, ${hue}22)`,
                border: `1px solid ${hue}33`,
                ...appear(p, 0.12 + i * 0.08),
              }}
            >
              <span className="flex items-center justify-center h-full text-[11px]">
                {["🛫", "🍜", "🗼", "✨", "🏮", "🫶"][i]}
              </span>
            </div>
          ))}
        </div>
      </ShotCard>

      <ShotCard style={appear(p, 0.66)}>
        <div className="flex items-center justify-between text-center">
          {[
            { n: "5", l: "days" },
            { n: "23", l: "memories" },
            { n: "¥0", l: "owed" },
          ].map((s) => (
            <div key={s.l} className="flex-1">
              <p className="text-[15px] font-black tabular-nums" style={{ color: SHOT.ink }}>
                {s.n}
              </p>
              <p className="text-[8.5px] font-bold uppercase tracking-[0.14em]" style={{ color: SHOT.faint }}>
                {s.l}
              </p>
            </div>
          ))}
        </div>
      </ShotCard>

      <div
        className="rounded-full px-3 py-2 text-center text-[10.5px] font-black transition-all duration-500"
        style={{ background: "#141414", color: "#FFFFFF", ...appear(p, 0.88) }}
      >
        Where next? Start the sequel ✈
      </div>
    </AppShot>
  );
}

/* ── overlay segments driven by quantized progress ───────────────────── */
const CYCLE_WORDS = ["the flight plan.", "the fuel money.", "the memories.", "سوا."];

export function VisionX() {
  const rig = useRef<Rig>({ p: 0, target: 0, mx: 0, my: 0 });
  const [prog, setProg] = useState(0); // quantized for overlay
  const [word, setWord] = useState(0);
  const [cursor, setCursor] = useState({ x: -100, y: -100 });
  const [webgl, setWebgl] = useState(true);

  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      if (!c.getContext("webgl") && !c.getContext("webgl2")) setWebgl(false);
    } catch {
      setWebgl(false);
    }
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      rig.current.target = Math.min(1, Math.max(0, window.scrollY / max));
    };
    // overlay follows the SMOOTHED progress so text color always matches
    // the sky the camera is actually in (interval — survives rAF throttling)
    const sync = setInterval(() => {
      // backstop easing so the flight still progresses under rAF throttling
      rig.current.p += (rig.current.target - rig.current.p) * 0.16;
      setProg((prev) => {
        const v = Math.round(rig.current.p * 200) / 200;
        return v === prev ? prev : v;
      });
    }, 90);
    const onMove = (e: PointerEvent) => {
      rig.current.mx = (e.clientX / window.innerWidth - 0.5) * 2;
      rig.current.my = (e.clientY / window.innerHeight - 0.5) * 2;
      setCursor({ x: e.clientX, y: e.clientY });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: true });
    const wordTimer = setInterval(() => setWord((w) => (w + 1) % CYCLE_WORDS.length), 1500);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onMove);
      clearInterval(wordTimer);
      clearInterval(sync);
    };
  }, []);

  // demo movie: when the plane docks at a station, sweep its mockup
  // 0→1 over 3.5s (setInterval — keeps playing even if rAF throttles)
  const [demoP, setDemoP] = useState(0);
  const playedStation = useRef(-1);

  // which phase station are we at?
  const station =
    prog < 0.13 ? -1
    : prog < 0.3 ? 0
    : prog < 0.34 ? -2
    : prog < 0.52 ? 1
    : prog < 0.56 ? -2
    : prog < 0.74 ? 2
    : prog < 0.78 ? -2
    : prog < 0.9 ? 3
    : 4;
  const atmos = station >= 0 && station < 4 ? ATMOS[station as 0 | 1 | 2 | 3] : null;
  const chapter = station >= 0 && station < 4 ? STATIONS[station as 0 | 1 | 2 | 3] : null;
  const nightish = prog > 0.7 && prog < 0.92;

  useEffect(() => {
    if (station < 0 || station > 3 || playedStation.current === station) {
      if (station < 0 || station > 3) playedStation.current = -1;
      return;
    }
    playedStation.current = station;
    setDemoP(0);
    const startedAt = performance.now();
    const timer = setInterval(() => {
      const v = Math.min(1, (performance.now() - startedAt) / 3500);
      setDemoP(Math.round(v * 50) / 50);
      if (v >= 1) clearInterval(timer);
    }, 40);
    return () => clearInterval(timer);
  }, [station]);
  const ink = nightish ? "#F5F0E4" : "#141414";
  const faint = nightish ? "rgba(245,240,228,0.5)" : "rgba(20,20,20,0.45)";

  if (!webgl) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-[#BFD9EC] text-[#141414] px-6 text-center">
        <p className="text-4xl font-black tracking-tight">PACK SAWA.</p>
        <p className="max-w-md">This concept needs WebGL — but the trip doesn&apos;t.</p>
        <Link href="/auth/signup" className="rounded-full bg-[#6D5AE6] text-white px-6 py-3 font-bold">
          Start a trip
        </Link>
      </div>
    );
  }

  return (
    <div className="relative h-[700vh]" style={{ cursor: "none" }}>
      {/* ── 3D world ── */}
      <div className="fixed inset-0">
        <Canvas
          dpr={[1, 1.5]}
          camera={{ fov: 62, near: 0.1, far: 600, position: [0, 3, 10] }}
          onCreated={({ scene, gl }) => {
            // paint the morning sky before the first frame ticks
            scene.background = new THREE.Color(ATMOS[0].sky);
            gl.setClearColor(new THREE.Color(ATMOS[0].sky), 1);
          }}
        >
          <FlightWorld rig={rig} />
        </Canvas>
      </div>

      {/* ── custom cursor ── */}
      <div
        aria-hidden
        className="fixed z-[90] w-2 h-2 rounded-full pointer-events-none"
        style={{ left: cursor.x - 4, top: cursor.y - 4, background: ink }}
      />
      <div
        aria-hidden
        className="fixed z-[90] w-9 h-9 rounded-full border pointer-events-none transition-all duration-300 ease-out"
        style={{ left: cursor.x - 18, top: cursor.y - 18, borderColor: faint }}
      />

      {/* ── floating pill nav (umano) ── */}
      <header className="fixed top-5 inset-x-0 z-50 flex justify-center pointer-events-none">
        <div
          className="pointer-events-auto flex items-center gap-5 rounded-full px-5 py-2.5 backdrop-blur-md shadow-lg"
          style={{ background: "rgba(255,255,255,0.85)", color: "#141414" }}
        >
          <Link href="/" aria-label="Paxawa home" className="flex items-center">
            <Logo variant="full" size="xs" />
          </Link>
          <span className="text-[10px] font-black tracking-[0.22em] uppercase opacity-40">
            Concept D · Flight mode
          </span>
          <Link
            href="/auth/signup"
            className="rounded-full bg-[#141414] text-white px-4 py-1.5 text-sm font-bold hover:bg-[#6D5AE6] transition-colors"
          >
            Start today
          </Link>
        </div>
      </header>

      {/* ── altimeter (left rail) ── */}
      <div className="fixed left-6 top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col items-center gap-3 pointer-events-none">
        <span className="text-[10px] font-black tracking-[0.2em] rotate-180 [writing-mode:vertical-rl]" style={{ color: faint }}>
          ALTITUDE
        </span>
        <div className="w-px h-40 relative overflow-hidden rounded-full" style={{ background: faint }}>
          <div
            className="absolute bottom-0 inset-x-0 transition-[height] duration-200"
            style={{ height: `${Math.round(prog * 100)}%`, background: ink }}
          />
        </div>
        <span className="text-[11px] font-black tabular-nums" style={{ color: ink }}>
          {Math.round(2000 + prog * 36000).toLocaleString()} FT
        </span>
      </div>

      {/* ── overlay stations ── */}
      <div className="fixed inset-0 z-30 pointer-events-none flex items-center justify-center px-6">
        {/* HERO */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center text-center transition-all duration-500 px-6"
          style={{ opacity: station === -1 ? 1 : 0, transform: `translateY(${station === -1 ? 0 : -40}px)` }}
        >
          <p className="text-[11px] font-black tracking-[0.3em] uppercase mb-6" style={{ color: faint }}>
            Scroll to fly · نروح سوا
          </p>
          <h1
            className="font-black tracking-[-0.04em] leading-[0.9] text-[#141414]"
            style={{ fontSize: "clamp(64px, 12vw, 170px)" }}
          >
            PACK
            <br />
            <span className="text-[#6D5AE6]">SAWA.</span>
          </h1>
          <p className="mt-8 text-xl sm:text-2xl font-semibold text-[#141414]/70">
            One home for{" "}
            <span className="inline-block min-w-[16ch] text-start font-black text-[#6D5AE6]">
              {CYCLE_WORDS[word]}
            </span>
          </p>
        </div>

        {/* PHASE STATIONS — the plane docks, the app shows itself */}
        {atmos && chapter && (
          <div key={atmos.word} className="absolute inset-0 flex items-center justify-center px-6">
            <style>{`
              @keyframes vx-in { from { opacity: 0; transform: translateY(26px); } to { opacity: 1; transform: translateY(0); } }
              @keyframes vx-spin { to { transform: rotate(360deg); } }
              @keyframes vx-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }
            `}</style>

            {/* giant outlined word — backdrop for the whole station */}
            <p
              aria-hidden
              className="absolute inset-x-0 bottom-[4vh] text-center font-black tracking-[-0.03em] leading-none select-none"
              style={{
                fontSize: "clamp(80px, 16vw, 230px)",
                color: "transparent",
                WebkitTextStroke: `2px ${ink}`,
                opacity: 0.3,
                animation: "vx-in 0.7s cubic-bezier(0.22,1,0.36,1) both",
              }}
            >
              {atmos.word}
            </p>

            <div
              className={`relative w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-16 items-center ${
                station % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""
              }`}
            >
              {/* the words */}
              <div
                className="text-center lg:text-start"
                style={{ animation: "vx-in 0.6s cubic-bezier(0.22,1,0.36,1) 0.05s both" }}
              >
                <span
                  className="inline-flex rounded-full border px-3 py-1.5 text-[11px] font-black tracking-[0.2em] uppercase backdrop-blur-sm"
                  style={{
                    color: ink,
                    borderColor: faint,
                    background: nightish ? "rgba(13,13,13,0.35)" : "rgba(255,255,255,0.3)",
                  }}
                >
                  {atmos.clock} · {atmos.label}
                </span>
                <h2
                  className="mt-4 text-2xl sm:text-4xl font-black tracking-[-0.03em] leading-[1.05] lg:max-w-md"
                  style={{ color: ink }}
                >
                  {chapter.lead}
                  <span style={{ color: atmos.hue }}>{chapter.accent}</span>
                </h2>
                <p
                  className="mt-3 text-sm sm:text-base leading-relaxed lg:max-w-md hidden sm:block"
                  style={{ color: nightish ? "rgba(245,240,228,0.72)" : "rgba(20,20,20,0.66)" }}
                >
                  {chapter.body}
                </p>

                {/* comms — the group-chat static, answered by the tower */}
                <div
                  className="mt-4 inline-flex items-center gap-2.5 rounded-full border ps-4 pe-1.5 py-1.5 backdrop-blur-sm transition-all duration-500"
                  style={{
                    borderColor: faint,
                    background: nightish ? "rgba(13,13,13,0.35)" : "rgba(255,255,255,0.3)",
                    opacity: demoP >= 0.96 ? 1 : 0,
                    transform: demoP >= 0.96 ? "translateY(0)" : "translateY(10px)",
                  }}
                >
                  <span className="text-[12px] line-through" style={{ color: faint }}>
                    {chapter.rx}
                  </span>
                  <span
                    className="rounded-full px-2.5 py-1 text-[10px] font-black tracking-[0.08em]"
                    style={{
                      color: nightish ? atmos.hue : "#FFFFFF",
                      background: nightish ? `${atmos.hue}22` : atmos.hue,
                    }}
                  >
                    {chapter.tx}
                  </span>
                </div>

                {/* movie progress */}
                <div
                  className="mt-5 mx-auto lg:mx-0 relative w-28 h-1 rounded-full overflow-hidden"
                  style={{ background: nightish ? "rgba(245,240,228,0.18)" : "rgba(20,20,20,0.15)" }}
                >
                  <div
                    className="absolute inset-y-0 start-0 rounded-full transition-[width] duration-100"
                    style={{ width: `${Math.round(demoP * 100)}%`, background: atmos.hue }}
                  />
                </div>
              </div>

              {/* the product, as flight hardware */}
              <div
                className="mx-auto w-full max-w-[280px] sm:max-w-[340px]"
                style={{
                  animation: "vx-in 0.7s cubic-bezier(0.22,1,0.36,1) 0.12s both",
                  transform: `rotate(${station % 2 === 1 ? -1.5 : 1.5}deg)`,
                }}
              >
                {station === 0 ? (
                  <PlanShot p={demoP} />
                ) : station === 1 ? (
                  <PackShot p={demoP} />
                ) : station === 2 ? (
                  <SplitShot p={demoP} />
                ) : (
                  <WrapShot p={demoP} />
                )}
              </div>
            </div>
          </div>
        )}

        {/* FINALE */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center text-center transition-all duration-700 px-6"
          style={{ opacity: station === 4 ? 1 : 0, pointerEvents: station === 4 ? "auto" : "none" }}
        >
          <p className="text-[11px] font-black tracking-[0.3em] uppercase mb-5 text-[#2E2005]/60">
            Wheels down · Where next?
          </p>
          <h2
            className="font-black tracking-[-0.04em] leading-[0.9] text-[#2E2005]"
            style={{ fontSize: "clamp(56px, 10vw, 140px)" }}
          >
            FLY IT
            <br />
            <span style={{ WebkitTextStroke: "2.5px #2E2005", color: "transparent" }}>SAWA.</span>
          </h2>
          <Link
            href="/auth/signup"
            className="mt-10 inline-flex items-center gap-2 rounded-full bg-[#141414] text-white px-8 py-4 text-lg font-black hover:bg-[#6D5AE6] hover:scale-105 transition-all"
            style={{ cursor: "none" }}
          >
            Board now
            <ArrowRight className="w-5 h-5 rtl:rotate-180" />
          </Link>
          <p className="mt-5 text-sm text-[#2E2005]/60 font-semibold">
            Free · two-minute setup · English + العربية
          </p>
        </div>
      </div>

      {/* scroll runway hint */}
      <div
        className="fixed bottom-6 inset-x-0 z-30 flex justify-center pointer-events-none transition-opacity duration-500"
        style={{ opacity: prog < 0.02 ? 1 : 0 }}
      >
        <div className="flex flex-col items-center gap-1.5" style={{ color: faint }}>
          <span className="text-[10px] font-black tracking-[0.25em] uppercase">Throttle</span>
          <span className="block w-px h-8 animate-pulse" style={{ background: faint }} />
        </div>
      </div>
    </div>
  );
}
