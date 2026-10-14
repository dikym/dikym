import { ROM, SYMBOLS } from "./rom.ts";

// ROM sprites are one byte per column, bit 7 = top row (docs/quorzak.md).
const sprite = (address: number, width: number): string[] =>
    Array.from({ length: 8 }, (_, y) =>
        Array.from(ROM.subarray(address, address + width), column =>
            column & (0x80 >> y) ? "X" : "."
        ).join("")
    );
const frames = (address: number) => [
    sprite(address, 16),
    sprite(address + 16, 16),
];

// Indexed like Invader.row: 0 is the top row.
export const ALIEN_SPRITES = [
    frames(SYMBOLS.SPIRE),
    frames(SYMBOLS.TWIN),
    frames(SYMBOLS.DOME),
];
// Twin's 11 drawn columns, for the alien that flies between page and game.
export const TWIN = ALIEN_SPRITES[1].map(rows =>
    rows.map(row => row.slice(2, 13))
);
export const PLAYER = sprite(SYMBOLS.SHIP, 13);
export const UFO = sprite(SYMBOLS.UFOGFX, 15);
export const SCORE_GLYPHS: Record<string, string[]> = Object.fromEntries(
    [..."0123456789 "].map((ch, i) => [ch, sprite(SYMBOLS.FONT + i * 8, 8)])
);

// One SVG path per sprite, shifted x columns: drawn without crispEdges it antialiases like
// the scaled game field, as Safari grows each crispEdges pixel outward and closes the gaps.
export const pixelPath = (rows: string[], x = 0) =>
    rows
        .flatMap((row, y) =>
            [...row.matchAll(/X+/g)].map(
                run =>
                    `M${x + run.index} ${y}h${run[0].length}v1h-${run[0].length}z`
            )
        )
        .join("");
