// Two-pass Intel 8080 assembler for src/game/quorzak.asm (see docs/quorzak.md).
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export interface Assembly {
    bytes: Uint8Array;
    symbols: Map<string, number>;
    publics: string[];
}

export class AsmError extends Error {}

function fail(message: string): never {
    throw new AsmError(message);
}

const REG = ["B", "C", "D", "E", "H", "L", "M", "A"];
const COND = ["NZ", "Z", "NC", "C", "PO", "PE", "P", "M"];
const IMPLIED: Record<string, number> = {
    NOP: 0x00,
    RLC: 0x07,
    RRC: 0x0f,
    RAL: 0x17,
    RAR: 0x1f,
    DAA: 0x27,
    CMA: 0x2f,
    STC: 0x37,
    CMC: 0x3f,
    HLT: 0x76,
    RET: 0xc9,
    XTHL: 0xe3,
    PCHL: 0xe9,
    XCHG: 0xeb,
    DI: 0xf3,
    SPHL: 0xf9,
    EI: 0xfb,
};
const ALU_R: Record<string, number> = {
    ADD: 0x80,
    ADC: 0x88,
    SUB: 0x90,
    SBB: 0x98,
    ANA: 0xa0,
    XRA: 0xa8,
    ORA: 0xb0,
    CMP: 0xb8,
};
const ALU_I: Record<string, number> = {
    ADI: 0xc6,
    ACI: 0xce,
    SUI: 0xd6,
    SBI: 0xde,
    ANI: 0xe6,
    XRI: 0xee,
    ORI: 0xf6,
    CPI: 0xfe,
};
const ADDR: Record<string, number> = {
    JMP: 0xc3,
    CALL: 0xcd,
    SHLD: 0x22,
    LHLD: 0x2a,
    STA: 0x32,
    LDA: 0x3a,
};
COND.forEach((cc, i) => {
    ADDR[`J${cc}`] = 0xc2 | (i << 3);
    ADDR[`C${cc}`] = 0xc4 | (i << 3);
    IMPLIED[`R${cc}`] = 0xc0 | (i << 3);
});

// Calls `visit` for every character outside quotes; returning true stops the scan.
const scan = (text: string, visit: (ch: string, i: number) => boolean) => {
    let quote = "";
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (quote) {
            if (ch === quote) quote = "";
        } else if (ch === '"' || ch === "'") quote = ch;
        else if (visit(ch, i)) return;
    }
};

const stripComment = (line: string) => {
    let end = line.length;
    scan(line, (ch, i) => {
        if (ch !== ";") return false;
        end = i;
        return true;
    });
    return line.slice(0, end);
};

const splitOperands = (text: string) => {
    if (!text.trim()) return [];
    const parts: string[] = [];
    let start = 0;
    scan(text, (ch, i) => {
        if (ch === ",") {
            parts.push(text.slice(start, i).trim());
            start = i + 1;
        }
        return false;
    });
    parts.push(text.slice(start).trim());
    return parts;
};

const TOKEN =
    /^('.'|\$[0-9A-Fa-f]+|0x[0-9A-Fa-f]+|%[01]+|\d+|[.A-Za-z_][\w.]*|<<|>>|[-+*/&|()$])\s*/;

const evaluate = (
    text: string,
    pc: number,
    lookup: (name: string) => number | undefined
): number => {
    const tokens: string[] = [];
    let rest = text.trim();
    while (rest) {
        const match = TOKEN.exec(rest);
        if (!match) fail(`bad expression: ${text}`);
        tokens.push(match[1]);
        rest = rest.slice(match[0].length);
    }
    let i = 0;
    const primary = (): number => {
        const token = tokens[i++];
        if (token === undefined) fail(`bad expression: ${text}`);
        if (token === "(") {
            const value = or();
            if (tokens[i++] !== ")") fail(`bad expression: ${text}`);
            return value;
        }
        if (token === "-") return -primary();
        if (token === "$") return pc;
        if (token.startsWith("'")) return token.charCodeAt(1);
        if (token.startsWith("$")) return parseInt(token.slice(1), 16);
        if (token.startsWith("0x")) return parseInt(token.slice(2), 16);
        if (token.startsWith("%")) return parseInt(token.slice(1), 2);
        if (/^\d/.test(token)) return parseInt(token, 10);
        const upper = token.toUpperCase();
        if ((upper === "LOW" || upper === "HIGH") && tokens[i] === "(") {
            const value = primary();
            return upper === "LOW" ? value & 0xff : (value >> 8) & 0xff;
        }
        const value = lookup(token);
        if (value === undefined) fail(`undefined symbol: ${token}`);
        return value;
    };
    const binary = (next: () => number, ops: string[]) => (): number => {
        let value = next();
        while (ops.includes(tokens[i])) {
            const op = tokens[i++];
            const right = next();
            if (op === "+") value += right;
            else if (op === "-") value -= right;
            else if (op === "*") value *= right;
            else if (op === "/") value = Math.trunc(value / right);
            else if (op === "&") value &= right;
            else if (op === "|") value |= right;
            else if (op === "<<") value <<= right;
            else value >>= right;
        }
        return value;
    };
    const or: () => number = binary(
        binary(
            binary(binary(binary(primary, ["*", "/"]), ["+", "-"]), [
                "<<",
                ">>",
            ]),
            ["&"]
        ),
        ["|"]
    );
    const value = or();
    if (i !== tokens.length) fail(`bad expression: ${text}`);
    return value;
};

const encode = (
    mnemonic: string,
    ops: string[],
    value: (text: string) => number
): number[] => {
    const want = (count: number) => {
        if (ops.length !== count)
            fail(`${mnemonic} expects ${count} operand(s)`);
    };
    const reg = (text: string) => {
        const r = REG.indexOf(text.toUpperCase());
        if (r < 0) fail(`bad register: ${text}`);
        return r;
    };
    const pair = (text: string, last: "SP" | "PSW") => {
        const p = ["B", "D", "H", last].indexOf(text.toUpperCase());
        if (p < 0) fail(`bad register pair: ${text}`);
        return p;
    };
    const byte = (text: string) => {
        const v = value(text);
        if (v < -128 || v > 255) fail(`byte out of range: ${text}`);
        return v & 0xff;
    };
    const word = (text: string) => {
        const v = value(text);
        if (v < -32768 || v > 0xffff) fail(`word out of range: ${text}`);
        return [v & 0xff, (v >> 8) & 0xff];
    };
    if (mnemonic in IMPLIED) {
        want(0);
        return [IMPLIED[mnemonic]];
    }
    if (mnemonic in ALU_R) {
        want(1);
        return [ALU_R[mnemonic] | reg(ops[0])];
    }
    if (mnemonic in ALU_I) {
        want(1);
        return [ALU_I[mnemonic], byte(ops[0])];
    }
    if (mnemonic in ADDR) {
        want(1);
        return [ADDR[mnemonic], ...word(ops[0])];
    }
    switch (mnemonic) {
        case "MOV": {
            want(2);
            const d = reg(ops[0]);
            const s = reg(ops[1]);
            if (d === 6 && s === 6) fail("MOV M,M is HLT");
            return [0x40 | (d << 3) | s];
        }
        case "MVI":
            want(2);
            return [0x06 | (reg(ops[0]) << 3), byte(ops[1])];
        case "INR":
            want(1);
            return [0x04 | (reg(ops[0]) << 3)];
        case "DCR":
            want(1);
            return [0x05 | (reg(ops[0]) << 3)];
        case "LXI":
            want(2);
            return [0x01 | (pair(ops[0], "SP") << 4), ...word(ops[1])];
        case "DAD":
            want(1);
            return [0x09 | (pair(ops[0], "SP") << 4)];
        case "INX":
            want(1);
            return [0x03 | (pair(ops[0], "SP") << 4)];
        case "DCX":
            want(1);
            return [0x0b | (pair(ops[0], "SP") << 4)];
        case "PUSH":
            want(1);
            return [0xc5 | (pair(ops[0], "PSW") << 4)];
        case "POP":
            want(1);
            return [0xc1 | (pair(ops[0], "PSW") << 4)];
        case "STAX":
        case "LDAX": {
            want(1);
            const p = pair(ops[0], "SP");
            if (p > 1) fail(`${mnemonic} takes B or D`);
            return [(mnemonic === "STAX" ? 0x02 : 0x0a) | (p << 4)];
        }
        case "IN":
            want(1);
            return [0xdb, byte(ops[0])];
        case "OUT":
            want(1);
            return [0xd3, byte(ops[0])];
        case "RST": {
            want(1);
            const n = value(ops[0]);
            if (n < 0 || n > 7) fail(`byte out of range: ${ops[0]}`);
            return [0xc7 | (n << 3)];
        }
    }
    return fail(`unknown mnemonic: ${mnemonic}`);
};

const LINE = /^\s*(?:([.A-Za-z_][\w.]*):)?\s*(?:([A-Za-z]+)(?:\s+(.*))?)?\s*$/;
const EQU = /^\s*([A-Za-z_]\w*)\s+EQU\s+(.+)$/i;
const hex4 = (value: number) =>
    "$" + value.toString(16).toUpperCase().padStart(4, "0");

export const assemble = (source: string, file = "source"): Assembly => {
    const lines = source.split("\n");
    const symbols = new Map<string, number>();
    const publics: string[] = [];
    const memory: number[] = [];
    let end = 0;
    for (const pass of [1, 2]) {
        let pc = 0;
        let scope = "";
        lines.forEach((raw, index) => {
            try {
                const qualify = (name: string) =>
                    name.startsWith(".") ? scope + name : name;
                // Pass 1 only sizes instructions, so forward references count as 0.
                const lookup = (name: string) => {
                    const v = symbols.get(qualify(name));
                    return v === undefined && pass === 1 ? 0 : v;
                };
                const strict = (text: string) =>
                    evaluate(text, pc, name => symbols.get(qualify(name)));
                const value = (text: string) => evaluate(text, pc, lookup);
                const text = stripComment(raw);
                const equ = EQU.exec(text);
                if (equ) {
                    if (pass === 1) {
                        if (symbols.has(equ[1]))
                            fail(`duplicate label: ${equ[1]}`);
                        symbols.set(equ[1], strict(equ[2]));
                    }
                    return;
                }
                const match = LINE.exec(text);
                if (!match) fail(`bad line: ${text.trim()}`);
                const [, label, rawMnemonic, operandText = ""] = match;
                if (label) {
                    if (!label.startsWith(".")) scope = label;
                    const name = qualify(label);
                    if (pass === 1) {
                        if (symbols.has(name)) fail(`duplicate label: ${name}`);
                        symbols.set(name, pc);
                    }
                }
                if (!rawMnemonic) return;
                const mnemonic = rawMnemonic.toUpperCase();
                const ops = splitOperands(operandText);
                if (mnemonic === "ORG") {
                    pc = strict(ops[0]);
                    return;
                }
                if (mnemonic === "DS") {
                    pc += strict(ops[0]);
                    return;
                }
                if (mnemonic === "PUBLIC") {
                    for (const name of ops) {
                        if (name.startsWith("."))
                            fail(`PUBLIC needs a global label: ${name}`);
                        if (pass === 2) {
                            if (!symbols.has(name))
                                fail(`undefined symbol: ${name}`);
                            publics.push(name);
                        }
                    }
                    return;
                }
                let bytes: number[];
                if (mnemonic === "DB")
                    bytes = ops.flatMap(op => {
                        if (op.startsWith('"'))
                            return [...op.slice(1, -1)].map(ch =>
                                ch.charCodeAt(0)
                            );
                        const v = value(op);
                        if (v < -128 || v > 255)
                            fail(`byte out of range: ${op}`);
                        return [v & 0xff];
                    });
                else if (mnemonic === "DW")
                    bytes = ops.flatMap(op => {
                        const v = value(op);
                        return [v & 0xff, (v >> 8) & 0xff];
                    });
                else bytes = encode(mnemonic, ops, value);
                if (pc + bytes.length > 0x2000) fail("output beyond $1FFF");
                if (pass === 2)
                    bytes.forEach((byte, offset) => {
                        if (memory[pc + offset] !== undefined)
                            fail(`overlapping output at ${hex4(pc + offset)}`);
                        memory[pc + offset] = byte;
                    });
                pc += bytes.length;
                end = Math.max(end, pc);
            } catch (error) {
                if (error instanceof AsmError)
                    throw new AsmError(
                        `${file}:${index + 1}: ${error.message}`
                    );
                throw error;
            }
        });
    }
    return {
        bytes: Uint8Array.from({ length: end }, (_, i) => memory[i] ?? 0),
        symbols,
        publics,
    };
};

export const toModule = (
    { bytes, symbols, publics }: Assembly,
    input: string
): string => {
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0"));
    const rows: string[] = [];
    for (let i = 0; i < hex.length; i += 32)
        rows.push(hex.slice(i, i + 32).join(""));
    const names = publics.map(
        name =>
            `    ${name}: 0x${symbols.get(name)!.toString(16).padStart(4, "0")},`
    );
    return `// Generated by tools/asm8080.ts from ${input}. Edit the source, then run \`npm run rom\`.
export const ROM = Uint8Array.from(
    \`${rows.join("\n    ")}\`
        .replace(/\\s/g, "")
        .match(/../g)!,
    byte => parseInt(byte, 16)
);

export const SYMBOLS = {
${names.join("\n")}
} as const;
`;
};

if (
    process.argv[1] &&
    import.meta.url === pathToFileURL(process.argv[1]).href
) {
    const [input, output] = process.argv.slice(2);
    try {
        writeFileSync(
            output,
            toModule(assemble(readFileSync(input, "utf8"), input), input)
        );
    } catch (error) {
        if (!(error instanceof AsmError)) throw error;
        console.error(error.message);
        process.exitCode = 1;
    }
}
