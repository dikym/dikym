// Run: node --experimental-strip-types tests/attract.check.ts
// Compares the subdomain title-screen timeline with a cold-booted ROM.
import assert from "node:assert/strict";
import { createCpu8080 } from "../src/game/cpu8080.js";
import { ROM } from "../src/game/rom.ts";
import {
    ATTRACT_END,
    attractState,
    CARRIER_PHASES,
    GAME_OVER,
} from "../src/game/attract.ts";
import { ATTRACT_ICONS, CARRIER } from "../src/game/sprites.ts";

// The shipped snapshot starts a game, so attract mode needs a boot from reset.
const memory = new Uint8Array(0x4000);
memory.set(ROM);
const cpu = createCpu8080();
let shift = 0;
let shiftOffset = 0;
let deadline = 0;
cpu.init(
    (address, value) => {
        if ((address & 0x3fff) >= 0x2000) memory[address & 0x3fff] = value;
    },
    address => memory[address & 0x3fff],
    () => {},
    (port, value) => {
        if (port === 2) shiftOffset = value & 7;
        if (port === 4) shift = (value << 8) | (shift >> 8);
    },
    port =>
        port === 1
            ? 8
            : port === 2
              ? 0
              : port === 3
                ? (shift >> (8 - shiftOffset)) & 255
                : 0x0e
);
const vram: Uint8Array[] = [];
const splash: number[][] = [];
for (let f = 0; f < 3100; f++) {
    for (const [cycles, vector] of [
        [96 * 128, 8],
        [128 * 128, 16],
        [38 * 128, 0],
    ]) {
        deadline += cycles;
        if (deadline > cpu.T()) cpu.steps(deadline - cpu.T());
        if (vector) cpu.interrupt(vector);
    }
    vram.push(memory.slice(0x2400, 0x4000));
    splash.push([...memory.slice(0x20c1, 0x20cc)]);
}

const font = (code: number) => [
    ...ROM.slice(0x1e00 + code * 8, 0x1e08 + code * 8),
];
const cellBytes = (f: number, address: number) =>
    Array.from({ length: 8 }, (_, k) => vram[f][address - 0x2400 + k * 32]);
const same = (a: number[], b: number[]) => a.every((v, i) => v === b[i]);
const codeOf = (ch: string) =>
    ch === "="
        ? 0x27
        : ch === "*"
          ? 0x28
          : ch === "?"
            ? 0x38
            : ch >= "0" && ch <= "9"
              ? 0x1a + Number(ch)
              : ch.charCodeAt(0) - 65;
const first = (from: number, test: (f: number) => boolean) => {
    for (let f = from; f < vram.length; f++) if (test(f)) return f;
    return -1;
};
const addressOf = (x: number, y: number) => 0x2400 + x * 32 + (248 - y) / 8;
const firstOurs = (upsideDown: boolean, test: (frame: number) => boolean) => {
    for (let f = 0; f <= ATTRACT_END[upsideDown ? "upsideDown" : "normal"]; f++)
        if (test(f)) return f;
    return -1;
};
const close = (rom: number, ours: number, what: string) =>
    assert.ok(Math.abs(rom - ours) <= 1, `${what}: ROM ${rom}, ours ${ours}`);

// Cold boot plays the normal PLAY first, then the upside-down Y after the demo.
const showsP = (f: number) => same(cellBytes(f, 0x3017), font(0x0f));
const normalP = first(0, showsP);
const upsideP = first(normalP + 1, f => showsP(f) && !showsP(f - 1));
const bases = { normal: normalP - 64, upsideDown: upsideP - 64 };
assert.ok(same(cellBytes(bases.normal + 90, 0x3317), font(0x18)));
assert.ok(same(cellBytes(bases.upsideDown + 90, 0x3317), font(0x29)));

for (const variant of ["normal", "upsideDown"] as const) {
    const upsideDown = variant === "upsideDown";
    const base = bases[variant];
    const final = attractState(ATTRACT_END[variant], upsideDown);
    for (const line of final.lines) {
        assert.equal(line.visible, line.text.length, `${line.text} complete`);
        [...line.text].forEach((ch, j) => {
            if (ch === " ") return;
            const address = addressOf(line.x, line.y) + j * 0x100;
            const rom = first(base, f =>
                same(cellBytes(f, address), font(codeOf(ch)))
            );
            assert.ok(rom >= 0, `${line.text}[${j}] found in ROM`);
            const ours = firstOurs(
                upsideDown,
                f =>
                    attractState(f, upsideDown).lines.find(
                        l => l.text === line.text
                    )!.visible > j
            );
            close(rom - base, ours, `${variant} ${line.text}[${j}]`);
        });
    }
    for (const icon of final.icons) {
        const address = addressOf(icon.x, icon.y);
        const rom = first(base, f =>
            Array.from(
                { length: 16 },
                (_, k) => vram[f][address - 0x2400 + k * 32]
            ).some(Boolean)
        );
        const ours = firstOurs(
            upsideDown,
            f => attractState(f, upsideDown).icons.length > 0
        );
        close(rom - base, ours, `${variant} icon at x=${icon.x} y=${icon.y}`);
    }
    const glyph = font(upsideDown ? 0x29 : 0x18);
    const romY = first(base, f => same(cellBytes(f, 0x3317), glyph));
    const oursY = firstOurs(
        upsideDown,
        f => attractState(f, upsideDown).y?.flipped === upsideDown
    );
    close(romY - base, oursY, `${variant} fourth PLAY character`);
    for (let f = 0; f <= ATTRACT_END[variant]; f++)
        for (const line of attractState(f, upsideDown).lines)
            assert.ok(!/INSERT|COIN/.test(line.text));
}

for (let f = 0; f <= ATTRACT_END.normal + 600; f++)
    assert.equal(attractState(f, false).carrier, null);

// Carrier phases come straight from the ROM's splash descriptors.
const descriptors = [0x1a95, 0x1bb0, 0x1fc9];
descriptors.forEach((address, i) => {
    const phase = CARRIER_PHASES[i];
    assert.equal(phase.from, ROM[address + 4]);
    assert.equal(phase.delta, (ROM[address + 2] << 24) >> 24);
    assert.equal(phase.target, ROM[address + 8]);
});
let drawn = 0;
for (let f = bases.upsideDown + 600; f < bases.upsideDown + 1050; f++) {
    const [task, form, , , , coord, lo, hi, , target, reached] = splash[f];
    if (task !== 2 || reached !== 0 || form === 0) continue;
    const index = CARRIER_PHASES.findIndex(p => p.target === target);
    const address = descriptors[index];
    const image =
        (lo | (hi << 8)) === (ROM[address + 5] | (ROM[address + 6] << 8))
            ? 0
            : 1;
    const match = [0, -1, 1].some(k => {
        const carrier = attractState(f - bases.upsideDown + k, true).carrier;
        return (
            carrier?.phase === CARRIER_PHASES[index].phase &&
            carrier.x === coord - 32 &&
            carrier.image === image
        );
    });
    assert.ok(match, `carrier at ROM frame ${f - bases.upsideDown}`);
    drawn++;
}
assert.ok(drawn > 290, `checked ${drawn} carrier frames`);

// After the push the ROM leaves only the Y, one column left of a typed Y.
const end = bases.upsideDown + ATTRACT_END.upsideDown + 4;
const column = (x: number) => vram[end][x * 32 + 0x17];
assert.deepEqual([120, 121, 122, 123, 124].map(column), font(0x18).slice(1, 6));
for (let x = 125; x < 135; x++) assert.equal(column(x), 0);
const finalY = attractState(ATTRACT_END.upsideDown, true).y!;
assert.deepEqual(finalY, { x: 119, y: 64, flipped: false });
assert.equal(attractState(ATTRACT_END.upsideDown, true).carrier, null);

// Icons and carrier are the ROM's own drawings.
const columns = (rows: string[]) =>
    Array.from({ length: 16 }, (_, x) =>
        rows.reduce(
            (byte, row, y) => byte | (row[x] === "X" ? 1 << (7 - y) : 0),
            0
        )
    );
const table = bases.normal + ATTRACT_END.normal;
attractState(ATTRACT_END.normal, false).icons.forEach((icon, i) =>
    assert.deepEqual(
        columns(ATTRACT_ICONS[i]),
        Array.from(
            { length: 16 },
            (_, k) => vram[table][addressOf(icon.x, icon.y) - 0x2400 + k * 32]
        ),
        `score table icon ${i}`
    )
);
descriptors.forEach((address, i) => {
    const image = ROM[address + 5] | (ROM[address + 6] << 8);
    CARRIER[CARRIER_PHASES[i].phase].forEach((rows, frame) =>
        assert.deepEqual(
            columns(rows),
            [...ROM.slice(image + frame * 0x30, image + frame * 0x30 + 16)],
            `${CARRIER_PHASES[i].phase} image ${frame}`
        )
    );
});
// Game over (1 player, $16C9): LD HL,$2D18; LD DE,$1AA6; LD C,$0A; CALL PrintMessageDel.
assert.deepEqual(
    [...ROM.slice(0x16c9, 0x16d4)],
    [0x21, 0x18, 0x2d, 0x11, 0xa6, 0x1a, 0x0e, 0x0a, 0xcd, 0x93, 0x0a]
);
assert.deepEqual(
    { x: GAME_OVER.x, y: GAME_OVER.y, step: GAME_OVER.step },
    { x: 72, y: 56, step: 6 }
);
assert.deepEqual(
    [...GAME_OVER.text].map(ch => (ch === " " ? 0x26 : codeOf(ch))),
    [...ROM.slice(0x1aa6, 0x1aa6 + GAME_OVER.text.length)]
);
console.log("attract: ok");
