// Run Vite and Chrome with --remote-debugging-port=9222, then:
// node tests/arcade-input.check.mjs http://127.0.0.1:5177
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
const key = (type, code, value = code) =>
    send("Input.dispatchKeyEvent", { type, code, key: value });
const controls = async expected => {
    assert.equal(await evaluate("tickInput(); auditGame.controls"), expected);
};
try {
    await send("Page.enable");
    await send("Emulation.setFocusEmulationEnabled", { enabled: true });
    await send("Emulation.setDeviceMetricsOverride", {
        width: 393,
        height: 852,
        deviceScaleFactor: 1,
        mobile: true,
    });
    await send("Emulation.setTouchEmulationEnabled", {
        enabled: true,
        maxTouchPoints: 5,
    });
    await send("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });
    await send("Page.navigate", { url: site });
    await wait(
        "!!document.querySelector('.arcade-trigger') && !document.querySelector('.curtain')"
    );
    await evaluate("document.querySelector('.arcade-trigger').click()");
    await wait(
        "!!document.querySelector('.arcade-section.is-expanded') && !document.querySelector('.arcade-arriving-alien')"
    );
    await evaluate(`(() => {
        window.inputFrames = new Map(); let id = 0; let time = performance.now();
        window.requestAnimationFrame = cb => { inputFrames.set(++id, cb); return id; };
        window.cancelAnimationFrame = id => inputFrames.delete(id);
        window.tickInput = () => { time += 50; const frames = [...inputFrames.values()]; inputFrames.clear(); frames.forEach(cb => cb(time)); };
        document.querySelector('.arcade-section').dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter', key: 'Enter', bubbles: true }));
    })()`);
    await wait(
        "!!document.querySelector('.arcade-status [aria-label=Playing]') && inputFrames.size > 0"
    );
    await send("Debugger.enable");
    const imported = await send("Runtime.evaluate", {
        expression: "import('/src/game/invaders.ts').then(m => m.step)",
        awaitPromise: true,
    });
    const breakpoint = await send("Debugger.setBreakpointOnFunctionCall", {
        objectId: imported.result.objectId,
    });
    const stopped = new Promise(resolve => {
        paused = resolve;
    });
    const tick = evaluate("tickInput()");
    const frame = (await stopped).callFrames[0];
    await send("Debugger.evaluateOnCallFrame", {
        callFrameId: frame.callFrameId,
        expression:
            "window.auditGame = g; window.auditInput = input; g.elapsed = -10000;",
    });
    await send("Debugger.removeBreakpoint", {
        breakpointId: breakpoint.breakpointId,
    });
    await send("Debugger.resume");
    await tick;
    await send("Debugger.disable");
    for (const [code, bit] of [
        ["ArrowLeft", 32],
        ["KeyA", 32],
        ["ArrowRight", 64],
        ["KeyD", 64],
        ["Space", 16],
        ["ArrowUp", 16],
        ["KeyW", 16],
    ]) {
        await key("keyDown", code);
        await key("keyDown", code);
        await controls(8 | bit);
        await key("keyUp", code);
        await controls(8);
    }
    for (let from = 0; from < 8; from++) {
        for (let to = 0; to < 8; to++) {
            for (const mask of [from, to]) {
                for (const [i, code] of ["KeyA", "KeyD", "KeyW"].entries())
                    await key(mask & (1 << i) ? "keyDown" : "keyUp", code);
                await controls(
                    8 |
                        (mask & 1 ? 32 : 0) |
                        (mask & 2 ? 64 : 0) |
                        (mask & 4 ? 16 : 0)
                );
            }
        }
    }
    for (const code of ["KeyA", "KeyD", "KeyW"]) await key("keyUp", code);
    for (const [codes, bit] of [
        [["KeyA", "ArrowLeft"], 32],
        [["KeyD", "ArrowRight"], 64],
        [["Space", "ArrowUp", "KeyW"], 16],
    ]) {
        for (const code of codes) await key("keyDown", code);
        for (let i = 0; i < codes.length; i++) {
            await key("keyUp", codes[i]);
            assert.equal(
                await evaluate("tickInput(); auditGame.controls"),
                i < codes.length - 1 ? 8 | bit : 8,
                `releasing ${codes[i]} preserves other held aliases`
            );
        }
    }
    const points = await evaluate(
        `Array.from(document.querySelectorAll('.arcade-controls button')).map(b => { const r = b.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })`
    );
    assert.equal(points.length, 3);
    const touch = (type, ids) =>
        send("Input.dispatchTouchEvent", {
            type,
            touchPoints: ids.map(([id, index, offset = 0]) => ({
                id,
                x: points[index].x + offset,
                y: points[index].y,
                radiusX: 1,
                radiusY: 1,
            })),
        });
    await touch("touchStart", [
        [1, 0],
        [2, 2],
    ]);
    await controls(56);
    await touch("touchEnd", [[1, 0]]);
    await controls(24);
    await touch("touchEnd", []);
    await controls(8);
    await touch("touchStart", [
        [1, 0, -5],
        [2, 0, 5],
    ]);
    await controls(40);
    await touch("touchEnd", [[1, 0, -5]]);
    await controls(40);
    await touch("touchCancel", []);
    await controls(8);
    await evaluate(
        `window.auditPointer = null; document.querySelectorAll('.arcade-controls button')[0].addEventListener('pointerdown', e => window.auditPointer = e.pointerId, {once:true});`
    );
    await touch("touchStart", [[1, 0]]);
    await controls(40);
    await touch("touchMove", [[1, 0, 20]]);
    await evaluate(
        "document.querySelectorAll('.arcade-controls button')[0].releasePointerCapture(auditPointer)"
    );
    await touch("touchMove", [[1, 0, 50]]);
    await new Promise(resolve => setTimeout(resolve, 50));
    await controls(8);
    await touch("touchCancel", []);
    await send("Input.dispatchMouseEvent", {
        type: "mousePressed",
        x: points[1].x,
        y: points[1].y,
        button: "left",
        clickCount: 1,
    });
    await controls(72);
    await send("Input.dispatchMouseEvent", {
        type: "mouseMoved",
        x: 10,
        y: 10,
        button: "left",
        buttons: 1,
    });
    await controls(72);
    await send("Input.dispatchMouseEvent", {
        type: "mouseReleased",
        x: 10,
        y: 10,
        button: "left",
        clickCount: 1,
    });
    await controls(8);
    await evaluate("document.querySelector('canvas').focus()");
    await key("keyDown", "KeyA");
    await touch("touchStart", [[1, 0]]);
    await controls(40);
    await touch("touchEnd", []);
    await controls(40);
    await key("keyUp", "KeyA");
    await controls(8);
    await touch("touchStart", [[1, 0]]);
    await key("keyDown", "KeyA");
    await key("keyUp", "KeyA");
    await controls(40);
    await touch("touchCancel", []);
    await controls(8);
    for (const [index, bit] of [
        [0, 32],
        [1, 64],
        [2, 16],
    ]) {
        await evaluate(
            `document.querySelectorAll('.arcade-controls button')[${index}].focus()`
        );
        await key("keyDown", "Space", " ");
        await controls(8 | bit);
        await key("keyDown", "Enter", "Enter");
        await controls(8 | bit);
        await key("keyUp", "Space", " ");
        await controls(8 | bit);
        await key("keyUp", "KeyX", "x");
        await controls(8 | bit);
        await key("keyUp", "Enter", "Enter");
        await controls(8);
    }
    await evaluate("document.querySelector('canvas').focus()");
    for (const event of [
        "window.dispatchEvent(new Event('blur'))",
        "document.dispatchEvent(new Event('visibilitychange'))",
        "document.querySelector('.arcade-trigger').focus()",
    ]) {
        await key("keyDown", "KeyA");
        await controls(40);
        await evaluate(event);
        await evaluate("document.querySelector('canvas').focus()");
        await controls(8);
        await key("keyUp", "KeyA");
    }
    await evaluate("document.querySelector('.arcade-trigger').focus()");
    await key("keyDown", "KeyA");
    await evaluate("document.querySelector('canvas').focus()");
    await controls(8);
    await key("keyUp", "KeyA");
    await key("keyDown", "KeyA");
    await controls(40);
    await evaluate(
        "auditGame.elapsed=0; auditGame.memory[0x20e7]=0; auditGame.memory[0x21ff]=0; auditGame.memory[0x2015]=0; tickInput()"
    );
    await wait("!!document.querySelector('.arcade-game-over')");
    await evaluate(
        "document.querySelector('.arcade-section').dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter', key: 'Enter', bubbles: true }))"
    );
    await wait(
        "!!document.querySelector('.arcade-status [aria-label=Playing]')"
    );
    assert.deepEqual(
        await evaluate("auditInput"),
        { left: false, right: false, fire: false },
        "restart clears held sources"
    );
    await key("keyUp", "KeyA");
    await key("keyDown", "KeyW");
    await evaluate("document.querySelector('.arcade-exit').click()");
    await evaluate("tickInput()");
    assert.deepEqual(
        await evaluate("auditInput"),
        { left: false, right: false, fire: false },
        "exit clears held sources"
    );
    console.log(
        "arcade input: 7 aliases, 64 transitions, alias overlap, multi-touch, mixed keyboard/touch, pointer capture/release outside, button Space/Enter, unrelated keyup, focus/blur/visibility release, restart and exit passed"
    );
} finally {
    await send("Debugger.resume").catch(() => {});
    await send("Emulation.setTouchEmulationEnabled", { enabled: false });
    socket.close();
}
