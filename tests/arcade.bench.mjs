import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";

// Run Vite and Chromium on port 9222, then: node tests/arcade.bench.mjs /tmp/arcade.json [site-url]
assert.ok(process.argv[2], "Supply the output JSON path");

const tabs = await fetch("http://127.0.0.1:9222/json").then(r => r.json());
const socket = new WebSocket(
    tabs.find(t => t.type === "page").webSocketDebuggerUrl
);
await new Promise(resolve =>
    socket.addEventListener("open", resolve, { once: true })
);
let sequence = 0;
const pending = new Map();
socket.addEventListener("message", event => {
    const message = JSON.parse(event.data);
    if (!message.id) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(JSON.stringify(message.error)));
    else resolve(message.result);
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
const waitFor = async expression => {
    for (let i = 0; i < 300; i++) {
        if (await evaluate(expression)) return;
        await new Promise(resolve => setTimeout(resolve, 20));
    }
    assert.fail(`Timed out: ${expression}`);
};
try {
    await send("Page.enable");
    await send("Emulation.setDeviceMetricsOverride", {
        width: 1280,
        height: 900,
        deviceScaleFactor: 1,
        mobile: false,
    });
    await send("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });
    await send("Page.navigate", {
        url: process.argv[3] || "http://127.0.0.1:5174",
    });
    await waitFor(
        "!!document.querySelector('.arcade-trigger') && !document.querySelector('.curtain')"
    );
    const engine = await evaluate(`(async () => {
        const {newGame, step, FRAME_S} = await import('/src/game/invaders.ts');
        const percentile = (values, p) => [...values].sort((a,b)=>a-b)[Math.min(values.length-1, Math.floor(values.length*p))];
        const before = performance.now();
        newGame();
        const coldMs = performance.now()-before;
        const starts = [];
        for (let i=0;i<15;i++) { const start=performance.now(); newGame(); starts.push(performance.now()-start); }
        const frames=[];
        for(let trial=0;trial<9;trial++) {
            const g=newGame();
            for(let i=0;i<900;i++) {
                if(g.over) throw new Error('Early game over');
                const input={fire:i%100<50,left:i%240<80,right:i%240>160};
                const start=performance.now();step(g,input,FRAME_S);frames.push(performance.now()-start);g.events.length=0;
            }
        }
        return {coldMs,warmStartupMedianMs:percentile(starts,.5),warmStartupP95Ms:percentile(starts,.95),warmStartupMeanMs:starts.reduce((a,b)=>a+b,0)/starts.length,simulationMedianMs:percentile(frames,.5),simulationP95Ms:percentile(frames,.95),simulationMeanMs:frames.reduce((a,b)=>a+b,0)/frames.length};
    })()`);
    await evaluate(`window.benchFrames=new Map();window.benchFrameId=-1;window.benchNow=performance.now();window.benchDurations=[];
        window.benchRealRAF=window.requestAnimationFrame;window.benchRealCancel=window.cancelAnimationFrame;
        window.requestAnimationFrame=callback=>{if(callback.name!=='loop')return benchRealRAF(callback);const id=--benchFrameId;benchFrames.set(id,callback);return id;};
        window.cancelAnimationFrame=id=>{if(id<0)benchFrames.delete(id);else benchRealCancel(id);};
        window.benchTick=()=>{benchNow+=(320*262)/(19968000/4)*1000;const callbacks=[...benchFrames.values()];benchFrames.clear();const start=performance.now();callbacks.forEach(callback=>callback(benchNow));benchDurations.push(performance.now()-start);};
        document.querySelector('.arcade-trigger').click();`);
    await waitFor(
        "!!document.querySelector('.arcade-section.is-expanded') && !document.querySelector('.arcade-arriving-alien')"
    );
    await evaluate("benchNow=performance.now();benchTick();benchDurations=[]");
    await evaluate(
        "document.querySelector('.arcade-section').dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter', key: 'Enter', bubbles: true }))"
    );
    await waitFor(
        "!!document.querySelector('.arcade-status [aria-label=Playing]') && benchFrames.size===1"
    );
    const fullLoop = await evaluate(`(() => {
        const key=(type,code)=>document.querySelector('canvas').dispatchEvent(new KeyboardEvent(type,{code,bubbles:true}));
        for(let i=0;i<900;i++) {
            for(const [code,on] of [['Space',i%100<50],['ArrowLeft',i%240<80],['ArrowRight',i%240>160]]) key(on?'keydown':'keyup',code);
            benchTick();
        }
        const times=benchDurations.slice(30).sort((a,b)=>a-b);
        const ctx=document.querySelector('canvas').getContext('2d');
        return {samples:times.length,medianMs:times[Math.floor(times.length*.5)],p95Ms:times[Math.floor(times.length*.95)],meanMs:times.reduce((a,b)=>a+b,0)/times.length,gameOver:!!document.querySelector('.arcade-game-over'),canvas:document.querySelector('canvas').toDataURL()};
    })()`);
    assert.equal(fullLoop.gameOver, false);
    const canvas = fullLoop.canvas;
    delete fullLoop.canvas;
    const result = {
        browser: await send("Browser.getVersion"),
        engine,
        fullLoop,
    };
    await writeFile(process.argv[2], JSON.stringify(result, null, 2) + "\n");
    await writeFile(
        process.argv[2] + ".png",
        Buffer.from(canvas.split(",")[1], "base64")
    );
    console.log(JSON.stringify(result, null, 2));
} finally {
    socket.close();
}
