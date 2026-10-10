export type CpuState = Record<
    | "pc"
    | "sp"
    | "a"
    | "b"
    | "c"
    | "d"
    | "e"
    | "f"
    | "h"
    | "l"
    | "inte"
    | "eiDelay"
    | "halted"
    | "cycles",
    number
>;

export interface Cpu8080 {
    init(
        write: (address: number, value: number) => void,
        read: (address: number) => number,
        tick: () => void,
        out: (port: number, value: number) => void,
        input: (port: number) => number
    ): void;
    steps(cycles: number): void;
    interrupt(vector: number): void;
    T(): number;
    status(): Record<
        "pc" | "sp" | "a" | "b" | "c" | "d" | "e" | "f" | "h" | "l",
        number
    >;
    set(register: string, value: number): void;
    save(): CpuState;
    restore(state: CpuState): void;
}
export const createCpu8080: () => Cpu8080;
