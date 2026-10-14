// Run Vite and Chrome with --remote-debugging-port=9222, then:
// node tests/arcade-audio.check.mjs http://127.0.0.1:5177
import assert from "node:assert/strict";

const site = process.argv[2] || "http://127.0.0.1:5177";
const tabs = await fetch("http://127.0.0.1:9222/json").then(r => r.json());
const socket = new WebSocket(
    tabs.find(t => t.type === "page").webSocketDebuggerUrl
);
await new Promise(resolve =>
    socket.addEventListener("open", resolve, { once: true })
);
let sequence = 0;
const pending = new Map();
let paused;
socket.addEventListener("message", event => {
    const message = JSON.parse(event.data);
    if (message.method === "Debugger.paused") paused?.(message.params);
    if (!message.id) return;
    const task = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) task.reject(new Error(JSON.stringify(message.error)));
    else task.resolve(message.result);
});
const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
        const id = ++sequence;
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
    });
const evaluate = async expression => {
    const result = await send("Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise: true,
        userGesture: true,
    });
    assert.ok(
        !result.exceptionDetails,
        JSON.stringify(result.exceptionDetails)
    );
    return result.result.value;
};
const wait = async expression => {
    for (let i = 0; i < 300; i++) {
        if (await evaluate(expression)) return;
        await new Promise(resolve => setTimeout(resolve, 25));
    }
    assert.fail(`Timed out: ${expression}`);
};
try {
    await send("Page.enable");
    await send("Page.navigate", { url: site });
    await wait("!!document.querySelector('.arcade-trigger')");
    const results = await evaluate(`(async () => {
        const { createArcadeAudio } = await import('/src/game/audio.ts');
        const Original = window.AudioContext;
        const originalFetch = window.fetch;
        let fetches = 0;
        window.fetch = (...args) => { fetches++; return originalFetch(...args); };
        const rate = 48000;
        const results = [];
        const check = (value, label) => { if (!value) throw Error(label); };
        // Records every scheduled source (oscillators and noise) of a running offline context.
        const makeContext = () => {
            const ctx = new OfflineAudioContext(1, rate * 2, rate);
            Object.defineProperty(ctx, 'state', { get: () => 'running', configurable: true });
            ctx.resume = async () => {};
            let closed = false;
            ctx.close = async () => { closed = true; };
            const sources = [];
            for (const factory of ['createBufferSource', 'createOscillator']) {
                const native = ctx[factory].bind(ctx);
                ctx[factory] = () => {
                    const source = native();
                    const record = { source, kind: factory, starts: [], stops: [] };
                    const start = source.start.bind(source), stop = source.stop.bind(source);
                    source.start = (...args) => { record.starts.push(args[0] ?? ctx.currentTime); start(...args); };
                    source.stop = (...args) => { record.stops.push(args[0] ?? ctx.currentTime); stop(...args); };
                    sources.push(record);
                    return source;
                };
            }
            window.AudioContext = function () { return ctx; };
            return { ctx, sources, closed: () => closed };
        };
        const peak = async ctx => {
            const data = (await ctx.startRendering()).getChannelData(0);
            let max = 0;
            for (let i = 0; i < data.length; i++) max = Math.max(max, Math.abs(data[i]));
            return max;
        };
        try {
            // Each sound bit starts its own voice once per rising edge; only the UFO loops.
            for (const [name, port, bit, voices] of [['ufo',3,1,2],['shot',3,2,2],['death',3,4,1],['hit',3,8,1],['bonus',3,16,1],['march1',5,1,1],['march2',5,2,1],['march3',5,4,1],['march4',5,8,1],['ufo-hit',5,16,2]]) {
                const { ctx, sources } = makeContext();
                const audio = createArcadeAudio(); await audio.start(); audio.sync([32,0], true);
                audio.play({ port, value: port === 3 ? 32 | bit : bit });
                check(sources.length === voices, name + ': ' + voices + ' source(s), got ' + sources.length);
                check(sources.every(s => s.starts.length === 1), name + ': started');
                check(sources.every(s => s.stops.length === (name === 'ufo' ? 0 : 1)), name + ': ends on its own unless it loops');
                audio.play({ port, value: port === 3 ? 32 | bit : bit });
                check(sources.length === voices, name + ': held bit cannot retrigger');
                const level = await peak(ctx);
                check(level > 0, name + ': audible');
                results.push({ label: name, peak: level });
            }
            for (const mode of ['mute','gate','pause','inactive','retrigger','simultaneous','fleet-replacement','restart','ufo-falling']) {
                const { ctx, sources } = makeContext();
                const audio = createArcadeAudio(); await audio.start(); audio.sync([32,0], mode !== 'inactive');
                let silent = false;
                if (mode === 'mute') { audio.setMuted(true); silent = true; }
                if (mode === 'gate') { audio.sync([0,0], true); silent = true; }
                if (mode === 'simultaneous') { audio.play({ port: 3, value: 62 }); check(sources.length === 5, 'shot, death, hit and bonus start together'); }
                else if (mode === 'fleet-replacement') { audio.play({ port: 5, value: 15 }); check(sources.length === 4 && sources.slice(0,3).every(s => s.stops.length === 2), 'fleet channel replaces prior note'); }
                else audio.play({ port: 3, value: mode === 'gate' ? 2 : 34 });
                if (mode === 'inactive') { silent = true; check(sources.length === 0, 'inactive cannot create sources'); }
                if (mode === 'retrigger') { audio.play({ port: 3, value: 32 }); audio.play({ port: 3, value: 34 }); check(sources.length === 4 && sources.slice(0,2).every(s => s.stops.length === 2), 'rising edge restarts channel'); }
                if (mode === 'pause') { audio.sync([34,0], false); silent = true; check(sources.every(s => s.stops.length === 2), 'pause stops every channel'); }
                if (mode === 'restart') { await audio.start(); check(sources.every(s => s.stops.length === 2), 'restart stops old channels'); audio.play({ port: 3, value: 34 }); check(sources.length === 4, 'restart resets edge history'); }
                if (mode === 'ufo-falling') { audio.play({ port: 3, value: 33 }); audio.play({ port: 3, value: 32 }); check(sources.slice(1).every(s => s.stops.length === 1), 'UFO falling edge stops loop'); }
                const level = await peak(ctx);
                check(silent ? level === 0 : level > 0, mode + ': ' + (silent ? 'silent' : 'audible') + ', peak ' + level);
                results.push({ label: mode, peak: level });
            }
            const { closed } = makeContext();
            const audio = createArcadeAudio(); await audio.start();
            audio.close(); check(closed(), 'close closes context');
            window.AudioContext = function () { throw Error('unavailable'); };
            check(createArcadeAudio() === null, 'missing audio context degrades gracefully');
            check(fetches === 0, 'no audio files are fetched');
        } finally { window.AudioContext = Original; window.fetch = originalFetch; }
        return results;
    })()`);
    assert.equal(results.length, 19);
    console.log(
        `arcade audio: ${results.length} synthesized renders at 48kHz passed; bit mapping, loops, edges, gating, mute, pause, restart, replacement, unavailable context and no downloads passed`
    );
} finally {
    socket.close();
}
