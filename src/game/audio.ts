import type { SoundEvent } from "./invaders";

const SAMPLES = [
    "Ufo",
    "Shot",
    "BaseHit",
    "InvHit",
    "Extend",
    "Walk1",
    "Walk2",
    "Walk3",
    "Walk4",
    "UfoHit",
];

export const createArcadeAudio = () => {
    let context: AudioContext;
    try {
        context = new AudioContext();
    } catch {
        return null;
    }
    const master = context.createGain();
    master.gain.value = 0;
    master.connect(context.destination);
    const buffers = new Map<string, AudioBuffer>();
    const channels = new Map<string, AudioBufferSourceNode>();
    let last = [0, 0];
    let muted = false;
    let active = false;
    let ports = [0, 0];
    const ready = Promise.all(
        SAMPLES.map(async name => {
            const response = await fetch(`/audio/space-invaders/${name}.wav`);
            if (!response.ok)
                throw new Error(`Arcade audio: ${response.status} ${name}`);
            buffers.set(
                name,
                await context.decodeAudioData(await response.arrayBuffer())
            );
        })
    ).catch(error => console.error(error));

    const stop = (channel: string) => {
        const source = channels.get(channel);
        if (!source) return;
        channels.delete(channel);
        source.stop();
    };
    const playSample = (name: string, channel: string, loop = false) => {
        const buffer = buffers.get(name);
        if (!buffer || context.state !== "running") return;
        stop(channel);
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.loop = loop;
        source.connect(master);
        source.onended = () => {
            if (channels.get(channel) === source) channels.delete(channel);
            source.disconnect();
        };
        channels.set(channel, source);
        source.start();
    };
    const update = () => {
        master.gain.value = active && !muted && ports[0] & 32 ? 0.35 : 0;
        if (active && ports[0] & 1) {
            if (!channels.has("ufo")) playSample("Ufo", "ufo", true);
        } else stop("ufo");
    };
    return {
        play: ({ port, value }: SoundEvent) => {
            const index = port === 3 ? 0 : 1;
            const rising = value & ~last[index];
            last[index] = value;
            ports[index] = value;
            if (active) {
                if (port === 3) {
                    for (const [bit, sample, channel] of [
                        [2, "Shot", "shot"],
                        [4, "BaseHit", "death"],
                        [8, "InvHit", "hit"],
                        [16, "Extend", "bonus"],
                    ] as const)
                        if (rising & bit) playSample(sample, channel);
                } else {
                    for (let i = 0; i < 4; i++)
                        if (rising & (1 << i))
                            playSample(`Walk${i + 1}`, "fleet");
                    if (rising & 16) playSample("UfoHit", "ufo-hit");
                }
            }
            update();
        },
        sync: (state: number[], running: boolean) => {
            ports = [...state];
            active = running;
            if (!active) for (const channel of channels.keys()) stop(channel);
            update();
        },
        start: async () => {
            await context.resume().catch(() => {});
            await ready;
            for (const channel of channels.keys()) stop(channel);
            last = [0, 0];
            active = true;
        },
        setMuted: (value: boolean) => {
            muted = value;
            update();
            if (!value) void context.resume().catch(() => {});
        },
        close: () => {
            for (const channel of channels.keys()) stop(channel);
            void context.close().catch(() => {});
        },
    };
};
