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
import { NowDemo } from "../demos/now-demo";
import { DepartureDemo } from "../demos/departure-demo";
import { LiveDemo } from "../demos/live-demo";
import { WrapDemo } from "../demos/wrap-demo";

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
  barrel: number;   // timestamp of the last barrel-roll request
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
        t,
        pos: curve.getPointAt(t),
        tan: curve.getTangentAt(t),
        hue: ["#8B7CFF", "#3EC5B7", "#FF8A5C", "#E0B252"][i],
      })),
    [curve],
  );
  const gateRefs = useRef<(THREE.Group | null)[]>([]);
  const cloudsRef = useRef<THREE.Points>(null);

  // wingtip contrails — two ribbons of the plane's last moments
  const TRAIL_N = 64;
  const trails = useMemo(() => {
    const make = () => {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(TRAIL_N * 3), 3));
      const line = new THREE.Line(
        g,
        new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.32 }),
      );
      line.frustumCulled = false;
      return line;
    };
    return { l: make(), r: make() };
  }, []);
  const trailInit = useRef(false);

  const tmp = useMemo(
    () => ({
      m: new THREE.Matrix4(),
      q: new THREE.Quaternion(),
      up: new THREE.Vector3(0, 1, 0),
      look: new THREE.Vector3(),
      cam: new THREE.Vector3(),
      tipL: new THREE.Vector3(),
      tipR: new THREE.Vector3(),
      bankS: 0, // smoothed bank angle — raw tangent deltas snap at S-turns
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
    // wider lookahead + exponential smoothing: the raw value flips sign in
    // one frame at S-turns (PLAN→PACK, the PACK gate, SPLIT→finale) and
    // made the plane snap — the filter turns those into gradual rolls
    const ahead = curve.getTangentAt(Math.min(0.999, p + 0.022));
    const bankRaw = THREE.MathUtils.clamp((ahead.x - tan.x) * 30, -0.8, 0.8);
    tmp.bankS += (bankRaw - tmp.bankS) * 0.055;
    const bank = tmp.bankS;
    const plane = planeRef.current;
    if (plane) {
      const bob = Math.sin(state.clock.elapsedTime * 1.6) * 0.35;
      plane.position.set(pos.x, pos.y + bob * 0.4, pos.z);
      tmp.look.copy(pos).add(tan);
      tmp.m.lookAt(plane.position, tmp.look, tmp.up);
      plane.quaternion.setFromRotationMatrix(tmp.m);
      plane.rotateZ(-bank);
      plane.rotateX(bob * 0.05);

      // barrel roll (the "س" key) — one full ease-in-out rotation
      const bt = (performance.now() - r.barrel) / 1100;
      if (bt >= 0 && bt < 1) {
        const ease = bt < 0.5 ? 4 * bt ** 3 : 1 - (-2 * bt + 2) ** 3 / 2;
        plane.rotateZ(ease * Math.PI * 2);
      }

      // wingtip contrails — shift the ribbon, append this frame's tips
      plane.updateMatrixWorld();
      tmp.tipL.set(-2.45, 0.22, 1.95);
      tmp.tipR.set(2.45, 0.22, 1.95);
      plane.localToWorld(tmp.tipL);
      plane.localToWorld(tmp.tipR);
      const write = (line: THREE.Line, tip: THREE.Vector3) => {
        const attr = line.geometry.attributes.position as THREE.BufferAttribute;
        const arr = attr.array as Float32Array;
        if (!trailInit.current) {
          for (let i = 0; i < arr.length; i += 3) {
            arr[i] = tip.x;
            arr[i + 1] = tip.y;
            arr[i + 2] = tip.z;
          }
        } else {
          arr.copyWithin(0, 3);
          arr[arr.length - 3] = tip.x;
          arr[arr.length - 2] = tip.y;
          arr[arr.length - 1] = tip.z;
        }
        attr.needsUpdate = true;
      };
      write(trails.l, tmp.tipL);
      write(trails.r, tmp.tipR);
      trailInit.current = true;
      // contrails read strongest at cruise, faint while parked at the hero
      const trailOpacity = 0.1 + Math.min(1, Math.abs(r.target - r.p) * 260) * 0.3;
      (trails.l.material as THREE.LineBasicMaterial).opacity = trailOpacity;
      (trails.r.material as THREE.LineBasicMaterial).opacity = trailOpacity;
    }

    // gates flare as the plane threads them
    gates.forEach((g, i) => {
      const grp = gateRefs.current[i];
      if (!grp) return;
      const pulse = Math.exp(-(((p - g.t) * 55) ** 2));
      grp.scale.setScalar(1 + pulse * 0.4);
      const ring = grp.children[0] as THREE.Mesh | undefined;
      if (ring) {
        (ring.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.85 + pulse * 2.6;
      }
    });

    // the cloud deck breathes
    if (cloudsRef.current) {
      cloudsRef.current.position.x = Math.sin(state.clock.elapsedTime * 0.04) * 3;
      cloudsRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.023) * 1.2;
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
    // lean into the turn with the plane — subtle, but sells the flight
    camera.rotateZ(-bank * 0.22);
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

      {/* wingtip contrails */}
      <primitive object={trails.l} />
      <primitive object={trails.r} />

      {/* phase gates */}
      {gates.map((g, i) => (
        <group
          key={i}
          ref={(el: THREE.Group | null) => {
            gateRefs.current[i] = el;
          }}
          position={g.pos.toArray()}
          quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), g.tan)}
        >
          <mesh>
            <torusGeometry args={[7.5, 0.28, 12, 64]} />
            <meshStandardMaterial color={g.hue} emissive={g.hue} emissiveIntensity={0.85} roughness={0.3} />
          </mesh>
          <pointLight color={g.hue} intensity={140} distance={46} />
        </group>
      ))}

      {/* cloud deck */}
      <points ref={cloudsRef} geometry={cloudGeo}>
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

/* ── hero split-flap departures board ────────────────────────────────── */
const FLAP_DESTS = ["TOKYO", "LISBON", "SEOUL", "BALI", "AMMAN"];
const FLAP_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ·";
const FLAP_LEN = 6;

function FlapBoard({ boarding, gate }: { boarding: string; gate: string }) {
  const [display, setDisplay] = useState(FLAP_DESTS[0].padEnd(FLAP_LEN, " "));
  useEffect(() => {
    let idx = 0;
    let sweep: ReturnType<typeof setInterval> | null = null;
    const cycle = setInterval(() => {
      idx = (idx + 1) % FLAP_DESTS.length;
      const target = FLAP_DESTS[idx].padEnd(FLAP_LEN, " ");
      let tick = 0;
      if (sweep) clearInterval(sweep);
      // each cell rattles through the alphabet, settling left to right
      sweep = setInterval(() => {
        tick++;
        setDisplay((prev) =>
          prev
            .split("")
            .map((c, i) => (tick > i * 2 + 3 ? target[i] : FLAP_CHARS[(tick * 7 + i * 5) % FLAP_CHARS.length]))
            .join(""),
        );
        if (tick > FLAP_LEN * 2 + 4 && sweep) {
          clearInterval(sweep);
          sweep = null;
        }
      }, 50);
    }, 2800);
    return () => {
      clearInterval(cycle);
      if (sweep) clearInterval(sweep);
    };
  }, []);

  return (
    <div className="mt-9 inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
      <span className="text-[10px] font-black tracking-[0.12em] uppercase text-[#141414]/45">
        {boarding}
      </span>
      <span className="flex gap-[3px]" dir="ltr">
        {display.split("").map((ch, i) => (
          <span
            key={i}
            className="w-7 h-9 sm:w-8 sm:h-10 rounded-[5px] flex items-center justify-center font-mono text-[15px] sm:text-[17px] font-black select-none"
            style={{
              color: "#F5E9C8",
              background: "linear-gradient(#20242E 48%, #14161d 48%, #191C24 52%, #20242E 52%)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.14), 0 2px 6px rgba(10,14,24,0.35)",
            }}
          >
            {ch}
          </span>
        ))}
      </span>
      <span
        className="rounded-full border px-2.5 py-1 text-[10px] font-black tracking-[0.06em] uppercase"
        style={{ color: "#0C7A6F", borderColor: "rgba(12,122,111,0.4)", background: "rgba(12,122,111,0.08)" }}
      >
        {gate}
      </span>
    </div>
  );
}

/* ── overlay segments driven by quantized progress ───────────────────── */
const CYCLE_WORDS = ["the flight plan.", "the fuel money.", "the memories.", "سوا."];
const CYCLE_WORDS_AR = ["خطة الرحلة.", "مصاريف الرحلة.", "الذكريات.", "سوا."];

/* ── Arabic layer — same flight, بالعربي ─────────────────────────────── */
const ATMOS_AR = [
  { label: "خطة الرحلة", clock: "T−89", word: "خطّط" },
  { label: "قبل الإقلاع", clock: "T−7", word: "احزم" },
  { label: "أثناء الطيران", clock: "اليوم 3", word: "اقسم" },
  { label: "الصندوق الأسود", clock: "العودة", word: "الختام" },
  { label: "سوا", clock: "التالي", word: "سوا" },
] as const;

const STATIONS_AR = [
  {
    lead: "قدّموا خطة الطيران، ",
    accent: "سوا.",
    body: "الأصوات تحطّ، أيام الخطة تمتلئ، والجاهزية ترتفع — الرحلة لم تعد «ربما».",
    rx: "«طيب… هل نحن ذاهبون فعلًا؟؟»",
    tx: "مصرَّح بالإقلاع ✈",
  },
  {
    lead: "كل مفتاح يقلب إلى ",
    accent: "أخضر.",
    body: "المستندات مثبّتة على اليوم الأول، والطقس حاضر — واللوحة تنادي بالاسم على الحقيبة التي لم تُحزم بعد.",
    rx: "«من يعيد إرسال رابط السكن؟»",
    tx: "مثبّت · اليوم 1",
  },
  {
    lead: "احرقوا الوقود ",
    accent: "بالتساوي.",
    body: "فاتورة الليلة ¥12,400 تقسم نفسها على أربعة قبل وصول الباقي — حتى من دون إنترنت.",
    rx: "«من دفع أجرة التاكسي؟»",
    tx: "قسمة عادلة · ¥3,100",
  },
  {
    lead: "شغّلوا تسجيل ",
    accent: "الرحلة كاملة.",
    body: "خمسة أيام تصبح شريطًا واحدًا — مُسدَّدة، مُشارَكة، وتسأل: إلى أين بعد؟",
    rx: "«أرسلوا الصور 🙏»",
    tx: "الشريط مُشارك ✦",
  },
] as const;

const UI = {
  en: {
    start: "Start today",
    loading: "Preparing the trip",
    cleared: "CLEARED ✈",
    kicker: "Scroll to fly · نروح سوا",
    h1a: "PACK",
    h1b: "SAWA.",
    homeFor: "One home for",
    boarding: "Now boarding",
    gate: "Gate SAWA · On time",
    altitude: "Altitude",
    ft: "FT",
    throttle: "Throttle",
    fkick: "Wheels down · Where next?",
    f1: "FLY IT",
    f2: "SAWA.",
    board: "Board now",
    fsub: "Free · two-minute setup · English + العربية",
    replay: "Replay the flight ↺",
    keysNav: "fly between stops",
    keysRoll: "barrel roll",
  },
  ar: {
    start: "ابدأ اليوم",
    loading: "جارٍ تجهيز الرحلة",
    cleared: "مصرَّح بالإقلاع ✈",
    kicker: "مرّر لتطير · Pack sawa",
    h1a: "نروح",
    h1b: "سوا.",
    homeFor: "بيت واحد لـ",
    boarding: "الصعود الآن",
    gate: "بوابة سوا · في الموعد",
    altitude: "الارتفاع",
    ft: "قدم",
    throttle: "مرّر",
    fkick: "هبطنا · إلى أين بعد؟",
    f1: "طيروها",
    f2: "سوا.",
    board: "اصعد الآن",
    fsub: "مجاني · إعداد في دقيقتين · العربية + English",
    replay: "أعد الرحلة ↺",
    keysNav: "تنقّل بين المحطات",
    keysRoll: "دحرجة!",
  },
} as const;

export function VisionX() {
  const rig = useRef<Rig>({ p: 0, target: 0, mx: 0, my: 0, barrel: -1e9 });
  const [prog, setProg] = useState(0); // quantized for overlay
  const [word, setWord] = useState(0);
  const [cursor, setCursor] = useState({ x: -100, y: -100 });
  const [webgl, setWebgl] = useState(true);
  const [arMode, setArMode] = useState(true);
  const t = UI[arMode ? "ar" : "en"];

  // ── boarding preloader: the app boots inside a phone, then takes off ──
  const [loadPct, setLoadPct] = useState(0);
  const [boarded, setBoarded] = useState(false); // overlay removed from DOM
  const departing = loadPct >= 100;

  useEffect(() => {
    // reduced motion: skip the show, board immediately
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setLoadPct(100);
      return;
    }
    // 0→100 with a believable rhythm: quick climb, hesitation, final burst
    const timer = setInterval(() => {
      setLoadPct((p) => {
        if (p >= 100) return 100;
        const step = p < 55 ? 2 : p < 82 ? 1 : p < 96 ? 2 : 1;
        return Math.min(100, p + step);
      });
    }, 34);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!departing) return;
    const done = setTimeout(() => setBoarded(true), 1700);
    return () => clearTimeout(done);
  }, [departing]);

  // hold the page still while boarding
  useEffect(() => {
    if (boarded) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, [boarded]);

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
    // double-click anywhere = barrel roll (touch and trackpad pilots too)
    const onDbl = () => {
      rig.current.barrel = performance.now();
    };
    window.addEventListener("dblclick", onDbl);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: true });
    const wordTimer = setInterval(() => setWord((w) => (w + 1) % CYCLE_WORDS.length), 1500);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("dblclick", onDbl);
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
  const atmosLoc =
    station >= 0 && station < 4
      ? (arMode ? ATMOS_AR : ATMOS)[station as 0 | 1 | 2 | 3]
      : null;
  const chapter =
    station >= 0 && station < 4
      ? (arMode ? STATIONS_AR : STATIONS)[station as 0 | 1 | 2 | 3]
      : null;
  const nightish = prog > 0.7 && prog < 0.92;

  // the browser tab flies along with you
  useEffect(() => {
    const loc = station >= 0 && station < 4 ? (arMode ? ATMOS_AR : ATMOS)[station as 0 | 1 | 2 | 3] : null;
    document.title = loc
      ? `${loc.clock} · ${loc.label} — Paxawa`
      : station === 4
        ? arMode
          ? "إلى أين بعد؟ — Paxawa"
          : "Where next? — Paxawa"
        : arMode
          ? "نروح سوا — Paxawa"
          : "Pack Sawa — Paxawa";
  }, [station, arMode]);

  // keyboard flight: arrows/space hop between stations, s/س barrel-rolls
  useEffect(() => {
    if (!boarded) return;
    const stops = [0, 0.22, 0.44, 0.66, 0.84, 0.97];
    const onKey = (e: KeyboardEvent) => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const cur = rig.current.target;
      if (e.key === "s" || e.key === "S" || e.key === "س") {
        rig.current.barrel = performance.now();
        return;
      }
      let dir = 0;
      if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ") dir = 1;
      else if (e.key === "ArrowUp" || e.key === "PageUp") dir = -1;
      else if (e.key === "Home") {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      } else if (e.key === "End") {
        e.preventDefault();
        window.scrollTo({ top: max, behavior: "smooth" });
        return;
      } else return;
      e.preventDefault();
      const next =
        dir > 0
          ? (stops.find((s) => s > cur + 0.02) ?? 1)
          : ([...stops].reverse().find((s) => s < cur - 0.02) ?? 0);
      window.scrollTo({ top: Math.round(next * max), behavior: "smooth" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [boarded]);

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
    <div
      className="relative h-[700vh]"
      dir={arMode ? "rtl" : "ltr"}
      lang={arMode ? "ar" : "en"}
      style={{
        cursor: "none",
        fontFamily: arMode
          ? "var(--font-arabic-x), var(--font-sans), system-ui, sans-serif"
          : undefined,
      }}
    >
      <style>{`
        @keyframes vx-in { from { opacity: 0; transform: translateY(26px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes vx-spin { to { transform: rotate(360deg); } }
        @keyframes vx-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }
        @keyframes vx-bob { 0% { transform: translateY(-5px) rotate(-0.6deg); } 100% { transform: translateY(5px) rotate(0.6deg); } }
        @keyframes vx-word { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        /* glass letters: gradient pane clipped to the glyph silhouette —
           fill-based, so Arabic joins stay clean (no contour strokes) */
        .vx-glass {
          background: linear-gradient(
            160deg,
            rgba(255, 255, 255, 0.62) 0%,
            rgba(255, 255, 255, 0.16) 46%,
            rgba(255, 255, 255, 0.05) 62%,
            rgba(255, 255, 255, 0.38) 100%
          );
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          /* outer glow instead of stroke — follows the silhouette only,
             so the letterforms stay perfectly clean in both scripts */
          filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.55))
            drop-shadow(0 0 14px rgba(255, 255, 255, 0.35))
            drop-shadow(0 22px 40px rgba(10, 14, 24, 0.28));
        }
        /* light-mode skin for the shared demos, scoped to this concept */
        .vx-light [class~="bg-black"] { background: #F6F5F1 !important; }
        .vx-light [class*="border-white/"] { border-color: rgba(20,20,20,0.10) !important; }
        .vx-light [class*="bg-[#1A1A1A]"] { background: #FFFFFF !important; }
        .vx-light [class*="bg-white/"] { background: rgba(20,20,20,0.05) !important; }
        .vx-light [class~="text-white"] { color: #141414 !important; }
        .vx-light [class*="text-white/8"], .vx-light [class*="text-white/7"] { color: rgba(20,20,20,0.75) !important; }
        .vx-light [class*="text-white/6"], .vx-light [class*="text-white/5"] { color: rgba(20,20,20,0.58) !important; }
        .vx-light [class*="text-white/4"], .vx-light [class*="text-white/3"] { color: rgba(20,20,20,0.45) !important; }
        .vx-light [class*="text-[#B3A8FF]"] { color: #6D5AE6 !important; }
        .vx-light [class*="text-[#9BC97E]"], .vx-light [class*="text-[#B8DBA1]"] { color: #4C7A2F !important; }
        .vx-light [class*="text-[#3EC5B7]"] { color: #0C7A6F !important; }
        .vx-light [class*="text-[#E8CB86]"], .vx-light [class*="text-[#E0B252]"] { color: #8F6400 !important; }
        .vx-light [class*="text-[#FFAB88]"], .vx-light [class*="text-[#FF8A5C]"] { color: #B4441B !important; }
        .vx-light [class*="text-[#8B7CFF]"] { color: #6D5AE6 !important; }
      `}</style>
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
          <button
            type="button"
            onClick={() => setArMode((v) => !v)}
            className="rounded-full border border-[#141414]/15 px-2.5 py-1 text-[11px] font-black hover:bg-[#141414]/5 transition-colors"
            aria-label={arMode ? "Switch to English" : "التبديل إلى العربية"}
          >
            {arMode ? "EN" : "ع"}
          </button>
          <Link
            href="/auth/signup"
            className="rounded-full bg-[#141414] text-white px-4 py-1.5 text-sm font-bold hover:bg-[#6D5AE6] transition-colors"
          >
            {t.start}
          </Link>
        </div>
      </header>

      {/* ── altimeter (left rail) ── */}
      <div className="fixed left-6 top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col items-center gap-3 pointer-events-none">
        <span
          className={`text-[10px] font-black ${arMode ? "" : "tracking-[0.2em] rotate-180 [writing-mode:vertical-rl]"}`}
          style={{ color: faint }}
        >
          {t.altitude}
        </span>
        <div className="w-px h-40 relative rounded-full" style={{ background: faint }}>
          <div
            className="absolute bottom-0 inset-x-0 transition-[height] duration-200"
            style={{ height: `${Math.round(prog * 100)}%`, background: ink }}
          />
          {/* phase waypoints on the rail — click one to fly there */}
          {[0.22, 0.44, 0.66, 0.84].map((pos, i) => (
            <button
              key={i}
              type="button"
              aria-label={(arMode ? ATMOS_AR : ATMOS)[i].label}
              onClick={() =>
                window.scrollTo({
                  top: Math.round(pos * (document.documentElement.scrollHeight - window.innerHeight)),
                  behavior: "smooth",
                })
              }
              className="absolute left-1/2 pointer-events-auto w-[7px] h-[7px] rounded-full border transition-all duration-300 hover:scale-[1.8]"
              style={{
                bottom: `${pos * 100}%`,
                cursor: "none",
                background: prog >= pos - 0.06 ? ["#6D5AE6", "#0C7A6F", "#B4441B", "#E0B252"][i] : "transparent",
                borderColor: ["#6D5AE6", "#0C7A6F", "#B4441B", "#E0B252"][i],
                transform: `translate(-50%, 50%) scale(${Math.abs(prog - pos) < 0.07 ? 1.5 : 1})`,
              }}
            />
          ))}
        </div>
        <span className="text-[11px] font-black tabular-nums" style={{ color: ink }}>
          {Math.round(2000 + prog * 36000).toLocaleString()} {t.ft}
        </span>
      </div>

      {/* ── overlay stations ── */}
      <div className="fixed inset-0 z-30 pointer-events-none flex items-center justify-center px-6">
        {/* HERO */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center text-center transition-all duration-500 px-6"
          style={{ opacity: station === -1 ? 1 : 0, transform: `translateY(${station === -1 ? 0 : -40}px)` }}
        >
          <p
            className="text-[11px] font-black uppercase mb-6"
            style={{ color: faint, letterSpacing: arMode ? "0.08em" : "0.3em" }}
          >
            {t.kicker}
          </p>
          <div
            style={{
              transform: `translate(${rig.current.mx * -9}px, ${rig.current.my * -6}px)`,
              transition: "transform 0.9s cubic-bezier(0.16, 1, 0.3, 1)",
              willChange: "transform",
            }}
          >
            <h1
              className="font-black leading-[1.02] text-[#141414]"
              style={{
                fontSize: arMode ? "clamp(56px, 10vw, 150px)" : "clamp(64px, 12vw, 170px)",
                letterSpacing: arMode ? "0" : "-0.04em",
                lineHeight: arMode ? 1.15 : 0.9,
              }}
            >
              {t.h1a}
              <br />
              <span className="text-[#6D5AE6]">{t.h1b}</span>
            </h1>
          </div>
          <p className="mt-8 text-xl sm:text-2xl font-semibold text-[#141414]/70">
            {t.homeFor}{" "}
            <span className="inline-block min-w-[13ch] text-start font-black text-[#6D5AE6]">
              <span key={word} className="inline-block" style={{ animation: "vx-word 0.45s cubic-bezier(0.22,1,0.36,1) both" }}>
                {arMode ? CYCLE_WORDS_AR[word] : CYCLE_WORDS[word]}
              </span>
            </span>
          </p>
          <FlapBoard boarding={t.boarding} gate={t.gate} />
        </div>

        {/* PHASE STATIONS — the plane docks, the app shows itself */}
        {atmos && chapter && (
          <div key={atmos.word} className="absolute inset-0 flex items-center justify-center px-6">
            {/* giant glass word — a frosted pane floating over the sky,
                anchored to the side away from the mockup */}
            <p
              aria-hidden
              className="vx-glass absolute inset-x-0 bottom-[4vh] font-black leading-none select-none px-[4vw]"
              style={{
                fontSize: arMode ? "clamp(56px, 10vw, 150px)" : "clamp(64px, 11vw, 170px)",
                letterSpacing: arMode ? "0" : "-0.03em",
                textAlign: station % 2 === 1 ? "end" : "start",
                animation: "vx-in 0.7s cubic-bezier(0.22,1,0.36,1) both",
              }}
            >
              {atmosLoc?.word}
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
                  {atmosLoc?.clock} · {atmosLoc?.label}
                </span>
                <h2
                  className="mt-4 text-2xl sm:text-4xl font-black leading-[1.15] lg:max-w-md"
                  style={{ color: ink, letterSpacing: arMode ? "0" : "-0.03em" }}
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

              {/* the app, exactly as it is — reskinned light for daylight */}
              <div
                dir="ltr"
                className="vx-light mx-auto w-full max-w-[280px] sm:max-w-[340px]"
                style={{
                  animation: "vx-in 0.7s cubic-bezier(0.22,1,0.36,1) 0.12s both",
                  transform: `rotate(${station % 2 === 1 ? -1.5 : 1.5}deg)`,
                  boxShadow: `0 44px 130px -40px ${atmos.hue}99`,
                  borderRadius: 24,
                }}
              >
                {station === 0 ? (
                  <NowDemo progress={demoP} />
                ) : station === 1 ? (
                  <DepartureDemo progress={demoP} />
                ) : station === 2 ? (
                  <LiveDemo progress={demoP} />
                ) : (
                  <WrapDemo progress={demoP} />
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
          <p
            className="text-[11px] font-black uppercase mb-5 text-[#2E2005]/60"
            style={{ letterSpacing: arMode ? "0.06em" : "0.3em" }}
          >
            {t.fkick}
          </p>
          <h2
            className="font-black text-[#2E2005]"
            style={{
              fontSize: arMode ? "clamp(48px, 9vw, 130px)" : "clamp(56px, 10vw, 140px)",
              letterSpacing: arMode ? "0" : "-0.04em",
              lineHeight: arMode ? 1.15 : 0.9,
            }}
          >
            {t.f1}
            <br />
            <span className="vx-glass">{t.f2}</span>
          </h2>
          <Link
            href="/auth/signup"
            className="mt-10 inline-flex items-center gap-2 rounded-full bg-[#141414] text-white px-8 py-4 text-lg font-black hover:bg-[#6D5AE6] hover:scale-105 transition-all"
            style={{ cursor: "none" }}
          >
            {t.board}
            <ArrowRight className="w-5 h-5 rtl:rotate-180" />
          </Link>
          <p className="mt-5 text-sm text-[#2E2005]/60 font-semibold">{t.fsub}</p>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="mt-8 text-[11px] font-black tracking-[0.08em] uppercase text-[#2E2005]/50 hover:text-[#2E2005] transition-colors"
            style={{ cursor: "none" }}
          >
            {t.replay}
          </button>
        </div>
      </div>

      {/* ── boarding preloader (umano-style: one object, one number) ── */}
      {!boarded && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center overflow-hidden"
          style={{
            background: "#BFD9EC",
            transform: departing ? "translateY(-100%)" : "translateY(0)",
            transition: "transform 0.9s cubic-bezier(0.76, 0, 0.24, 1) 0.65s",
          }}
        >
          {/* faint runway grid */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                "linear-gradient(#141414 1px, transparent 1px), linear-gradient(90deg, #141414 1px, transparent 1px)",
              backgroundSize: "56px 56px",
            }}
          />

          {/* the phone: our app booting up — then it takes off */}
          <div
            style={{
              transform: departing
                ? `translate(${arMode ? "-46vw" : "46vw"}, -58vh) rotate(${arMode ? "-13deg" : "13deg"}) scale(0.55)`
                : "none",
              opacity: departing ? 0 : 1,
              transition: "transform 0.85s cubic-bezier(0.6, -0.1, 0.8, 0.4) 0.12s, opacity 0.5s ease 0.4s",
            }}
          >
            <div style={{ animation: departing ? "none" : "vx-bob 2.6s ease-in-out infinite alternate" }}>
              <div
                dir="ltr"
                className="vx-light w-[228px] sm:w-[252px] rounded-[34px] border-[6px] border-[#141414] overflow-hidden bg-[#141414]"
                style={{ boxShadow: "0 50px 110px -30px rgba(20,20,20,0.45)" }}
              >
                <NowDemo progress={loadPct / 100} />
              </div>
            </div>
          </div>

          {/* cleared stamp slams when boarding completes */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{
              opacity: departing ? 1 : 0,
              transform: `rotate(-9deg) scale(${departing ? 1 : 1.6})`,
              transition: "opacity 0.18s ease, transform 0.24s cubic-bezier(0.2, 1.6, 0.4, 1)",
            }}
          >
            <span
              className="rounded-lg border-4 px-5 py-2 text-xl sm:text-2xl font-black uppercase backdrop-blur-[2px]"
              style={{ color: "#6D5AE6", borderColor: "#6D5AE6", background: "rgba(255,255,255,0.35)", letterSpacing: arMode ? "0" : "0.14em" }}
            >
              {t.cleared}
            </span>
          </div>

          {/* umano corner: giant counter + status line */}
          <div className="absolute bottom-6 start-6 sm:bottom-8 sm:start-10">
            <p className="text-[11px] font-black uppercase mb-1 text-[#141414]/50" style={{ letterSpacing: arMode ? "0.06em" : "0.22em" }}>
              {t.loading}
              <span style={{ animation: "vx-blink 1s step-end infinite" }}>…</span>
            </p>
            <p
              className="font-black tabular-nums leading-none text-[#141414]"
              style={{ fontSize: "clamp(72px, 14vw, 190px)", letterSpacing: "-0.04em" }}
              dir="ltr"
            >
              {loadPct}
              <span className="text-[0.35em] align-top">%</span>
            </p>
          </div>

          {/* top brand line */}
          <div className="absolute top-6 inset-x-0 flex justify-center">
            <span className="text-[10px] font-black tracking-[0.3em] uppercase text-[#141414]/40">
              PAXAWA · {arMode ? "وضع الطيران" : "Flight mode"}
            </span>
          </div>
        </div>
      )}

      {/* keyboard hint — desktop pilots get controls */}
      <div
        className="fixed bottom-6 end-6 z-40 hidden md:flex items-center gap-3 pointer-events-none transition-opacity duration-700"
        style={{ opacity: boarded ? 1 : 0 }}
      >
        <span className="flex items-center gap-1.5">
          <kbd
            className="rounded-md border px-1.5 py-0.5 text-[10px] font-black"
            style={{ color: ink, borderColor: faint, background: nightish ? "rgba(13,13,13,0.35)" : "rgba(255,255,255,0.4)" }}
          >
            ↑↓
          </kbd>
          <span className="text-[10px] font-bold" style={{ color: faint }}>
            {t.keysNav}
          </span>
        </span>
        <span className="flex items-center gap-1.5">
          <kbd
            className="rounded-md border px-1.5 py-0.5 text-[10px] font-black"
            style={{ color: ink, borderColor: faint, background: nightish ? "rgba(13,13,13,0.35)" : "rgba(255,255,255,0.4)" }}
          >
            {arMode ? "س" : "S"}
          </kbd>
          <span className="text-[10px] font-bold" style={{ color: faint }}>
            {t.keysRoll}
          </span>
        </span>
      </div>

      {/* scroll runway hint */}
      <div
        className="fixed bottom-6 inset-x-0 z-30 flex justify-center pointer-events-none transition-opacity duration-500"
        style={{ opacity: prog < 0.02 ? 1 : 0 }}
      >
        <div className="flex flex-col items-center gap-1.5" style={{ color: faint }}>
          <span
            className="text-[10px] font-black uppercase"
            style={{ letterSpacing: arMode ? "0.06em" : "0.25em" }}
          >
            {t.throttle}
          </span>
          <span className="block w-px h-8 animate-pulse" style={{ background: faint }} />
        </div>
      </div>
    </div>
  );
}
