# Quorzak

Quorzak is an original fixed shooter written in Intel 8080 assembly for the cabinet
the arcade section emulates. Its rules follow the 1978 genre classic as closely as
possible; every piece of expression is new: program code, sprite bitmaps, the in-ROM
digits, sound, on-screen text and the name. No Midway or Taito code, data, samples or
artwork is in this repository.

| Kept from the genre (ideas and hardware)                     | Original to Quorzak (expression)                             |
| ------------------------------------------------------------ | ------------------------------------------------------------ |
| 8080 CPU, memory map, ports, shift register, interrupts      | Program code, written from scratch in `src/game/quorzak.asm` |
| Rules: 11×5 rack, ripple march, shields, UFO, scoring, lives | Sprites (Spire, Twin, Dome, ship, UFO, shields, bursts)      |
| Coloured-cellophane bands                                    | In-ROM digits, synthesized sounds, title and HUD text        |

## Build and checks

```bash
npm run rom                                            # assemble quorzak.asm into rom.ts
node --experimental-strip-types tests/asm8080.check.ts # assembler: 244 opcodes, syntax, errors
node --experimental-strip-types tests/quorzak.check.ts # ROM behaviour, headless
```

`tools/asm8080.ts` is a dependency-free two-pass assembler: labels, `.local` labels
scoped to the last global label, `EQU`, `ORG`, `DB`, `DW`, `DS`, `PUBLIC`, expressions
with `+ - * / & | << >>`, `LOW()`, `HIGH()` and `$`. `PUBLIC` names are exported from
`src/game/rom.ts` as `SYMBOLS`; `sprites.ts` and the checks read sprites and RAM
addresses through them. `quorzak.check.ts` fails when `rom.ts` is stale.

The browser checks (`tests/*.check.mjs`) need Vite and Chromium started with
`--remote-debugging-port=9222`; each takes the site URL as its argument.

## Cabinet contract

- ROM `$0000–$1FFF`, work RAM `$2000–$23FF`, VRAM `$2400–$3FFF`, addresses mirrored with
  `& $3FFF`; writes below `$2000` are ignored.
- VRAM column `x` (upright screen) is 32 bytes; pixel `(x, y)` is bit `(255 - y) & 7` of
  byte `$2400 + x*32 + ((255 - y) >> 3)`.
- `newGame()` cold-boots the ROM once per page load (about 2 ms of emulation) and keeps
  the booted machine in memory; every later game copies it (about 0.04 ms). The snapshot
  is taken from the ROM in use, so it cannot go stale.
- The CPU runs at `19,968,000 / 10` Hz; a frame is `320 × 262 / (19,968,000 / 4)`
  seconds, about 59.542 Hz. `RST 1` is raised at scanline 96 and `RST 2` at 224.
- `RST 1` runs the whole game tick. `RST 2` only re-enables interrupts.
  `machine.ts` ends each frame as `RST 1` is raised, so a step executes one complete
  tick and the UI never samples VRAM halfway through one. Under busy play the median
  tick is about 11k of the frame's 33.5k cycles and the heaviest about 18k (54%); a wave
  change wipes the screen over seven ticks (four VRAM quarters, the ground, two shields,
  then two shields and the wave state). `tests/quorzak.check.ts` keeps every tick under
  26k cycles.

| Port | Direction | Meaning                                                                       |
| ---- | --------- | ----------------------------------------------------------------------------- |
| 1    | in        | bit 3 always 1, bit 4 fire, bit 5 left, bit 6 right                           |
| 2    | out       | shift amount (0–7)                                                            |
| 4    | out       | shift data (new byte enters high, old high moves low)                         |
| 3    | in        | `(shift >> (8 - amount)) & 255`                                               |
| 3    | out       | bit 0 UFO loop, 1 shot, 2 ship hit, 3 alien hit, 4 extra ship, 5 sound enable |
| 5    | out       | bits 0–3 march notes, bit 4 UFO hit                                           |

The embedded CPU comes from [Martin Maly's 8080js](https://github.com/maly/8080js),
commit `c2a02472f806405295f89bdec1a3706d7fc12efb`, retaining its MIT/BSD notices
in `public/licenses/8080js.txt`. Its wrapper was changed to a per-game ES module
factory. Interrupt acknowledgement, delayed EI and instruction cycle counts were
corrected to Intel timings. All 256 opcodes are checked against the
[MAME Intel 8080 timing table](https://github.com/mamedev/mame/blob/master/src/devices/cpu/i8085/i8085.cpp).
The independent [8080PRE diagnostic](https://github.com/superzazu/8080/tree/master/cpu_tests)
also completed successfully.

## RAM

Public status block, read by `src/game/machine.ts`:

| Address           | Content                                                   |
| ----------------- | --------------------------------------------------------- |
| `$2000`           | mode: 1 playing, 2 game over                              |
| `$2001` / `$2002` | score, BCD low / high                                     |
| `$2003`           | ships left, including the one in play                     |
| `$2004`           | wave, from 1                                              |
| `$2005` / `$2006` | rack x (column 0) / top y of the bottom row               |
| `$2007` / `$2008` | UFO score ÷ 10 while shown (else 0) / its x               |
| `$2010–$2046`     | 55 alien flags, index `row*11 + col`, row 0 at the bottom |

Private state from `$2050` (ship, shots, rack cursor and step, timers, alien shot
records at `$2070`) is defined by the `EQU` block at the top of `quorzak.asm`. The stack
grows down from `$2400`.

## Sprites and drawing

Sprites are one byte per column, bit 7 the top row, 8 rows tall. `BLIT` takes the data
in HL, the width in B and the top-left `(x, y)` in D and E; `BLITOP` selects OR (draw),
AND NOT (erase) or a test that sets `HIT` when any pixel overlaps. The shift register
places a sprite at any `y`; `x` is column exact. Aliens use 16-column cells with their
pixels in columns 2–13.

## Gameplay

- Rack: 11 columns × 5 rows in 16×16 cells; rows 0–1 Dome (10), 2–3 Twin (20), row 4
  Spire (30). A wave starts empty and its first pass draws one alien per tick in place.
- March: one live alien moves 2 px per tick; a pass ends when all have moved, and the
  next tick starts a new pass (wave clear, invasion, edges, frame, march note). The last
  alien moves 3 px right. At the walls the rack drops 8 px and turns. The rack waits
  while an alien or the ship explodes.
- Wave start heights (top y of row 0): `128, 144, 152, 160, 160, 168, 168, 168`, so the
  top row stays below the red band (y 32–61), where only the UFO flies.
- Ship: y 216, x 16–185, 1 px per tick. One shot at a time, 4 px per tick; each shot
  needs a new press. A shot ending at the top, on a shield or against an alien shot
  bursts for 16 ticks, and no new shot fires until the burst is erased (erasing it
  dents shields).
- Alien shots: twist (column above the ship), bolt and beads (columns from a 16-entry
  table), one of each at most. They take turns, one per tick: on its turn a shot moves
  4 px (5 px with 8 aliens or fewer), or fires if it is idle. As in the original, the
  reload rate counts steps, not ticks: a shot fires only when every other shot in flight
  has made more steps than the rate, and a new shot starts at one step. The rate is 48
  steps up to 299 points, then 16, 11, 8 and 7 from 300, 1,100, 2,100 and 3,100 points,
  so below 300 points only one alien shot is in flight. The twist skips its first firing
  turn after each shot and at a wave's start. Aliens hold fire for 48 ticks after a ship
  respawns. A shot ending on a shield or the ground bursts and dents it.
- UFO: every 1,536 ticks with at least 8 aliens, from the left on an even shot count.
  Like the original's saucer, it shares a task with the beads shot: it waits for a beads
  shot to end, and no beads shot fires while it is due or on screen.
  Its score cycles `100 50 50 100 150 100 100 50 300 100 100 100 50 150 100 50` by shot
  count and shows for 64 ticks.
- One extra ship at 1,500 points. The game ends with no ships left or when the rack's
  bottom row reaches the ship row (top y 216).

## Fonts

The HTML UI uses Patrick H. Lauke's "Space Invaders (extended)" FontStruction, CC BY
3.0, kept unchanged with its `license.txt` and `readme.txt` in `public/fonts/quorzak/`
and loaded as the `"Quorzak"` family. The ROM's digits (UFO score) are an original 5×7
design with 1 px strokes.
