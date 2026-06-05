"use client";

/**
 * Static fake barcode/QR illustration. Generates a stable but
 * random-looking bar pattern from a string seed (the booking reference)
 * so it looks real per ticket without us pulling a real barcode library.
 * When we wire the actual confirmations, swap to a true Code-128 / QR
 * encoder driven by the parsed boarding-pass / e-ticket data.
 */
export function FakeBarcode({ seed, kind = "barcode" }: { seed: string; kind?: "barcode" | "qr" }) {
  // Cheap stable PRNG so the same reference always renders the same bars.
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const rand = () => {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    return h / 0x7fffffff;
  };

  if (kind === "qr") {
    const grid = 17;
    const cells: { x: number; y: number; on: boolean }[] = [];
    for (let y = 0; y < grid; y++) {
      for (let x = 0; x < grid; x++) {
        cells.push({ x, y, on: rand() > 0.55 });
      }
    }
    // Corner finder squares — mandatory in real QRs, included so it
    // reads as a QR rather than confetti.
    const isFinder = (x: number, y: number) =>
      (x < 7 && y < 7) || (x >= grid - 7 && y < 7) || (x < 7 && y >= grid - 7);

    const size = 160;
    const cell = size / grid;
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="text-foreground">
        {cells.map((c, i) => {
          if (isFinder(c.x, c.y)) return null;
          if (!c.on) return null;
          return <rect key={i} x={c.x * cell} y={c.y * cell} width={cell} height={cell} fill="currentColor" />;
        })}
        {/* Three finder squares */}
        {[
          [0, 0],
          [grid - 7, 0],
          [0, grid - 7],
        ].map(([fx, fy], i) => (
          <g key={i}>
            <rect x={fx * cell} y={fy * cell} width={7 * cell} height={7 * cell} fill="currentColor" />
            <rect
              x={(fx + 1) * cell}
              y={(fy + 1) * cell}
              width={5 * cell}
              height={5 * cell}
              fill="white"
            />
            <rect
              x={(fx + 2) * cell}
              y={(fy + 2) * cell}
              width={3 * cell}
              height={3 * cell}
              fill="currentColor"
            />
          </g>
        ))}
      </svg>
    );
  }

  // Linear barcode — variable-width bars
  const bars: { x: number; w: number }[] = [];
  let x = 0;
  while (x < 240) {
    const w = 1 + Math.floor(rand() * 4);
    const gap = 1 + Math.floor(rand() * 3);
    bars.push({ x, w });
    x += w + gap;
  }
  return (
    <svg width={240} height={70} viewBox="0 0 240 70" className="text-foreground">
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y={0} width={b.w} height={70} fill="currentColor" />
      ))}
    </svg>
  );
}
