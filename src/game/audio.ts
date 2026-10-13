import type { SoundEvent } from "./machine";

type Voice = (time: number, out: GainNode) => AudioScheduledSourceNode[];

// Triangle pitches for the four march notes (Hz).
const MARCH = [98, 87, 78, 73];

export const createArcadeAudio = () => {
    // iOS plays Web Audio as "ambient", which the silent switch mutes; "playback" ignores the switch.
    const session = (
        navigator as Navigator & { audioSession?: { type: string } }
    ).audioSession;
    if (session) session.type = "playback";
    let context: AudioContext;
    try {
        context = new AudioContext();
    } catch {
        return null;
    }
    const master = context.createGain();
    master.gain.value = 0;
    master.connect(context.destination);
    const channels = new Map<string, AudioScheduledSourceNode[]>();
    let last = [0, 0];
    let muted = false;
    let active = false;
    let ports = [0, 0];
    // One second of white noise, looped by every noise voice.
    const noise = context.createBuffer(
        1,
        context.sampleRate,
        context.sampleRate
    );
    const samples = noise.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;

    const oscillator = (
        type: OscillatorType,
        frequency: number,
        to: AudioNode
    ) => {
        const node = context.createOscillator();
        node.type = type;
        node.frequency.value = frequency;
        node.connect(to);
        return node;
    };
    const filteredNoise = (
        type: BiquadFilterType,
        frequency: number,
        to: AudioNode
    ) => {
        const filter = context.createBiquadFilter();
        filter.type = type;
        filter.frequency.value = frequency;
        filter.connect(to);
        const source = context.createBufferSource();
        source.buffer = noise;
        source.loop = true;
        source.connect(filter);
        return { source, filter };
    };
    const decay = (
        out: GainNode,
        time: number,
        level: number,
        length: number
    ) => {
        out.gain.setValueAtTime(level, time);
        out.gain.exponentialRampToValueAtTime(0.001, time + length);
    };
    const VOICES = {
        ufo: (_time, out) => {
            out.gain.value = 0.25;
            const tone = oscillator("square", 220, out);
            const depth = context.createGain();
            depth.gain.value = 60;
            depth.connect(tone.frequency);
            return [tone, oscillator("sine", 8, depth)];
        },
        shot: (time, out) => {
            const { source, filter } = filteredNoise("bandpass", 3000, out);
            filter.frequency.exponentialRampToValueAtTime(600, time + 0.18);
            decay(out, time, 0.6, 0.18);
            return [source];
        },
        death: (time, out) => {
            const { source, filter } = filteredNoise("lowpass", 900, out);
            filter.frequency.exponentialRampToValueAtTime(120, time + 1);
            decay(out, time, 0.9, 1);
            return [source];
        },
        hit: (time, out) => {
            decay(out, time, 0.5, 0.12);
            return [
                filteredNoise("highpass", 400, out).source,
                oscillator("square", 160, out),
            ];
        },
        bonus: (time, out) => {
            out.gain.value = 0.2;
            const tone = oscillator("square", 660, out);
            for (let i = 0; i < 12; i++)
                tone.frequency.setValueAtTime(
                    [660, 880, 1320][i % 3],
                    time + i * 0.08
                );
            return [tone];
        },
        "ufo-hit": (time, out) => {
            out.gain.value = 0.15;
            const tone = oscillator("square", 1200, out);
            tone.frequency.exponentialRampToValueAtTime(300, time + 0.6);
            const tremolo = context.createGain();
            tremolo.gain.value = 0.15;
            tremolo.connect(out.gain);
            return [tone, oscillator("sine", 12, tremolo)];
        },
    } satisfies Record<string, Voice>;
    const LENGTHS = {
        shot: 0.18,
        death: 1,
        hit: 0.12,
        bonus: 0.96,
        "ufo-hit": 0.6,
    };

    const stop = (channel: string) => {
        const nodes = channels.get(channel);
        if (!nodes) return;
        channels.delete(channel);
        for (const node of nodes) node.stop();
    };
    // Starts a voice on its channel, replacing what the channel was playing.
    const play = (channel: string, voice: Voice, length?: number) => {
        if (context.state !== "running") return;
        stop(channel);
        const out = context.createGain();
        out.connect(master);
        const time = context.currentTime;
        const nodes = voice(time, out);
        for (const node of nodes) {
            node.start(time);
            if (length !== undefined) node.stop(time + length);
        }
        channels.set(channel, nodes);
        nodes[0].onended = () => {
            if (channels.get(channel) === nodes) channels.delete(channel);
            out.disconnect();
        };
    };
    const update = () => {
        master.gain.value = active && !muted && ports[0] & 32 ? 0.35 : 0;
        if (active && ports[0] & 1) {
            if (!channels.has("ufo")) play("ufo", VOICES.ufo);
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
                    for (const [bit, channel] of [
                        [2, "shot"],
                        [4, "death"],
                        [8, "hit"],
                        [16, "bonus"],
                    ] as const)
                        if (rising & bit)
                            play(channel, VOICES[channel], LENGTHS[channel]);
                } else {
                    for (let i = 0; i < 4; i++)
                        if (rising & (1 << i))
                            play(
                                "fleet",
                                (time, out) => {
                                    decay(out, time, 0.5, 0.07);
                                    return [
                                        oscillator("triangle", MARCH[i], out),
                                    ];
                                },
                                0.07
                            );
                    if (rising & 16)
                        play("ufo-hit", VOICES["ufo-hit"], LENGTHS["ufo-hit"]);
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
