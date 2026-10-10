// Run: node --experimental-strip-types tests/invaders.check.ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
    FRAME_S,
    H,
    litPixel,
    newGame,
    PIXEL_ASPECT,
    pixelColor,
    step,
    W,
} from "../src/game/invaders.ts";
import { ROM } from "../src/game/rom.ts";
import { createCpu8080 } from "../src/game/cpu8080.js";
import { createHash } from "node:crypto";
import {
    ALIEN_EXPLOSION,
    ALIEN_SHOTS,
    ALIEN_SPRITES,
    BOMB_EXPLOSION,
    BUNKER,
    PLAYER,
    PLAYER_EXPLOSION,
    PLAYER_SHOT,
    SCORE_GLYPHS,
    SHOT_EXPLOSION,
    UFO,
    UFO_EXPLOSION,
} from "../src/game/sprites.ts";
import type { Game } from "../src/game/invaders.ts";

const idle = { left: false, right: false, fire: false };

const reference: {
    initialMemorySha256: string;
    initialStateSha256: string;
    trajectories: { mode: string; sha256: string; finalStateSha256: string }[];
} = JSON.parse(
    readFileSync(
        new URL(
            "./fixtures/space-invaders-initialization.json",
            import.meta.url
        ),
        "utf8"
    )
);
const gameHash = (g: Game) =>
    createHash("sha256")
        .update(
            JSON.stringify({
                memorySha256: createHash("sha256")
                    .update(g.memory)
                    .digest("hex"),
                cpu: g.cpu.status(),
                cycles: g.cpu.T(),
                controls: g.controls,
                shift: g.shift,
                shiftOffset: g.shiftOffset,
                deadline: g.deadline,
                elapsed: g.elapsed,
                score: g.score,
                lives: g.lives,
                wave: g.wave,
                over: g.over,
                sound: g.sound,
                invaders: g.invaders,
                ufoPoints: g.ufoPoints,
            })
        )
        .digest("hex");

// Independent reference bytes transcribed from the disassembly, not the renderer.
const rom = new Map<number, number>();
for (const line of readFileSync(
    new URL("./fixtures/space-invaders-1978.hex", import.meta.url),
    "utf8"
)
    .trim()
    .split("\n")) {
    const [address, bytes] = line.split(": ");
    bytes
        .split(" ")
        .forEach((byte, i) =>
            rom.set(parseInt(address, 16) + i, parseInt(byte, 16))
        );
}
const checkPixels = (
    rows: string[],
    address: number,
    width: number,
    height = 8
) => {
    assert.equal(rows.length, height);
    for (let y = 0; y < height; y++) {
        assert.equal(rows[y].length, width);
        for (let x = 0; x < width; x++) {
            const bit = height - 1 - y;
            const byte = rom.get(
                address + x * (height / 8) + Math.floor(bit / 8)
            )!;
            assert.equal(
                rows[y][x],
                byte & (1 << (bit % 8)) ? "X" : ".",
                `ROM $${address.toString(16)} at ${x},${y}`
            );
        }
    }
};
for (const [type, address] of [0x1c20, 0x1c10, 0x1c00].entries()) {
    checkPixels(ALIEN_SPRITES[type][0], address, 16);
    checkPixels(ALIEN_SPRITES[type][1], address + 0x30, 16);
}
checkPixels(PLAYER, 0x1c60, 16);
checkPixels(PLAYER_EXPLOSION[0], 0x1c70, 16);
checkPixels(PLAYER_EXPLOSION[1], 0x1c80, 16);
checkPixels(PLAYER_SHOT, 0x1c90, 1);
checkPixels(SHOT_EXPLOSION, 0x1c91, 8);
checkPixels(ALIEN_EXPLOSION, 0x1cc0, 16);
checkPixels(BOMB_EXPLOSION, 0x1cdc, 6);
checkPixels(BUNKER, 0x1d20, 22, 16);
checkPixels(UFO, 0x1d64, 24);
checkPixels(UFO_EXPLOSION, 0x1d7c, 24);
for (const [kind, address] of [
    ["rolling", 0x1cee],
    ["plunger", 0x1ce2],
    ["squiggly", 0x1cd0],
] as const)
    ALIEN_SHOTS[kind].forEach((rows, frame) =>
        checkPixels(rows, address + frame * 3, 3)
    );
for (let i = 0; i < 10; i++)
    checkPixels(SCORE_GLYPHS[String(i)], 0x1ed0 + i * 8, 8);
checkPixels(SCORE_GLYPHS[" "], 0x1f30, 8);

// Each ROM chip must match the original invaders set registered by MAME.
for (const [i, sha1] of [
    "ff6200af4c9110d8181249cbcef1a8a40fa40b7f",
    "16f48649b531bdef8c2d1446c429b5f414524350",
    "537aef03468f63c5b9e11dd61e253f7ae17d9743",
    "1d6ca0c99f9df71e2990b610deb9d7da0125e2d8",
].entries())
    assert.equal(
        createHash("sha1")
            .update(ROM.slice(i * 2048, (i + 1) * 2048))
            .digest("hex"),
        sha1
    );
assert.equal(W / (H * PIXEL_ASPECT), 3 / 4);
assert.equal(pixelColor(0, 32), "#ff2020");
assert.equal(pixelColor(0, 62), "#ffffff");
assert.equal(pixelColor(0, 184), "#20ff20");
assert.equal(pixelColor(0, 240), "#ffffff");
assert.equal(pixelColor(16, 240), "#20ff20");

const g = newGame();
assert.equal(
    createHash("sha256").update(g.memory).digest("hex"),
    reference.initialMemorySha256,
    "cold boot memory matches the pre-optimization program"
);
assert.equal(gameHash(g), reference.initialStateSha256);
const initialCpu = g.cpu.save();
const cached = newGame();
assert.equal(gameHash(cached), reference.initialStateSha256);
assert.deepEqual(cached.cpu.save(), initialCpu);
cached.memory.fill(0);
cached.sound.fill(255);
cached.invaders[0].x = -100;
cached.cpu.set("PC", 0xffff);
const pristine = newGame();
assert.equal(
    gameHash(pristine),
    reference.initialStateSha256,
    "mutating a game cannot corrupt the private boot snapshot"
);
assert.deepEqual(pristine.cpu.save(), initialCpu);
assert.equal(g.score, 0);
assert.equal(g.lives, 3);
assert.equal(g.invaders.filter(inv => inv.alive).length, 55);
assert.equal(g.invaders[0].x, 24);
assert.equal(g.invaders[0].y, 128);
assert.equal(g.memory[0x20ef], 1);
const tick = (game = g, frames = 1, input = idle) => {
    for (let i = 0; i < frames; i++) step(game, input, FRAME_S);
};
tick(g, 160);
assert.ok(
    litPixel(g, 24, 216),
    "the native cannon is drawn after its starting delay"
);
const player = g.memory[0x201b];
tick(g, 10, { ...idle, right: true });
assert.equal(
    g.memory[0x201b],
    player + 10,
    "cannon moves one pixel per refresh"
);
tick(g, 300, { ...idle, left: true });
assert.equal(g.memory[0x201b], 48, "original left travel limit");
tick(g, 1, { ...idle, fire: true });
assert.notEqual(g.memory[0x2025], 0, "native shot task starts");
assert.ok(
    g.events.some(event => event.port === 3 && event.value & 2),
    "shot raises native sound bit"
);
const a = newGame(),
    b = newGame();
for (let i = 0; i < 900; i++) {
    const input = {
        fire: i % 100 < 50,
        left: i % 240 < 80,
        right: i % 240 > 160,
    };
    tick(a, 1, input);
    tick(b, 1, input);
}
assert.deepEqual(
    a.memory,
    b.memory,
    "native firing and scores are deterministic"
);
assert.equal(a.cpu.T(), b.cpu.T());
assert.ok(
    a.cpu.T() - a.deadline >= 0 && a.cpu.T() - a.deadline < 20,
    "instruction overrun carries into the next beam interval"
);

// Clear a rack through the original alien-status bank; the ROM must start another.
const next = newGame();
tick(next, 160);
next.memory.fill(0, 0x2100, 0x2137);
tick(next, 300);
assert.equal(next.over, false);
assert.equal(next.wave, 2);
assert.equal(next.invaders.filter(inv => inv.alive).length, 55);
assert.equal(
    next.memory[0x21fc],
    0x60,
    "second-rack height comes from original table"
);

// Base instruction timings from MAME's Intel 8080 table, with taken-branch costs.
const timings: number[] = JSON.parse(
    readFileSync(
        new URL("./fixtures/intel8080-cycles.json", import.meta.url),
        "utf8"
    )
);
for (let opcode = 0; opcode < 256; opcode++) {
    for (const flags of [2, 0xd7]) {
        const memory = new Uint8Array(65536);
        memory[0] = opcode;
        const cpu = createCpu8080();
        cpu.init(
            (address, value) => {
                memory[address] = value;
            },
            address => memory[address],
            () => {},
            () => {},
            () => 0
        );
        cpu.set("F", flags);
        const mask = [0x40, 0x40, 1, 1, 4, 4, 0x80, 0x80][(opcode >> 3) & 7];
        const taken = Boolean(flags & mask) === Boolean(opcode & 8);
        const conditional =
            (opcode & 0xc7) === 0xc0 || (opcode & 0xc7) === 0xc4;
        const call = [0xcd, 0xdd, 0xed, 0xfd].includes(opcode);
        cpu.steps(1);
        assert.equal(
            cpu.T(),
            timings[opcode] + ((conditional && taken) || call ? 6 : 0),
            `opcode $${opcode.toString(16)}, flags $${flags.toString(16)}`
        );
    }
}
const interruptMemory = new Uint8Array(65536);
interruptMemory.set([0xfb, 0x00]);
const interruptCpu = createCpu8080();
interruptCpu.init(
    (address, value) => {
        interruptMemory[address] = value;
    },
    address => interruptMemory[address],
    () => {},
    () => {},
    () => 0
);
interruptCpu.steps(1);
interruptCpu.interrupt(8);
assert.equal(
    interruptCpu.status().pc,
    1,
    "EI takes effect after the following instruction"
);
interruptCpu.steps(1);
interruptCpu.interrupt(8);
assert.equal(interruptCpu.status().pc, 8);
assert.equal(interruptCpu.T(), 19);
interruptCpu.interrupt(16);
assert.equal(
    interruptCpu.status().pc,
    8,
    "acknowledging an interrupt disables interrupts"
);
interruptCpu.init(
    (address, value) => {
        interruptMemory[address] = value;
    },
    address => interruptMemory[address],
    () => {},
    () => {},
    () => 0
);
interruptMemory.set([0xfb, 0x00, 0x76]);
interruptCpu.steps(1);
const pendingEi = interruptCpu.save();
interruptCpu.steps(1);
interruptCpu.interrupt(8);
interruptCpu.restore(pendingEi);
interruptCpu.interrupt(8);
assert.equal(interruptCpu.status().pc, 1, "restore retains delayed EI");
interruptCpu.steps(1);
interruptCpu.steps(1);
const halted = interruptCpu.save();
assert.equal(halted.halted, 1);
interruptCpu.interrupt(8);
interruptCpu.restore(halted);
interruptCpu.steps(3);
assert.equal(interruptCpu.status().pc, halted.pc, "restore retains HALT");
assert.equal(interruptCpu.T(), halted.cycles + 3);
interruptCpu.interrupt(16);
assert.equal(interruptCpu.status().pc, 16, "restored HALT accepts interrupts");

for (const expected of reference.trajectories) {
    const game = newGame();
    const digest = createHash("sha256");
    for (let i = 0; i < 900; i++) {
        step(
            game,
            {
                fire:
                    expected.mode === "fire" ||
                    (expected.mode === "moving" && i % 100 < 50),
                left: expected.mode === "moving" && i % 240 < 80,
                right: expected.mode === "moving" && i % 240 > 160,
            },
            FRAME_S
        );
        digest.update(game.memory);
        digest.update(
            JSON.stringify({
                cpu: game.cpu.status(),
                cycles: game.cpu.T(),
                events: game.events,
                sound: game.sound,
            })
        );
        game.events.length = 0;
    }
    assert.equal(
        digest.digest("hex"),
        expected.sha256,
        `${expected.mode}: every frame matches pre-optimization memory, CPU and sound`
    );
    assert.equal(gameHash(game), expected.finalStateSha256);
}
console.log(
    "invaders: ROM hashes, sprite pixels, original controls, deterministic gameplay, next rack, CRT proportions, CPU timings, boot snapshots and pre-optimization trajectories passed"
);
