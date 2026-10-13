// Run: node --experimental-strip-types tests/quorzak.check.ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { assemble } from "../tools/asm8080.ts";
import { ROM, SYMBOLS } from "../src/game/rom.ts";
import { W, litPixel, newGame } from "../src/game/machine.ts";

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

console.log("quorzak: ok");
