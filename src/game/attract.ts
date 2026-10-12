// 1978 attract-mode timeline, measured by cold-booting the ROM (tests/attract.check.ts).
// Frames count from the splash start ($0AEA). Coin screens and the demo are left out.

export type CarrierPhase = "approach" | "pull" | "push";
export interface AttractState {
    lines: { text: string; x: number; y: number; visible: number }[];
    icons: { x: number; y: number }[];
    y: { x: number; y: number; flipped: boolean } | null;
    carrier: {
        phase: CarrierPhase;
        x: number;
        y: number;
        image: 0 | 1;
    } | null;
}

const TYPE_FRAMES = 6;

// ROM screen address to the top-left of its 8×8 cell on the upright 224×256 screen.
const cell = (address: number) => ({
    x: (address - 0x2400) >> 5,
    y: 255 - (((address - 0x2400) & 31) * 8 + 7),
});

const LINES = [
    { text: "PLA", address: 0x3017, start: 64, step: TYPE_FRAMES },
    { text: "SPACE  INVADERS", address: 0x2b14, start: 88, step: TYPE_FRAMES },
    { text: "*SCORE ADVANCE TABLE*", address: 0x2810, start: 242, step: 0 },
    { text: "=? MYSTERY", address: 0x2e0e, start: 242, step: TYPE_FRAMES },
    { text: "=30 POINTS", address: 0x2e0c, start: 302, step: TYPE_FRAMES },
    { text: "=20 POINTS", address: 0x2e0a, start: 362, step: TYPE_FRAMES },
    { text: "=10 POINTS", address: 0x2e08, start: 422, step: TYPE_FRAMES },
].map(line => ({ ...line, ...cell(line.address) }));

const ICONS_AT = 243;
const ICONS = [0x2c0e, 0x2c0c, 0x2c0a, 0x2c08].map(cell);
// The fourth PLAY character is typed separately so the carrier can take it.
const PLAY_Y = { ...cell(0x3317), at: 82 };

export const CARRIER_PHASES = [
    { phase: "approach", start: 610, from: 0xfe, delta: -1, target: 0x9e },
    { phase: "pull", start: 706, from: 0x98, delta: 1, target: 0xff },
    { phase: "push", start: 873, from: 0xff, delta: -1, target: 0x97 },
] as const;
// 64 frames after the push, the ROM erases the alien and leaves the Y.
const CLEAR = 1041;

export const ATTRACT_END = { normal: 476, upsideDown: CLEAR };

// One-player game over ($16C9): typed over the frozen playfield like the splash text.
export const GAME_OVER = {
    text: "GAME OVER",
    ...cell(0x2d18),
    step: TYPE_FRAMES,
};

const carrierAt = (frame: number): AttractState["carrier"] => {
    let carrier: AttractState["carrier"] = null;
    for (const { phase, start, from, delta, target } of CARRIER_PHASES) {
        const moves = frame - start;
        if (moves < 1) break;
        // A move that lands on the target is not drawn; the last drawing stays.
        const drawn = Math.min(moves, Math.abs(target - from) - 1);
        carrier = {
            phase,
            x: from + delta * drawn - 32,
            y: PLAY_Y.y,
            image: drawn & 4 ? 0 : 1,
        };
    }
    return carrier;
};

export const attractState = (
    frame: number,
    upsideDown: boolean
): AttractState => {
    const lines = LINES.map(({ text, x, y, start, step }) => ({
        text,
        x,
        y,
        visible:
            frame < start
                ? 0
                : step
                  ? Math.min(
                        text.length,
                        Math.floor((frame - start) / step) + 1
                    )
                  : text.length,
    }));
    const icons = frame < ICONS_AT ? [] : ICONS;
    const carrier = upsideDown && frame < CLEAR ? carrierAt(frame) : null;
    let y: AttractState["y"] =
        frame < PLAY_Y.at
            ? null
            : { x: PLAY_Y.x, y: PLAY_Y.y, flipped: upsideDown };
    if (upsideDown && frame >= CLEAR)
        y = { x: PLAY_Y.x - 1, y: PLAY_Y.y, flipped: false };
    // The pull and push images carry the Y themselves.
    else if (carrier && carrier.phase !== "approach") y = null;
    return { lines, icons, y, carrier };
};
