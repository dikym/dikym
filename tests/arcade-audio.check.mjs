// Run Vite and Chrome with --remote-debugging-port=9222, then:
// node tests/arcade-audio.check.mjs http://127.0.0.1:5177
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

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
const license = readFileSync(
    new URL("../public/licenses/space-invaders-audio.txt", import.meta.url),
    "utf8"
);
let assets = 0;
for (const [, name, digest] of license.matchAll(
    /(\w+\.wav):\s+SHA-256\s+([a-f0-9]{64})/g
)) {
    assert.equal(
        createHash("sha256")
            .update(
                readFileSync(
                    new URL(
                        `../public/audio/space-invaders/${name}`,
                        import.meta.url
                    )
                )
            )
            .digest("hex"),
        digest,
        name
    );
    assets++;
}
assert.equal(assets, 10);
try {
    await send("Page.enable");
    await send("Page.navigate", { url: site });
    await wait("!!document.querySelector('.arcade-trigger')");
    const results = await evaluate(`(async () => {
        const { createArcadeAudio } = await import('/src/game/audio.ts');
        const Original = window.AudioContext;
        const names = ['Ufo','Shot','BaseHit','InvHit','Extend','Walk1','Walk2','Walk3','Walk4','UfoHit'];
        const rate = 48000;
        const decoder = new OfflineAudioContext(1, 1, rate);
        const reference = new Map(await Promise.all(names.map(async name => [name, await decoder.decodeAudioData(await (await fetch('/audio/space-invaders/'+name+'.wav')).arrayBuffer())])));
        const results = [];
        const check = (value, label) => { if (!value) throw Error(label); };
        const makeContext = () => {
            const ctx = new OfflineAudioContext(1, rate * 3, rate);
            Object.defineProperty(ctx, 'state', { get: () => 'running', configurable:true });
            const resume = ctx.resume.bind(ctx);
            ctx.resume = async () => {};
            let closed = false;
            ctx.close = async () => { closed = true; };
            const sources = [];
            const nativeSource = ctx.createBufferSource.bind(ctx);
            ctx.createBufferSource = () => {
                const source = nativeSource();
                const record = { source, starts: [], stops: [] };
                const start = source.start.bind(source), stop = source.stop.bind(source);
                source.start = (...args) => { record.starts.push(ctx.currentTime); start(...args); };
                source.stop = (...args) => { record.stops.push(ctx.currentTime); stop(...args); };
                sources.push(record);
                return source;
            };
            window.AudioContext = function() { return ctx; };
            return { ctx, resume, sources, closed: () => closed };
        };
        const compare = (actual, expected, label) => {
            const a = actual.getChannelData(0), b = expected.getChannelData(0);
            let error = 0, peak = 0;
            for(let i=0;i<a.length;i++) { error=Math.max(error,Math.abs(a[i]-b[i])); peak=Math.max(peak,Math.abs(a[i])); }
            check(error <= 2e-7, label + ': PCM error '+error);
            results.push({label, error, peak});
        };
        const renderReference = (samples, muted = false, startTime = 0, stopTime, gainEvents = []) => {
            const ctx = new OfflineAudioContext(1, rate * 3, rate);
            const gain = ctx.createGain(); gain.gain.value = muted ? 0 : .35; gain.connect(ctx.destination);
            for (const [time, value] of gainEvents) gain.gain.setValueAtTime(value,time);
            for(const [name, loop] of samples) {
                const source = ctx.createBufferSource(); source.buffer = reference.get(name); source.loop = !!loop; source.connect(gain); source.start(startTime);
                if(stopTime !== undefined) source.stop(stopTime);
            }
            return ctx.startRendering();
        };
        try {
            for (const [name,port,bit] of [['Ufo',3,1],['Shot',3,2],['BaseHit',3,4],['InvHit',3,8],['Extend',3,16],['Walk1',5,1],['Walk2',5,2],['Walk3',5,4],['Walk4',5,8],['UfoHit',5,16]]) {
                const {ctx,sources} = makeContext();
                const audio = createArcadeAudio(); await audio.start(); audio.sync([32,0],true);
                audio.play({port,value:port===3?32|bit:bit});
                check(sources.length===1, name+': one source');
                check(sources[0].source.loop === (name==='Ufo'), name+': loop flag');
                audio.play({port,value:port===3?32|bit:bit});
                check(sources.length===1, name+': held bit cannot retrigger');
                compare(await ctx.startRendering(), await renderReference([[name,name==='Ufo']]), name);
            }
            for (const mode of ['mute','gate','pause','inactive','retrigger','simultaneous','fleet-replacement','restart','ufo-falling']) {
                const {ctx,sources} = makeContext();
                const audio = createArcadeAudio(); await audio.start(); audio.sync([32,0],mode!=='inactive');
                let expected = [['Shot',false]], silence = false;
                if(mode==='mute') { audio.setMuted(true); silence=true; }
                if(mode==='gate') { audio.sync([0,0],true); silence=true; }
                if(mode==='simultaneous') { audio.play({port:3,value:62}); expected=names.slice(1,5).map(name=>[name,false]); }
                else if(mode==='fleet-replacement') { audio.play({port:5,value:15}); expected=[['Walk4',false]]; check(sources.length===4 && sources.slice(0,3).every(s=>s.stops.length===1),'fleet channel replaces prior sample'); }
                else audio.play({port:3,value:mode==='gate'?2:34});
                if(mode==='inactive') { expected=[]; check(sources.length===0,'inactive cannot create sources'); }
                if(mode==='retrigger') { audio.play({port:3,value:32}); audio.play({port:3,value:34}); check(sources.length===2 && sources[0].stops.length===1,'rising edge restarts channel'); }
                if(mode==='pause') { audio.sync([34,0],false); expected=[]; check(sources.every(s=>s.stops.length===1),'pause stops every channel'); }
                if(mode==='restart') { await audio.start(); expected=[]; check(sources.every(s=>s.stops.length===1),'restart stops old channels'); audio.play({port:3,value:34}); expected=[['Shot',false]]; check(sources.length===2,'restart resets edge history'); }
                if(mode==='ufo-falling') { audio.play({port:3,value:33}); audio.play({port:3,value:32}); check(sources[1].source.loop && sources[1].stops.length===1,'UFO falling edge stops loop'); }
                compare(await ctx.startRendering(), await renderReference(expected,silence), mode);
            }
            const {ctx,resume,sources,closed} = makeContext();
            const audio = createArcadeAudio(); await audio.start(); audio.sync([32,0],true);
            const suspended = ctx.suspend(.1);
            const mutedAt = ctx.suspend(.15);
            const unmutedAt = ctx.suspend(.2);
            const pausedAgain = ctx.suspend(.3);
            const rendered = ctx.startRendering();
            await suspended;
            audio.play({port:3,value:34}); const startTime = ctx.currentTime;
            await resume(); await mutedAt; audio.setMuted(true); const muteTime=ctx.currentTime;
            await resume(); await unmutedAt; audio.setMuted(false); const unmuteTime=ctx.currentTime;
            await resume(); await pausedAgain;
            audio.sync([34,0],false); const stopTime = ctx.currentTime;
            await resume();
            compare(await rendered, await renderReference([['Shot',false]],false,startTime,stopTime,[[muteTime,0],[unmuteTime,.35]]), 'delayed shot/mute/unmute/pause timing');
            check(sources[0].starts[0]===startTime && sources[0].stops[0]===stopTime,'source start/stop timing');
            audio.close(); check(closed(),'close closes context');
            window.AudioContext = function() { throw Error('unavailable'); };
            check(createArcadeAudio()===null,'missing audio context degrades gracefully');
            const originalFetch = window.fetch, originalError = console.error;
            try {
                for(const failure of ['fetch404','decode','resume']) {
                    const {ctx,sources,closed} = makeContext(); let errors = 0;
                    console.error = () => errors++;
                    window.fetch = failure==='fetch404' ? async()=>new Response('',{status:404}) : originalFetch;
                    if(failure==='decode') ctx.decodeAudioData=async()=>{throw Error('decode failed');};
                    if(failure==='resume') {
                        Object.defineProperty(ctx,'state',{get:()=> 'suspended', configurable:true});
                        ctx.resume=async()=>{throw Error('resume rejected');};
                    }
                    const audio=createArcadeAudio(); await audio.start(); audio.sync([32,0],true); audio.play({port:3,value:34});
                    check(sources.length===0,failure+': no invalid playback');
                    check(errors===(failure==='resume'?0:1),failure+': loading failure reported once');
                    audio.close(); check(closed(),failure+': context can close');
                }
            } finally { window.fetch=originalFetch; console.error=originalError; }
        } finally { window.AudioContext = Original; }
        return results;
    })()`);
    assert.equal(results.length, 20);
    assert.ok(results.slice(0, 10).every(r => r.peak > 0 && r.error === 0));
    console.log(
        `arcade audio: ${assets} SHA256 assets; ${results.length} complete 3-second PCM comparisons at 48kHz passed (maximum error ${Math.max(...results.map(r => r.error))}); sample mapping, loops, edges, gating, mute, pause, restart, replacement, source timing, unavailable context and 404/decode/resume failures passed`
    );
} finally {
    socket.close();
}
