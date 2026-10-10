import type { Cpu8080, CpuState } from "./cpu8080.js";
import { createCpu8080 } from "./cpu8080.js";
import { ROM } from "./rom.ts";

export const W = 224;
export const H = 256;
export const FIELD_TOP = 32;
export const FIELD_BOTTOM = 240;
export const COLS = 11;
export const ROWS = 5;
export const FRAME_S = (320 * 262) / (19968000 / 4);
// The rotated CRT is displayed at 3:4; its physical pixels are not square.
export const PIXEL_ASPECT = 7 / 6;

export interface Input {
    left: boolean;
    right: boolean;
    fire: boolean;
}
export interface Invader {
    x: number;
    y: number;
    row: number;
    alive: boolean;
}
export interface SoundEvent {
    port: number;
    value: number;
}
export interface Game {
    cpu: Cpu8080;
    memory: Uint8Array;
    controls: number;
    shift: number;
    shiftOffset: number;
    deadline: number;
    elapsed: number;
    invaders: Invader[];
    score: number;
    lives: number;
    wave: number;
    over: boolean;
    events: SoundEvent[];
    sound: number[];
    ufoPoints: { x: number; y: number; points: number } | null;
}

let boot:
    | (Pick<Game, "memory" | "shift" | "shiftOffset" | "deadline" | "sound"> & {
          cpu: CpuState;
      })
    | null = null;

const bcd = (value: number) => (value >> 4) * 10 + (value & 15);

const readState = (g: Game) => {
    const m = g.memory;
    g.score = bcd(m[0x20f8]) + bcd(m[0x20f9]) * 100;
    g.lives = m[0x21ff] + Number(m[0x2015] === 0xff && m[0x20e7] !== 0);
    g.wave = m[0x21fe] + 1;
    g.over = m[0x20e7] === 0;
    const x = m[0x200a] - 32;
    const y = 248 - m[0x2009];
    g.invaders.forEach((invader, i) => {
        invader.x = x + (i % COLS) * 16;
        invader.y = y - Math.floor(i / COLS) * 16;
        invader.row = 4 - Math.floor(i / COLS);
        invader.alive = m[0x2100 + i] !== 0;
    });
    const scorePointer = m[0x2087] | (m[0x2088] << 8);
    g.ufoPoints =
        m[0x2085] && scorePointer >= 0x1d94 && scorePointer <= 0x1d9d
            ? {
                  x: (m[0x208a] & 0xf8) - 32,
                  y: 40,
                  points: [50, 100, 150, 300][(scorePointer - 0x1d94) / 3],
              }
            : null;
};

const frame = (g: Game) => {
    // IRQs occur at scanlines 96 and 224; the crystal also clocks the 8080 / 10.
    for (const [cycles, vector] of [
        [96 * 128, 8],
        [128 * 128, 16],
        [38 * 128, 0],
    ]) {
        g.deadline += cycles;
        if (g.deadline > g.cpu.T()) g.cpu.steps(g.deadline - g.cpu.T());
        if (vector) g.cpu.interrupt(vector);
    }
};

export const newGame = (): Game => {
    const memory = new Uint8Array(0x4000);
    memory.set(ROM);
    const g: Game = {
        cpu: createCpu8080(),
        memory,
        controls: 8,
        shift: 0,
        shiftOffset: 0,
        deadline: 0,
        elapsed: 0,
        invaders: Array.from({ length: ROWS * COLS }, () => ({
            x: 0,
            y: 0,
            row: 0,
            alive: false,
        })),
        score: 0,
        lives: 3,
        wave: 1,
        over: false,
        events: [],
        sound: [0, 0],
        ufoPoints: null,
    };
    g.cpu.init(
        (address, value) => {
            if ((address & 0x3fff) >= 0x2000) memory[address & 0x3fff] = value;
        },
        address => memory[address & 0x3fff],
        () => {},
        (port, value) => {
            if (port === 2) g.shiftOffset = value & 7;
            if (port === 4) g.shift = (value << 8) | (g.shift >> 8);
            if (port === 3 || port === 5) {
                g.sound[port === 3 ? 0 : 1] = value;
                g.events.push({ port, value });
            }
        },
        port =>
            port === 1
                ? g.controls
                : port === 2
                  ? 0
                  : port === 3
                    ? (g.shift >> (8 - g.shiftOffset)) & 255
                    : 0x0e
    );
    if (boot) {
        memory.set(boot.memory);
        g.cpu.restore(boot.cpu);
        g.shift = boot.shift;
        g.shiftOffset = boot.shiftOffset;
        g.deadline = boot.deadline;
        g.sound = [...boot.sound];
    } else {
        // Capture the native coin/start boot once, including pending interrupts.
        for (let i = 0; i < 120; i++) frame(g);
        g.controls |= 1;
        frame(g);
        g.controls &= ~1;
        for (let i = 0; i < 120 && !memory[0x2093]; i++) frame(g);
        g.controls |= 4;
        for (let i = 0; i < 240 && !(memory[0x20ef] && memory[0x20e9]); i++)
            frame(g);
        g.controls = 8;
        boot = {
            memory: memory.slice(),
            cpu: g.cpu.save(),
            shift: g.shift,
            shiftOffset: g.shiftOffset,
            deadline: g.deadline,
            sound: [...g.sound],
        };
    }
    g.events.length = 0;
    readState(g);
    return g;
};

export const step = (g: Game, input: Input, dt: number): void => {
    if (g.over) return;
    g.controls =
        8 |
        (Number(input.fire) << 4) |
        (Number(input.left) << 5) |
        (Number(input.right) << 6);
    g.elapsed += dt;
    while (g.elapsed + 1e-9 >= FRAME_S) {
        frame(g);
        g.elapsed -= FRAME_S;
    }
    readState(g);
};

// MAME's invaders.lay overlay is attached to the screen, not individual objects.
export const pixelColor = (x: number, y: number): string =>
    y >= 32 && y < 62
        ? "#ff2020"
        : (y >= 184 && y < 240) || (y >= 240 && x >= 16 && x < 134)
          ? "#20ff20"
          : "#ffffff";
export const litPixel = (g: Game, x: number, y: number): boolean =>
    Boolean(
        g.memory[0x2400 + x * 32 + ((255 - y) >> 3)] & (1 << ((255 - y) & 7))
    );
