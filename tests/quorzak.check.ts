// Run: node --experimental-strip-types tests/quorzak.check.ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { assemble } from "../tools/asm8080.ts";
import { ROM, SYMBOLS } from "../src/game/rom.ts";
import { FRAME_S, W, litPixel, newGame, step } from "../src/game/machine.ts";
import type { Game, Input } from "../src/game/machine.ts";
import {
    ALIEN_SPRITES,
    PLAYER,
    SCORE_GLYPHS,
    TWIN,
    UFO,
} from "../src/game/sprites.ts";

const IDLE: Input = { left: false, right: false, fire: false };
const LEFT: Input = { ...IDLE, left: true };
const RIGHT: Input = { ...IDLE, right: true };
const FIRE: Input = { ...IDLE, fire: true };
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

// Sprites read from the ROM match the spec drawings.
const padded = (pad: number, rows: string[]) =>
    rows.map(row => ".".repeat(pad) + row + ".".repeat(16 - pad - row.length));
assert.deepEqual(
    ALIEN_SPRITES[0][0],
    padded(4, [
        "...X...",
        "...X...",
        "..XXX..",
        ".XX.XX.",
        "XXXXXXX",
        "X.X.X.X",
        "..X.X..",
        ".X...X.",
    ])
);
assert.deepEqual(
    ALIEN_SPRITES[1][1],
    padded(3, [
        ".XXXXXXX.",
        "XXXXXXXXX",
        "XX.XXX.XX",
        "XXXXXXXXX",
        ".XX.X.XX.",
        "..X...X..",
        ".X.X.X.X.",
        ".........",
    ])
);
assert.deepEqual(
    ALIEN_SPRITES[2][0],
    padded(2, [
        "....XXX....",
        "..XXXXXXX..",
        ".XXXXXXXXX.",
        "XX..XXX..XX",
        "XXXXXXXXXXX",
        ".X.X.X.X.X.",
        "X.X.X.X.X.X",
        "...........",
    ])
);
assert.equal(TWIN[0][0], ".XXXXXXX.");
assert.deepEqual(PLAYER, [
    "......X......",
    ".....XXX.....",
    ".....XXX.....",
    "....XXXXX....",
    "...XXXXXXX...",
    ".XXXXX.XXXXX.",
    "XXXXXXXXXXXXX",
    "XX.........XX",
]);
assert.equal(UFO[0], "......XXX......");
assert.deepEqual(SCORE_GLYPHS["0"].slice(0, 7), [
    "..XXX...",
    ".X...X..",
    ".X...X..",
    ".X.X.X..",
    ".X...X..",
    ".X...X..",
    "..XXX...",
]);
assert.deepEqual(SCORE_GLYPHS[" "], Array(8).fill("........"));
assert.deepEqual(SCORE_GLYPHS["8"].slice(0, 7), [
    "..XXX...",
    ".X...X..",
    ".X...X..",
    ".XXXXX..",
    ".X...X..",
    ".X...X..",
    "..XXX...",
]);

// Boot
{
    const g = newGame();
    assert.equal(g.memory[0x2000], 1);
    assert.deepEqual([g.score, g.lives, g.wave, g.over], [0, 3, 1, false]);
    assert.equal(g.invaders.filter(invader => invader.alive).length, 55);
    assert.equal(g.memory[0x2006], 128);
    // Only the UFO flies in the red overlay band (y 32-61); every alien sits below it.
    assert.ok(
        g.invaders.every(invader => invader.y >= 62),
        "aliens below red"
    );
    assert.equal(g.memory[0x2005], 24);
    for (let x = 0; x < W; x++) assert.ok(litPixel(g, x, 239), `ground ${x}`);
    assert.ok(litPixel(g, 36, 196), "shield body");
    assert.ok(!litPixel(g, 42, 203), "shield notch");
    // Like the original, the rack starts empty and appears one alien per tick
    // without moving; the UI draws the waiting rack itself before Start.
    const rackPixels = () => {
        let lit = 0;
        for (let x = 0; x < W; x++)
            for (let y = 64; y < 136; y++) lit += Number(litPixel(g, x, y));
        return lit;
    };
    assert.equal(rackPixels(), 0, "rack not drawn before the first tick");
    run(g, 1);
    assert.ok(litPixel(g, 32, 128), "bottom-left Dome drawn first");
    assert.ok(!litPixel(g, 24 + 10 * 16 + 7, 80), "top-right Spire not yet");
    run(g, 54);
    assert.ok(litPixel(g, 24 + 10 * 16 + 7, 80), "whole rack drawn");
    assert.equal(g.memory[0x2005], 24, "the drawing pass does not move");
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
    assert.equal(g.memory[0x2006], 144);
    assert.equal(g.invaders.filter(invader => invader.alive).length, 55);
    assert.ok(litPixel(g, 36, 196), "shield redrawn");
}

// Aliens reaching the ship row (y 216) end the game; just above it they do not.
{
    const g = newGame();
    g.memory[0x2006] = 208;
    run(g, 120);
    assert.equal(g.over, false, "rack just above the ship row");
    g.memory[0x2006] = 216;
    for (let i = 0; i < 120 && !g.over; i++) tick(g);
    assert.equal(g.over, true);
    assert.equal(g.memory[0x2000], 2);
}

// A wave change never takes longer than a frame: no RST 1 tick is lost.
{
    const g = newGame();
    let missed = 0;
    const raise = g.cpu.interrupt.bind(g.cpu);
    g.cpu.interrupt = vector => {
        if (vector === 8 && !g.cpu.save().inte) missed++;
        raise(vector);
    };
    g.memory.fill(0, 0x2010, 0x2010 + 55);
    run(g, 200);
    assert.equal(g.wave, 2);
    assert.equal(missed, 0, "ticks lost to the wave change");
    assert.ok(litPixel(g, 36, 196), "shields redrawn");
    assert.ok(
        Array.from({ length: W }, (_, x) => litPixel(g, x, 144)).some(Boolean),
        "new rack drawn"
    );
}

// Puts the ship so its shot rises through column `col` (sprite centre is cell x + 7).
const aim = (g: Game, col: number) => {
    const px = () => g.memory[S.PX];
    for (let i = 0; i < 400; i++) {
        const target = g.memory[0x2005] + col * 16 + 1;
        if (px() === target) return;
        tick(g, px() < target ? RIGHT : LEFT);
    }
    assert.fail(`could not aim at column ${col}`);
};
// Fires once, waits for the shot to end, returns the points gained.
const shoot = (g: Game) => {
    for (let i = 0; i < 60 && g.memory[S.AEXT]; i++) tick(g);
    const before = g.score;
    tick(g, FIRE);
    assert.equal(g.memory[S.SHOTON], 1, "shot fired");
    for (let i = 0; i < 120 && g.memory[S.SHOTON]; i++) tick(g);
    assert.equal(g.memory[S.SHOTON], 0, "shot ended");
    for (let i = 0; i < 60 && g.memory[S.SBT]; i++) tick(g);
    return g.score - before;
};

// Holding fire shoots once; the next shot needs a new press.
{
    const g = newGame();
    tick(g, FIRE);
    assert.equal(g.memory[S.SHOTON], 1);
    run(g, 150, FIRE);
    assert.equal(g.memory[S.SHOTON], 0, "held fire does not shoot again");
    assert.equal(g.memory[S.SHOTCNT], 1);
    tick(g);
    tick(g, FIRE);
    assert.equal(g.memory[S.SHOTON], 1, "a new press shoots");
    assert.equal(g.memory[S.SHOTCNT], 2);
}

// A shot that reaches the top bursts there; the next shot waits for the burst.
{
    const g = newGame();
    const burst = () => {
        let lit = 0;
        for (let x = 16; x < 26; x++)
            for (let y = 32; y < 41; y++) lit += Number(litPixel(g, x, y));
        return lit;
    };
    tick(g, FIRE);
    for (let i = 0; i < 120 && g.memory[S.SHOTON]; i++) tick(g);
    assert.ok(burst() > 0, "burst drawn at the top");
    tick(g, FIRE);
    assert.equal(g.memory[S.SHOTON], 0, "no new shot during the burst");
    run(g, 20);
    assert.equal(burst(), 0, "burst erased");
    tick(g, FIRE);
    assert.equal(g.memory[S.SHOTON], 1, "fires again after the burst");
}

// Ship moves and stops at the walls.
{
    const g = newGame();
    run(g, 300, LEFT);
    assert.equal(g.memory[S.PX], 16);
    run(g, 300, RIGHT);
    assert.equal(g.memory[S.PX], 185);
}

// The UI samples VRAM after each step, so every tick must finish drawing by then.
{
    const g = newGame();
    for (let i = 0; i < 240; i++) {
        tick(g, (i >> 5) & 1 ? LEFT : RIGHT, { bombs: false });
        assert.ok(litPixel(g, g.memory[S.PX] + 6, 216), `ship drawn ${i}`);
    }
}

// Column 2 (between shields) from the bottom: Dome, Dome, Twin, Twin, Spire.
{
    const g = newGame();
    const gained = [];
    for (let row = 0; row < 5; row++) {
        aim(g, 2);
        gained.push(shoot(g));
    }
    assert.deepEqual(gained, [10, 10, 20, 20, 30]);
    assert.equal(g.score, 90);
    assert.equal(g.memory[S.SHOTCNT], 5);
    for (let row = 0; row < 5; row++)
        assert.equal(
            g.memory[0x2010 + row * 11 + 2],
            0,
            `row ${row} col 2 dead`
        );
}

// A shot into a shield erodes it and scores nothing.
{
    const g = newGame();
    const shieldPixels = () => {
        let lit = 0;
        for (let x = 32; x < 52; x++)
            for (let y = 192; y < 204; y++) lit += Number(litPixel(g, x, y));
        return lit;
    };
    const before = shieldPixels();
    for (let i = 0; i < 400 && g.memory[S.PX] !== 30; i++)
        tick(g, g.memory[S.PX] < 30 ? RIGHT : LEFT);
    assert.equal(shoot(g), 0);
    assert.ok(shieldPixels() < before, "shield lost pixels");
}

// The extra ship comes once, at 1,500.
{
    const g = newGame();
    g.memory[0x2001] = 0x90;
    g.memory[0x2002] = 0x14;
    aim(g, 2);
    assert.equal(shoot(g), 10);
    assert.deepEqual([g.score, g.lives], [1500, 4]);
    aim(g, 2);
    shoot(g);
    assert.deepEqual([g.score, g.lives], [1510, 4]);
}

// The rack waits while an alien explodes and while the ship explodes.
{
    const g = newGame();
    run(g, 60);
    aim(g, 2);
    tick(g, FIRE);
    for (let i = 0; i < 120 && !g.memory[S.AEXT]; i++) tick(g);
    assert.ok(g.memory[S.AEXT] > 0, "alien hit");
    const cursor = g.memory[S.CURSOR];
    for (let i = 0; i < 60 && g.memory[S.AEXT]; i++) {
        tick(g);
        if (g.memory[S.AEXT])
            assert.equal(
                g.memory[S.CURSOR],
                cursor,
                "rack waits for the explosion"
            );
    }
    g.memory[S.PSTATE] = 64;
    const [during, x] = [g.memory[S.CURSOR], g.memory[0x2005]];
    run(g, 30);
    assert.deepEqual(
        [g.memory[S.CURSOR], g.memory[0x2005]],
        [during, x],
        "rack waits while the ship explodes"
    );
}

// Alien shots take turns: each moves 4 px on every third tick.
{
    const g = newGame();
    run(g, 60);
    const bolt = S.ASHOTS + 4;
    g.memory.set([1, 210, 100, 0], bolt);
    run(g, 3);
    assert.equal(g.memory[bolt + 2], 104);
    run(g, 3);
    assert.equal(g.memory[bolt + 2], 108);
}

// The player's shot and an alien shot destroy each other with a burst.
{
    const g = newGame();
    run(g, 60);
    g.memory.set([1, 210, 150, 0], S.ASHOTS + 4);
    run(g, 3);
    g.memory.set([1, 211, 180], S.SHOTON);
    let burst = 0;
    for (let i = 0; i < 20 && g.memory[S.ASHOTS + 4]; i++) {
        tick(g);
        burst = Math.max(burst, g.memory[S.SBT]);
    }
    assert.equal(g.memory[S.ASHOTS + 4], 0, "alien shot destroyed");
    assert.equal(g.memory[S.SHOTON], 0, "player shot destroyed");
    assert.ok(burst > 0, "they burst where they met");
}

// An alien shot that reaches the ground bursts and leaves a dent in it.
{
    const g = newGame();
    run(g, 60);
    g.memory.set([1, 210, 224, 0], S.ASHOTS + 4);
    run(g, 40);
    assert.equal(g.memory[S.ASHOTS + 4], 0, "shot and burst gone");
    assert.ok(!litPixel(g, 211, 239), "dent in the ground");
    assert.ok(litPixel(g, 200, 239), "ground elsewhere intact");
}

// Moves the ship until its shot rises at x (wrapping like the 8-bit rack).
const aimAt = (g: Game, x: number) => {
    for (let i = 0; i < 400 && g.memory[S.PX] !== x - 6; i++)
        tick(g, g.memory[S.PX] < x - 6 ? RIGHT : LEFT);
    assert.equal(g.memory[S.PX], x - 6);
};

// A rack that marched past the left wall (x wraps below 0) can still be shot.
{
    const g = newGame();
    for (let row = 0; row < 5; row++) g.memory[0x2010 + row * 11] = 0;
    g.memory[0x2005] = 254;
    g.memory[S.DIR] = 1;
    run(g, 56);
    assert.ok(g.memory[0x2005] > 200, "rack x wrapped below 0");
    aimAt(g, (g.memory[0x2005] + 6 * 16 + 7) & 255);
    assert.equal(shoot(g), 10, "column 6 Dome shot while the rack wraps");
}

// A rack low enough to reach the shields can still be shot between them.
{
    const g = newGame();
    g.memory[0x2006] = 192;
    run(g, 56);
    aimAt(g, g.memory[0x2005] + 2 * 16 + 7);
    assert.equal(shoot(g), 10, "low Dome shot between shields");
}

// An alien shot that lands on another's ground burst away from the ship bursts too.
{
    const g = newGame();
    run(g, 60);
    g.memory.set([1, 150, 224, 0], S.ASHOTS + 4);
    run(g, 6);
    assert.equal(
        g.memory[S.ASHOTS + 4],
        2,
        "first shot bursting on the ground"
    );
    g.memory.set([1, 150, 220, 0], S.ASHOTS + 8);
    run(g, 9);
    assert.equal(g.memory[S.PSTATE], 0, "ship far away survives");
    assert.equal(g.lives, 3);
}

// A kill updates the alien count at once (UFO and alien-shot speed depend on it).
{
    const g = newGame();
    g.memory.fill(0, 0x2010 + 8, 0x2010 + 55);
    run(g, 60);
    assert.equal(g.memory[S.LIVECNT], 8);
    // A shot just under the moving bottom-row Dome in column 2.
    g.memory.set([1, g.memory[0x2005] + 2 * 16 + 7, 140], S.SHOTON);
    for (let i = 0; i < 10 && g.memory[S.SHOTON]; i++) tick(g);
    assert.equal(g.score, 10);
    assert.equal(g.memory[S.LIVECNT], 7);
}

// The last alien moves every tick: 3 px to the right.
{
    const g = newGame();
    g.memory.fill(0, 0x2010 + 1, 0x2010 + 55);
    run(g, 10);
    const xs: number[] = [];
    for (let i = 0; i < 6; i++) {
        tick(g);
        xs.push(g.memory[0x2005]);
    }
    assert.deepEqual(
        xs.slice(1).map((x, i) => x - xs[i]),
        [3, 3, 3, 3, 3]
    );
}

// Alien shots fall; a ship parked under the rack is lost three times, then game over.
{
    const g = newGame();
    const bombs = () => [0, 4, 8].filter(i => g.memory[S.ASHOTS + i]).length;
    let seen = 0;
    const lives = [g.lives];
    for (let frames = 0; !g.over; frames++) {
        assert.ok(frames < 20000, "game never ended");
        const parked = g.memory[S.PX] >= 100 || g.memory[S.PSTATE];
        tick(g, parked ? IDLE : RIGHT, { bombs: false });
        seen = Math.max(seen, bombs());
        if (g.lives !== lives.at(-1)) lives.push(g.lives);
    }
    assert.ok(seen >= 1, "alien shots appeared");
    assert.deepEqual(lives, [3, 2, 1, 0]);
    assert.equal(g.memory[0x2000], 2);
    const memory = g.memory.slice();
    step(g, FIRE, 1);
    assert.deepEqual(g.memory, memory, "step is a no-op after game over");
}

// The UFO crosses from the left on an even shot count, with its loop sound.
{
    const g = newGame();
    g.memory[S.UFOTMR] = 1;
    g.memory[S.UFOTMR + 1] = 0;
    tick(g, IDLE, { ufo: false });
    assert.equal(g.memory[S.UFOON], 1);
    assert.equal(g.memory[S.UFOX], 8);
    for (let i = 0; i < 300 && g.memory[S.UFOON]; i++) tick(g);
    assert.equal(g.memory[S.UFOON], 0, "UFO left the screen");
    assert.ok(
        g.events.some(e => e.port === 3 && e.value & 1),
        "UFO sound"
    );
}

// No UFO with fewer than 8 aliens.
{
    const g = newGame();
    g.memory.fill(0, 0x2010 + 7, 0x2010 + 55);
    run(g, 60);
    g.memory[S.UFOTMR] = 1;
    g.memory[S.UFOTMR + 1] = 0;
    run(g, 2, IDLE, { ufo: false });
    assert.equal(g.memory[S.UFOON], 0);
}

// UFO score follows the 16-entry table by shot count.
const UFO_TABLE = [10, 5, 5, 10, 15, 10, 10, 5, 30, 10, 10, 10, 5, 15, 10, 5];
UFO_TABLE.forEach((tens, count) => {
    const g = newGame();
    g.memory[S.UFOTMR] = 1;
    g.memory[S.UFOTMR + 1] = 0;
    tick(g, IDLE, { ufo: false });
    g.memory[S.SHOTCNT] = count;
    g.memory[S.SHOTON] = 1;
    g.memory[S.SHOTX] = g.memory[S.UFOX] + 8;
    g.memory[S.SHOTY] = 52;
    const before = g.score;
    for (let i = 0; i < 60 && g.memory[S.UFOON] !== 3; i++) tick(g);
    assert.equal(g.score - before, tens * 10, `shot count ${count}`);
    assert.deepEqual(g.ufoPoints, {
        x: g.memory[S.UFOX],
        y: 40,
        points: tens * 10,
    });
    run(g, 65);
    assert.equal(g.ufoPoints, null);
});

// A shot that hits the UFO's score bursts there instead of vanishing.
{
    const g = newGame();
    g.memory[S.UFOTMR] = 1;
    g.memory[S.UFOTMR + 1] = 0;
    tick(g, IDLE, { ufo: false });
    g.memory.set([1, g.memory[S.UFOX] + 8, 52], S.SHOTON);
    for (let i = 0; i < 60 && g.memory[S.UFOON] !== 3; i++) tick(g);
    assert.equal(g.memory[S.UFOON], 3, "score shown");
    g.memory.set([1, g.memory[S.UFOX] + 11, 56], S.SHOTON);
    let burst = 0;
    for (let i = 0; i < 10 && g.memory[S.SHOTON]; i++) {
        tick(g);
        burst = Math.max(burst, g.memory[S.SBT]);
    }
    assert.ok(burst > 0, "burst on the score");
}

console.log("quorzak: ok");
