import type { SoundEvent } from "./machine";

type Voice = (time: number, out: GainNode) => AudioScheduledSourceNode[];

// Starting pitches of the four march notes (Hz); each droops 12%.
const MARCH = [76, 66, 60, 54];

// The UFO's pitch over one 162 ms cycle, as Fourier terms for a PeriodicWave:
// its period (not its pitch) sweeps linearly from 1/740 s to 1/3470 s and back.
const UFO_CYCLE = 0.162;
const UFO_POINTS = Array.from({ length: 256 }, (_, i) => {
    const sweep = i < 128 ? i / 128 : 2 - i / 128;
    return 1 / (1 / 740 - (1 / 740 - 1 / 3470) * sweep);
});
const UFO_PITCH = UFO_POINTS.reduce((sum, f) => sum + f, 0) / 256;
const UFO_TERMS = [0, 1].map(phase =>
    Float32Array.from({ length: 33 }, (_, k) =>
        k === 0
            ? 0
            : (UFO_POINTS.reduce(
                  (sum, f, i) =>
                      sum +
                      (f - UFO_PITCH) *
                          Math.cos(
                              (2 * Math.PI * k * i) / 256 -
                                  (phase * Math.PI) / 2
                          ),
                  0
              ) *
                  2) /
              256
    )
);

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
    const VOICES = {
        ufo: (_time, out) => {
            out.gain.value = 0.5;
            // A first-order 920 Hz lowpass quietens the high end, as in the original.
            const fade = Math.exp((-2 * Math.PI * 920) / context.sampleRate);
            const filter = context.createIIRFilter([1 - fade], [1, -fade]);
            filter.connect(out);
            const tone = oscillator("triangle", UFO_PITCH, filter);
            const sweep = context.createOscillator();
            sweep.setPeriodicWave(
                context.createPeriodicWave(UFO_TERMS[0], UFO_TERMS[1], {
                    disableNormalization: true,
                })
            );
            sweep.frequency.value = 1 / UFO_CYCLE;
            sweep.connect(tone.frequency);
            return [tone, sweep];
        },
        shot: (time, out) => {
            // A steady tone whose pitch jitters randomly, as in the original:
            // filtered noise instead wobbles in level and sounds rough.
            const tone = oscillator("sine", 2620, out);
            const jitter = context.createGain();
            jitter.gain.value = 1600;
            jitter.connect(tone.frequency);
            // Pitch and level follow the original: hold, then droop and fade.
            tone.frequency.setValueAtTime(2620, time + 0.16);
            tone.frequency.exponentialRampToValueAtTime(2400, time + 0.28);
            out.gain.setValueAtTime(0.35, time);
            out.gain.setValueAtTime(0.35, time + 0.15);
            out.gain.linearRampToValueAtTime(0.07, time + 0.3);
            out.gain.linearRampToValueAtTime(0, time + 0.32);
            return [tone, filteredNoise("lowpass", 5000, jitter).source];
        },
        death: (time, out) => {
            // Noise from 100 to 800 Hz with a steep top, held, then faded.
            const low = context.createBiquadFilter();
            low.type = "highpass";
            low.frequency.value = 100;
            low.connect(out);
            const top = context.createBiquadFilter();
            top.type = "lowpass";
            top.frequency.value = 750;
            top.connect(low);
            const { source } = filteredNoise("lowpass", 750, top);
            out.gain.setValueAtTime(1, time);
            out.gain.setValueAtTime(1, time + 0.32);
            out.gain.linearRampToValueAtTime(0, time + 0.54);
            return [source];
        },
        hit: (time, out) => {
            // Falling sweeps that repeat ever quieter, like an echo; the first
            // starts mid-sweep. Times (s), pitches (Hz) and levels follow the original.
            const tone = oscillator("triangle", 1000, out);
            for (const [at, from, end, to] of [
                [0, 1000, 0.08, 240],
                [0.088, 1885, 0.268, 190],
                [0.272, 1840, 0.36, 1010],
            ]) {
                tone.frequency.setValueAtTime(from, time + at);
                tone.frequency.linearRampToValueAtTime(to, time + end);
            }
            out.gain.setValueAtTime(0, time);
            for (const [at, level] of [
                [0.004, 0.7],
                [0.024, 0.7],
                [0.08, 0.27],
                [0.088, 0.32],
                [0.16, 0.29],
                [0.24, 0.15],
                [0.268, 0.09],
                [0.272, 0.055],
                [0.35, 0.006],
                [0.367, 0],
            ])
                out.gain.linearRampToValueAtTime(level, time + at);
            return [tone];
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
        shot: 0.32,
        death: 0.54,
        hit: 0.367,
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
                                    // Sawtooth harmonics keep these low notes audible on small speakers.
                                    const filter = context.createBiquadFilter();
                                    filter.type = "lowpass";
                                    filter.frequency.value = 450;
                                    filter.connect(out);
                                    // A full-level thump that stops sharply, like the original.
                                    out.gain.setValueAtTime(0.8, time);
                                    out.gain.setValueAtTime(0.8, time + 0.075);
                                    out.gain.linearRampToValueAtTime(
                                        0,
                                        time + 0.095
                                    );
                                    const tone = oscillator(
                                        "sawtooth",
                                        MARCH[i],
                                        filter
                                    );
                                    tone.frequency.setValueAtTime(
                                        MARCH[i],
                                        time
                                    );
                                    tone.frequency.exponentialRampToValueAtTime(
                                        MARCH[i] * 0.88,
                                        time + 0.095
                                    );
                                    return [tone];
                                },
                                0.1
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
