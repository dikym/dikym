// Run: node --experimental-strip-types tests/asm8080.check.ts
import assert from "node:assert/strict";
import { assemble } from "../tools/asm8080.ts";

const R = ["B", "C", "D", "E", "H", "L", "M", "A"];
const P = ["B", "D", "H", "SP"];
const Q = ["B", "D", "H", "PSW"];
const CC = ["NZ", "Z", "NC", "C", "PO", "PE", "P", "M"];
const ALU = ["ADD", "ADC", "SUB", "SBB", "ANA", "XRA", "ORA", "CMP"];
const ALUI = ["ADI", "ACI", "SUI", "SBI", "ANI", "XRI", "ORI", "CPI"];

// Independent opcode table; undefined marks the 12 undocumented opcodes.
const source = (op: number): string | undefined => {
    const r = (op >> 3) & 7;
    const s = op & 7;
    const p = (op >> 4) & 3;
    if (op >= 0x40 && op < 0x80)
        return op === 0x76 ? "HLT" : `MOV ${R[r]},${R[s]}`;
    if (op >= 0x80 && op < 0xc0) return `${ALU[r]} ${R[s]}`;
    if (op < 0x40)
        return [
            op === 0 ? "NOP" : undefined,
            op & 8 ? `DAD ${P[p]}` : `LXI ${P[p]},$1234`,
            [
                "STAX B",
                "LDAX B",
                "STAX D",
                "LDAX D",
                "SHLD $1234",
                "LHLD $1234",
                "STA $1234",
                "LDA $1234",
            ][r],
            op & 8 ? `DCX ${P[p]}` : `INX ${P[p]}`,
            `INR ${R[r]}`,
            `DCR ${R[r]}`,
            `MVI ${R[r]},$56`,
            ["RLC", "RRC", "RAL", "RAR", "DAA", "CMA", "STC", "CMC"][r],
        ][s];
    return [
        `R${CC[r]}`,
        op & 8
            ? [
                  undefined,
                  "RET",
                  undefined,
                  undefined,
                  undefined,
                  "PCHL",
                  undefined,
                  "SPHL",
              ][r]
            : `POP ${Q[p]}`,
        `J${CC[r]} $1234`,
        [
            "JMP $1234",
            undefined,
            "OUT $56",
            "IN $56",
            "XTHL",
            "XCHG",
            "DI",
            "EI",
        ][r],
        `C${CC[r]} $1234`,
        op & 8 ? (r === 1 ? "CALL $1234" : undefined) : `PUSH ${Q[p]}`,
        `${ALUI[r]} $56`,
        `RST ${r}`,
    ][s];
};

let defined = 0;
for (let op = 0; op < 256; op++) {
    const line = source(op);
    if (!line) continue;
    defined++;
    const operand = line.includes("$1234")
        ? [0x34, 0x12]
        : line.includes("$56")
          ? [0x56]
          : [];
    assert.deepEqual(
        [...assemble(`    ${line}\n`).bytes],
        [op, ...operand],
        line
    );
    assert.deepEqual(
        [...assemble(`    ${line.toLowerCase()}\n`).bytes],
        [op, ...operand],
        `lowercase ${line}`
    );
}
assert.equal(defined, 244);

const program = assemble(`
VALUE   EQU $10 + 2*3       ; comment with ; and , inside
        ORG $0100
start:  JMP later
.loop:  DCR B
        JNZ .loop
later:  MVI A,LOW(start) | HIGH($1234)
        LXI H,$ - start
        DB "A;B", 'C', -1, %101
        DW start, VALUE
        DS 2
other:  DB 0
.loop:  DB VALUE >> 1, (3 + 1) * 2, 0x0F & 6, 1 << 3
        PUBLIC start, other
`);
assert.deepEqual(
    [...program.bytes.subarray(0x100)],
    [
        0xc3, 0x07, 0x01, 0x05, 0xc2, 0x03, 0x01, 0x3e, 0x12, 0x21, 0x09, 0x00,
        0x41, 0x3b, 0x42, 0x43, 0xff, 0x05, 0x00, 0x01, 0x16, 0x00, 0x00, 0x00,
        0x00, 0x0b, 0x08, 0x06, 0x08,
    ]
);
assert.equal(program.symbols.get("start"), 0x100);
assert.equal(program.symbols.get("start.loop"), 0x103);
assert.equal(program.symbols.get("other"), 0x118);
assert.equal(program.symbols.get("other.loop"), 0x119);
assert.equal(program.symbols.get("VALUE"), 0x16);
assert.deepEqual(program.publics, ["start", "other"]);

for (const [text, message] of [
    ["  FOO A\n", /^source:1: unknown mnemonic: FOO$/],
    ["\n  JMP nowhere\n", /^source:2: undefined symbol: nowhere$/],
    ["a: NOP\na: NOP\n", /^source:2: duplicate label: a$/],
    ["  MVI A,256\n", /^source:1: byte out of range: 256$/],
    ["  MOV A,X\n", /^source:1: bad register: X$/],
    ["  MOV M,M\n", /^source:1: MOV M,M is HLT$/],
    ["  STAX H\n", /^source:1: STAX takes B or D$/],
    ["  NOP A\n", /^source:1: NOP expects 0 operand\(s\)$/],
    ["  ORG $1FFF\n  JMP 0\n", /^source:2: output beyond \$1FFF$/],
    ["  NOP\n  ORG 0\n  NOP\n", /^source:3: overlapping output at \$0000$/],
    ["  PUBLIC missing\n", /^source:1: undefined symbol: missing$/],
    [
        "a:\n.b: NOP\n  PUBLIC .b\n",
        /^source:3: PUBLIC needs a global label: .b$/,
    ],
    ["  DB 1 +\n", /^source:1: bad expression: 1 \+$/],
] as const)
    assert.throws(() => assemble(text), { message });

console.log("asm8080: ok");
