// Run Vite and Chrome with --remote-debugging-port=9222, then:
// node tests/arcade-loading.check.mjs http://127.0.0.1:5173
import assert from "node:assert/strict";

const site = process.argv[2] || "http://127.0.0.1:5173";
const tabs = await fetch("http://127.0.0.1:9222/json").then(r => r.json());
const socket = new WebSocket(
    tabs.find(tab => tab.type === "page").webSocketDebuggerUrl
);
await new Promise(resolve =>
    socket.addEventListener("open", resolve, { once: true })
);
let sequence = 0;
const pending = new Map();
const requests = [];
const errors = [];
socket.addEventListener("message", event => {
    const message = JSON.parse(event.data);
    if (message.method === "Fetch.requestPaused") requests.push(message.params);
    if (message.method === "Runtime.exceptionThrown")
        errors.push(message.params.exceptionDetails);
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
const waitFor = async check => {
    for (let i = 0; i < 200; i++) {
        if (await check()) return;
        await new Promise(resolve => setTimeout(resolve, 25));
    }
    assert.fail(`Timed out: ${check}`);
};
const ready = () =>
    waitFor(() =>
        evaluate(
            "document.querySelector('.arcade-trigger') && !document.querySelector('.curtain')"
        )
    );
const opened = () =>
    waitFor(() =>
        evaluate(
            "!!document.querySelector('.arcade-section.is-expanded') && !document.querySelector('.arcade-arriving-alien')"
        )
    );
const close = async () => {
    await evaluate("document.querySelector('.arcade-exit').click()");
    await waitFor(() => evaluate("!document.querySelector('.arcade-section')"));
    assert.equal(
        await evaluate(
            "document.activeElement === document.querySelector('.arcade-trigger') && document.documentElement.style.overflow === ''"
        ),
        true
    );
};
const navigate = async name => {
    requests.length = 0;
    await send("Page.navigate", { url: `${site}/?arcade-check=${name}` });
    await ready();
};
const holdModule = () =>
    send("Fetch.enable", {
        patterns: [{ urlPattern: "*Quorzak*", requestStage: "Request" }],
    });
const releaseModule = () =>
    send("Fetch.continueRequest", { requestId: requests[0].requestId });

try {
    await send("Runtime.enable");
    await send("Page.enable");
    await send("Network.enable");
    await send("Network.setCacheDisabled", { cacheDisabled: true });
    await send("Emulation.setFocusEmulationEnabled", { enabled: true });
    await send("Emulation.setDeviceMetricsOverride", {
        width: 393,
        height: 852,
        deviceScaleFactor: 1,
        mobile: true,
    });
    await send("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });
    await send("Page.addScriptToEvaluateOnNewDocument", {
        source: `window.audioContexts = [];
            window.flightOrigins = [];
            const nativeAnimate = Element.prototype.animate;
            Element.prototype.animate = function(...args) {
                if (this.classList.contains('arcade-arriving-alien')) {
                    const rect = this.getBoundingClientRect();
                    flightOrigins.push({x: rect.x, y: rect.y, width: rect.width, height: rect.height});
                }
                return nativeAnimate.apply(this, args);
            };
            const NativeAudioContext = window.AudioContext;
            window.AudioContext = class extends NativeAudioContext {
                constructor(...args) { super(...args); audioContexts.push(this); }
            };`,
    });
    errors.length = 0;
    await holdModule();
    await navigate("delayed");
    assert.equal(requests.length, 0, "initial page keeps the arcade lazy");
    await evaluate(
        "document.querySelector('.arcade-trigger').dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'touch' }))"
    );
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.equal(requests.length, 0, "touch entry does not preload");
    await evaluate(
        "document.querySelector('.arcade-trigger').dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' }))"
    );
    await waitFor(() => requests.length === 1);
    assert.equal(
        await evaluate(
            "!document.querySelector('.arcade-section') && audioContexts.length === 0"
        ),
        true,
        "preload never mounts a panel or audio"
    );
    await waitFor(() => evaluate(`document.fonts.check('14px "Quorzak"')`));
    await evaluate(
        "document.querySelector('.arcade-trigger').focus(); for (let i = 0; i < 5; i++) document.querySelector('.arcade-trigger').click()"
    );
    await waitFor(() =>
        evaluate(
            "document.querySelector('.arcade-trigger').getAttribute('aria-busy') === 'true'"
        )
    );
    assert.equal(
        requests.length,
        1,
        "hover, focus and repeated clicks share one import"
    );
    await send("Emulation.setDeviceMetricsOverride", {
        width: 1280,
        height: 900,
        deviceScaleFactor: 1,
        mobile: false,
    });
    const scroll = await evaluate(
        "window.scrollTo({top: document.documentElement.scrollHeight, behavior: 'instant'}); scrollY"
    );
    const origin = await evaluate(`(() => {
        const rect = document.querySelector('.arcade-trigger svg').getBoundingClientRect();
        return {x: rect.x, y: rect.y, width: rect.width, height: rect.height};
    })()`);
    await releaseModule();
    await opened();
    const mountedOrigin = await evaluate("flightOrigins[0]");
    for (const key of ["x", "y", "width", "height"])
        assert.ok(
            Math.abs(mountedOrigin[key] - origin[key]) < 1,
            `delayed mounting uses current alien ${key}`
        );
    assert.equal(
        await evaluate("document.querySelectorAll('.arcade-section').length"),
        1
    );
    assert.equal(
        await evaluate(
            "document.querySelector('.arcade-trigger').getAttribute('aria-expanded')"
        ),
        "true"
    );
    assert.equal(await evaluate("audioContexts.length"), 0);
    await close();
    assert.ok(
        Math.abs((await evaluate("scrollY")) - scroll) < 1,
        "closing restores scroll captured after the delayed import and viewport change"
    );

    await navigate("cancel");
    await evaluate("document.querySelector('.arcade-trigger').click()");
    await waitFor(() => requests.length === 1);
    await evaluate(
        "window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))"
    );
    await waitFor(() =>
        evaluate(
            "document.querySelector('.arcade-trigger').getAttribute('aria-busy') === 'false'"
        )
    );
    await releaseModule();
    await waitFor(() =>
        evaluate(
            "performance.getEntriesByType('resource').some(entry => /Quorzak/.test(entry.name) && entry.responseEnd > 0)"
        )
    );
    await evaluate("new Promise(resolve => setTimeout(resolve, 100))");
    assert.equal(
        await evaluate(
            "document.querySelector('.arcade-section') === null && document.querySelector('.arcade-trigger').getAttribute('aria-expanded') === 'false' && audioContexts.length === 0"
        ),
        true,
        "late import cannot mount a cancelled opening"
    );
    await evaluate("document.querySelector('.arcade-trigger').click()");
    await opened();
    await close();

    await navigate("cancel-reopen");
    await evaluate("document.querySelector('.arcade-trigger').click()");
    await waitFor(() => requests.length === 1);
    await evaluate(
        "window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))"
    );
    await waitFor(() =>
        evaluate(
            "document.querySelector('.arcade-trigger').getAttribute('aria-busy') === 'false'"
        )
    );
    await evaluate("document.querySelector('.arcade-trigger').click()");
    await releaseModule();
    await opened();
    assert.equal(
        requests.length,
        1,
        "new request reuses the cancelled import still in flight"
    );
    assert.equal(
        await evaluate("document.querySelectorAll('.arcade-section').length"),
        1,
        "only the current request mounts"
    );
    await close();

    await navigate("retry");
    await evaluate("document.querySelector('.arcade-trigger').click()");
    await waitFor(() => requests.length === 1);
    await send("Fetch.failRequest", {
        requestId: requests[0].requestId,
        errorReason: "ConnectionFailed",
    });
    await waitFor(() =>
        evaluate(
            "document.querySelector('[role=alert]') && document.querySelector('.arcade-trigger').getAttribute('aria-busy') === 'false'"
        )
    );
    assert.equal(
        await evaluate(
            "!document.querySelector('.arcade-section') && document.querySelector('.arcade-trigger').getAttribute('aria-expanded') === 'false' && document.documentElement.style.overflow === ''"
        ),
        true,
        "failed import releases the opening guard"
    );
    await evaluate("document.querySelector('.arcade-trigger').click()");
    await waitFor(() => requests.length === 2);
    await send("Fetch.failRequest", {
        requestId: requests[1].requestId,
        errorReason: "ConnectionFailed",
    });
    await waitFor(() =>
        evaluate(
            "document.querySelector('[role=alert]') && document.querySelector('.arcade-trigger').getAttribute('aria-busy') === 'false'"
        )
    );
    await evaluate("document.querySelector('.arcade-trigger').click()");
    await waitFor(() => requests.length === 3);
    await send("Fetch.continueRequest", { requestId: requests[2].requestId });
    await opened();
    assert.equal(
        await evaluate("document.querySelector('[role=alert]') === null"),
        true,
        "successful retry clears the error"
    );
    await close();

    await send("Fetch.disable");
    await send("Emulation.setDeviceMetricsOverride", {
        width: 393,
        height: 852,
        deviceScaleFactor: 1,
        mobile: true,
    });
    await navigate("menu");
    await evaluate("document.querySelector('.arcade-trigger').click()");
    await opened();
    await evaluate(
        "document.querySelector('.arcade-section').dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter', key: 'Enter', bubbles: true }))"
    );
    await waitFor(() =>
        evaluate(
            "!!document.querySelector('.arcade-status [aria-label=Playing]')"
        )
    );
    await evaluate(
        `window.originalCanvas = document.querySelector('canvas'); document.querySelector('[aria-label="Open menu"]').click()`
    );
    await waitFor(() =>
        evaluate(`!!document.querySelector('[aria-label="Close menu"]')`)
    );
    assert.equal(
        await evaluate(
            "originalCanvas === document.querySelector('canvas') && !!document.querySelector('.arcade-status [aria-label=Playing]')"
        ),
        true,
        "App rerender keeps the running game and canvas"
    );
    await evaluate(
        `document.querySelector('[aria-label="Close menu"]').click()`
    );
    await close();
    await waitFor(() =>
        evaluate("audioContexts.every(context => context.state === 'closed')")
    );

    await send("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
    });
    for (const closing of [false, true]) {
        await navigate(closing ? "early-resize" : "early-close");
        await evaluate(
            "document.querySelector('.arcade-trigger').focus(); document.fonts.ready.then(() => true)"
        );
        await waitFor(() =>
            evaluate(
                "performance.getEntriesByType('resource').some(entry => /Quorzak/.test(entry.name) && entry.responseEnd > 0)"
            )
        );
        if (closing) {
            await evaluate("document.querySelector('.arcade-trigger').click()");
            await opened();
        }
        const result = await evaluate(`new Promise((resolve, reject) => {
            const original = Element.prototype.animate, animations = [];
            Element.prototype.animate = function(...args) { const animation = original.apply(this, args); animations.push(animation); return animation; };
            let initial = null;
            const observer = new MutationObserver(() => {
                const section = document.querySelector('.arcade-section');
                if (section && !initial && animations.length) {
                    initial = animations.filter(a => a.playState !== 'idle').map(a => ({time: a.currentTime, start: a.startTime, state: a.playState}));
                    window.dispatchEvent(new Event('resize'));
                    if (!${closing}) section.querySelector('.arcade-exit').click();
                } else if (!section && initial) {
                    clearTimeout(timer); observer.disconnect(); Element.prototype.animate = original;
                    resolve({initial, cancelled: animations.every(a => a.playState === 'idle'), unlocked: document.documentElement.style.overflow === '', focus: document.activeElement === document.querySelector('.arcade-trigger')});
                }
            });
            observer.observe(document.querySelector('.arcade-slot'), {subtree: true, childList: true, attributes: true, attributeFilter: ['class']});
            const timer = setTimeout(() => {observer.disconnect(); Element.prototype.animate = original; reject(new Error('Early transition timeout'));}, 5000);
            document.querySelector(${JSON.stringify(closing ? ".arcade-exit" : ".arcade-trigger")}).click();
        })`);
        assert.equal(
            result.initial.length,
            2,
            "only panel and alien animations remain active after StrictMode cleanup"
        );
        assert.ok(
            result.initial.every(
                a => a.time === 0 && a.start === null && a.state === "paused"
            ),
            "transitions wait at zero before the first frame"
        );
        assert.ok(
            result.cancelled && result.unlocked && result.focus,
            "early close/resize cleans animations, scroll and focus"
        );
    }
    assert.deepEqual(
        errors,
        [],
        "loading failures are handled without uncaught exceptions"
    );
    console.log(
        "arcade loading: hover/focus/touch, shared pending import, fresh scroll, cancellation, retry, menu stability, early close/resize and cleanup passed"
    );
} finally {
    await send("Fetch.disable");
    socket.close();
}
