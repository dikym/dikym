// Run: node --experimental-strip-types tests/quorzak.check.ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { assemble } from "../tools/asm8080.ts";
import { ROM, SYMBOLS } from "../src/game/rom.ts";
import { FRAME_S, W, litPixel, newGame, step } from "../src/game/machine.ts";
import type { Game, Input } from "../src/game/machine.ts";

const IDLE: Input = { left: false, right: false, fire: false };
const S = SYMBOLS;
interface Quiet {
    bombs?: boolean;
    ufo?: boolean;
}
// Keeps alien fire and the UFO away so a check sees only what it drives.
const quiet = (g: Game, { bombs = true, ufo = true }: Quiet = {}) => {
    if (bombs) g.memory[S.RELOAD] = 255;
    if (ufo) g.memory[S.UFOTMR + 1] = 255;
};
const tick = (g: Game, input = IDLE, options: Quiet = {}) => {
    quiet(g, options);
    step(g, input, FRAME_S);
};
const run = (g: Game, frames: number, input = IDLE, options: Quiet = {}) => {
    for (let i = 0; i < frames; i++) tick(g, input, options);
};

// The committed ROM is the assembled source.
const built = assemble(
    readFileSync(new URL("../src/game/quorzak.asm", import.meta.url), "utf8")
);
assert.deepEqual([...built.bytes], [...ROM], "rom.ts is stale: npm run rom");
for (const name of built.publics)
    assert.equal(
        SYMBOLS[name as keyof typeof SYMBOLS],
        built.symbols.get(name),
        name
    );
assert.ok(ROM.length <= 0x2000);

// Boot
{
    const g = newGame();
    assert.equal(g.memory[0x2000], 1);
    assert.deepEqual([g.score, g.lives, g.wave, g.over], [0, 3, 1, false]);
    assert.equal(g.invaders.filter(invader => invader.alive).length, 55);
    assert.equal(g.memory[0x2006], 120);
    assert.ok([24, 26].includes(g.memory[0x2005]), "grid starts at x 24");
    for (let x = 0; x < W; x++) assert.ok(litPixel(g, x, 239), `ground ${x}`);
    assert.ok(litPixel(g, 36, 196), "shield body");
    assert.ok(!litPixel(g, 42, 203), "shield notch");
    // Dome's top row spans x+6..x+8, so x 32 is lit whether it sits at 24 or 26.
    assert.ok(litPixel(g, 32, 120), "bottom-left Dome drawn");
    const other = newGame();
    other.memory[0x2010] = 0;
    assert.equal(g.memory[0x2010], 1, "games share no memory");
}

// The rack marches right, drops 8 px at the edge, then marches left.
{
    const g = newGame();
    const y0 = g.memory[0x2006];
    let x = g.memory[0x2005];
    let frames = 0;
    while (g.memory[0x2006] === y0) {
        tick(g);
        assert.ok(
            g.memory[0x2005] >= x,
            "moves right before the first descent"
        );
        x = g.memory[0x2005];
        assert.ok(++frames < 3000, "rack never descended");
    }
    assert.equal(g.memory[0x2006], y0 + 8);
    assert.ok(x + 160 + 14 >= 214, "descended at the right wall");
    const xDown = g.memory[0x2005];
    run(g, 120);
    assert.ok(g.memory[0x2005] < xDown, "turned left after the descent");
    const notes = g.events
        .filter(event => event.port === 5 && event.value & 15)
        .map(event => event.value & 15);
    assert.deepEqual(notes.slice(0, 8), [1, 2, 4, 8, 1, 2, 4, 8]);
}

// Clearing the rack starts wave 2 lower, with intact shields.
{
    const g = newGame();
    g.memory.fill(0, 0x2010, 0x2010 + 55);
    run(g, 120);
    assert.equal(g.wave, 2);
    assert.equal(g.memory[0x2006], 136);
    assert.equal(g.invaders.filter(invader => invader.alive).length, 55);
    assert.ok(litPixel(g, 36, 196), "shield redrawn");
}

// Aliens reaching the ship row end the game.
{
    const g = newGame();
    g.memory[0x2006] = 208;
    for (let i = 0; i < 120 && !g.over; i++) tick(g);
    assert.equal(g.over, true);
    assert.equal(g.memory[0x2000], 2);
}

console.log("quorzak: ok");
