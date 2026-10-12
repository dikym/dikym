// Run Vite and Chrome with --remote-debugging-port=9222, then:
// node tests/space-invaders-page.check.mjs http://127.0.0.1:5173
import assert from "node:assert/strict";

// Arcade-font text must keep the ROM's 7/6 pixel aspect; descriptions and shortcuts are site UI.
const STRETCH_AUDIT = `(() => {
    const section = document.querySelector('.arcade-section');
    const walker = document.createTreeWalker(section, NodeFilter.SHOW_TEXT);
    const bad = [];
    for (let node; (node = walker.nextNode()); ) {
        const el = node.parentElement;
        if (!node.textContent.trim() || !el.getClientRects().length) continue;
        if (el.closest('.arcade-keyboard-hint, .sr-only')) continue;
        if (!getComputedStyle(el).fontFamily.includes('Space Invaders')) continue;
        let stretched = false;
        for (let e = el; e && e !== section; e = e.parentElement) {
            const y = Number(getComputedStyle(e).scale.split(' ')[1]);
            if (Math.abs(Math.abs(y) - 7 / 6) < 0.001) { stretched = true; break; }
        }
        if (!stretched) bad.push(node.textContent.trim());
    }
    return bad;
})()`;

const site = (process.argv[2] || "http://127.0.0.1:5173").replace(/\/$/, "");
const page = `${site}/space-invaders/`;
const tabs = await fetch("http://127.0.0.1:9222/json").then(r => r.json());
const socket = new WebSocket(
    tabs.find(t => t.type === "page").webSocketDebuggerUrl
);
await new Promise(resolve =>
    socket.addEventListener("open", resolve, { once: true })
);
let sequence = 0;
let paused;
const pending = new Map();
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
const viewport = (width, height) =>
    send("Emulation.setDeviceMetricsOverride", {
        width,
        height,
        deviceScaleFactor: 1,
        mobile: width < 600,
    });
const open = async (hash = "") => {
    // A hash-only change would not reload, and the injected clock needs a fresh document.
    await send("Page.navigate", { url: "about:blank" });
    await send("Page.navigate", { url: page + hash });
    await wait(
        "document.readyState === 'complete' && !!document.querySelector('.arcade-section.is-expanded')"
    );
    await evaluate("document.fonts.ready.then(() => true)");
};
// Key codes and text let the browser run default actions (button activation, dialog cancel).
const KEY_INFO = {
    Enter: { key: "Enter", text: "\r", windowsVirtualKeyCode: 13 },
    Space: { key: " ", text: " ", windowsVirtualKeyCode: 32 },
    Escape: { key: "Escape", windowsVirtualKeyCode: 27 },
    Tab: { key: "Tab", windowsVirtualKeyCode: 9 },
};
const key = async code => {
    const info = KEY_INFO[code] ?? { key: code };
    await send("Input.dispatchKeyEvent", { type: "keyDown", code, ...info });
    await send("Input.dispatchKeyEvent", {
        type: "keyUp",
        code,
        key: info.key,
    });
};

try {
    await send("Page.enable");
    // #random=<n> fixes Math.random; #clock replaces time and frames with advance(frames).
    await send("Page.addScriptToEvaluateOnNewDocument", {
        source: `(() => {
            const hash = new URLSearchParams(location.hash.slice(1));
            if (hash.has("random")) Math.random = () => Number(hash.get("random"));
            // Counts audio starts and exposes gain nodes; #holdaudio delays the WAV downloads.
            window.resumes = 0;
            const resume = AudioContext.prototype.resume;
            AudioContext.prototype.resume = function () { window.resumes++; return resume.call(this); };
            const createGain = AudioContext.prototype.createGain;
            AudioContext.prototype.createGain = function () { const gain = createGain.call(this); (window.gains ??= []).push(gain); return gain; };
            if (hash.has("holdaudio")) {
                const fetch = window.fetch;
                let release;
                const held = new Promise(resolve => { release = resolve; });
                window.releaseAudio = release;
                window.fetch = (url, ...rest) => String(url).endsWith(".wav") ? held.then(() => fetch(url, ...rest)) : fetch(url, ...rest);
            }
            if (!hash.has("clock")) return;
            const callbacks = new Map();
            let id = 0;
            let time = performance.now();
            performance.now = () => time;
            window.requestAnimationFrame = cb => { callbacks.set(++id, cb); return id; };
            window.cancelAnimationFrame = handle => callbacks.delete(handle);
            window.advance = frames => {
                for (let i = 0; i < frames; i++) {
                    time += ((320 * 262) / (19968000 / 4)) * 1000;
                    const due = [...callbacks.values()];
                    callbacks.clear();
                    due.forEach(cb => cb(time));
                }
            };
        })()`,
    });
    await send("Emulation.setFocusEmulationEnabled", { enabled: true });
    for (const [width, height] of [
        [1280, 900],
        [393, 852],
        [375, 667],
    ]) {
        await viewport(width, height);
        await open();
        assert.equal(await evaluate("!!document.querySelector('nav')"), false);
        assert.ok(
            await evaluate(
                "document.scrollingElement.scrollHeight <= innerHeight"
            ),
            `no page scroll at ${width}×${height}`
        );
        assert.deepEqual(
            await evaluate(`(() => {
                const sound = document.querySelector('.arcade-sound').getBoundingClientRect();
                return [sound.top, innerWidth - sound.right];
            })()`),
            [12, 12],
            `sound button sits in the window's top-right corner at ${width}×${height}`
        );
    }
    await viewport(1280, 900);
    await open();
    assert.equal(
        await evaluate("!!document.querySelector('.arcade-exit')"),
        false,
        "no close button"
    );
    assert.ok(
        await evaluate(`(() => {
            const sound = document.querySelector('.arcade-sound').getBoundingClientRect();
            const panel = document.querySelector('.arcade-panel').getBoundingClientRect();
            return panel.right - sound.right < 24 && sound.left - panel.left > panel.width / 2;
        })()`),
        "sound button sits in the right corner"
    );
    assert.ok(
        await evaluate(
            "!!document.querySelector('.arcade-keyboard-hint kbd[aria-label=\"Up arrow\"]')"
        ),
        "up arrow listed for fire"
    );
    const credit = await evaluate(
        "document.querySelector('.arcade-credit').textContent"
    );
    assert.match(credit, /Taito/);
    assert.match(credit, /Diky/);
    assert.equal(
        await evaluate("document.querySelector('.arcade-credit a').href"),
        "https://dikym.me/"
    );
    await evaluate("document.querySelector('.arcade-credit button').click()");
    assert.ok(
        await evaluate("document.querySelector('.arcade-notice').open"),
        "notice opens"
    );
    assert.match(
        await evaluate("document.querySelector('.arcade-notice').textContent"),
        /not affiliated with or endorsed by Taito/
    );
    await key("Enter");
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.equal(
        await evaluate("document.querySelector('.arcade-notice').open"),
        false,
        "Enter closes the notice"
    );
    assert.ok(
        await evaluate("!!document.querySelector('.arcade-attract')"),
        "Enter in the notice does not start the game"
    );
    await evaluate("document.querySelector('.arcade-credit button').click()");
    await key("Escape");
    assert.equal(
        await evaluate("document.querySelector('.arcade-notice').open"),
        false,
        "Escape closes the notice"
    );
    assert.equal(
        await evaluate(
            "document.activeElement === document.querySelector('canvas')"
        ),
        true,
        "closing the notice returns focus to the game"
    );
    assert.equal(
        await evaluate(
            "document.querySelector('.arcade-keyboard-hint .arcade-start-hint').textContent.replace(/\\s+/g, ' ').trim()"
        ),
        "Enter Start"
    );
    await key("Escape");
    assert.ok(
        await evaluate(
            "!!document.querySelector('.arcade-section.is-expanded')"
        ),
        "Escape keeps the game open"
    );
    const text = () =>
        evaluate(
            "[...document.querySelectorAll('.arcade-attract-text')].map(e => (e.classList.contains('arcade-attract-flipped') ? '^' : '') + e.textContent).filter(Boolean)"
        );
    const carrier = () =>
        evaluate("!!document.querySelector('.arcade-attract-carrier')");
    const advance = frames => evaluate(`advance(${frames})`);
    const playfieldPoint = () =>
        evaluate(
            "(() => { const r = document.querySelector('.arcade-playfield').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 3]; })()"
        );
    const tapPlayfield = async () => {
        const [x, y] = await playfieldPoint();
        await send("Input.synthesizeTapGesture", {
            x,
            y,
            gestureSourceType: "touch",
        });
    };
    const table = [
        "*SCORE ADVANCE TABLE*",
        "=? MYSTERY",
        "=30 POINTS",
        "=20 POINTS",
        "=10 POINTS",
    ];

    // Upside-down variant, frame by frame against the ROM timeline.
    await open("#random=0.1&clock");
    assert.equal(
        await evaluate(
            "getComputedStyle(document.querySelector('.arcade-lives')).visibility"
        ),
        "hidden",
        "title screen shows only CREDIT"
    );
    await advance(63);
    assert.deepEqual(await text(), []);
    await advance(1);
    assert.deepEqual(await text(), ["P"]);
    await advance(18);
    assert.deepEqual(await text(), ["PLA", "^Y"]);
    await advance(6);
    assert.deepEqual(await text(), ["PLA", "S", "^Y"]);
    await advance(388);
    assert.deepEqual(await text(), ["PLA", "SPACE  INVADERS", ...table, "^Y"]);
    assert.equal(
        await evaluate(
            "document.querySelectorAll('.arcade-attract-sprite:not(.arcade-attract-carrier)').length"
        ),
        4
    );
    await advance(224);
    assert.ok(await carrier(), "alien approaches at frame 700");
    await advance(100);
    assert.ok(await carrier(), "alien pulls the Y at frame 800");
    assert.ok(
        !(await text()).some(t => t === "Y" || t === "^Y"),
        "the ROM's pull image draws the Y, so no text Y doubles it"
    );
    await advance(241);
    assert.equal(await carrier(), false, "alien gone at frame 1041");
    assert.deepEqual(await text(), ["PLA", "SPACE  INVADERS", ...table, "Y"]);
    assert.ok(
        Math.abs(
            (await evaluate(
                "parseFloat([...document.querySelectorAll('.arcade-attract-text')].at(-1).style.left)"
            )) -
                (120 / 224) * 100
        ) < 1e-3,
        "final Y one column left of a typed Y"
    );
    assert.equal(
        await evaluate("/INSERT|COIN/.test(document.body.textContent)"),
        false
    );

    // How to start sits below the game, outside the playfield: Enter on keyboards, a tap on touch screens.
    const hint = () =>
        evaluate(`(() => {
            const field = document.querySelector('.arcade-playfield').getBoundingClientRect();
            const hints = [...document.querySelectorAll('.arcade-start-hint')]
                .filter(e => e.getClientRects().length && getComputedStyle(e).visibility === 'visible');
            return {text: hints.map(e => e.textContent.replace(/\\s+/g, ' ').trim()).join('|'),
                below: hints.every(e => e.getBoundingClientRect().top >= field.bottom),
                inPlayfield: !!document.querySelector('.arcade-playfield .arcade-start-hint, .arcade-attract-hint')};
        })()`);
    await open("#random=0.9&clock");
    await advance(476);
    assert.deepEqual(await hint(), {
        text: "Enter Start",
        below: true,
        inPlayfield: false,
    });
    await key("Enter");
    await wait("!document.querySelector('.arcade-attract')");
    assert.equal(
        (await hint()).text,
        "Enter Pause",
        "hint stays while playing"
    );

    // Enter pauses and resumes the game; the picture freezes while paused.
    const picture = () =>
        evaluate("document.querySelector('canvas').toDataURL()");
    let before = await picture();
    await advance(60);
    assert.notEqual(await picture(), before, "the game runs");
    await key("Enter");
    assert.equal((await hint()).text, "Enter Resume");
    before = await picture();
    await advance(60);
    assert.equal(await picture(), before, "the game is paused");
    await key("Enter");
    assert.equal((await hint()).text, "Enter Pause");
    before = await picture();
    await advance(60);
    assert.notEqual(await picture(), before, "the game resumes");

    // The page only hosts the game: focus always returns to it, without a focus outline.
    const inGame =
        "document.querySelector('.arcade-section').contains(document.activeElement)";
    await evaluate("document.activeElement.blur()");
    await wait(inGame);
    assert.equal((await hint()).text, "Enter Pause");
    for (const type of ["mousePressed", "mouseReleased"])
        await send("Input.dispatchMouseEvent", {
            type,
            x: 2,
            y: 2,
            button: "left",
            clickCount: 1,
        });
    await wait(inGame);
    for (let i = 0; i < 4; i++) {
        await key("Tab");
        await wait(inGame);
    }
    assert.deepEqual(
        await evaluate(
            "[document.querySelector('.arcade-game'), document.querySelector('canvas'), document.querySelector('.arcade-section')].map(e => getComputedStyle(e).outlineStyle)"
        ),
        ["none", "none", "none"],
        "no focus outline"
    );
    before = await picture();
    await advance(60);
    assert.notEqual(await picture(), before, "the game keeps running");
    // Clicking mute keeps the game in focus, so Enter still pauses.
    await evaluate("document.querySelector('.arcade-sound').click()");
    assert.equal(await evaluate("document.activeElement.tagName"), "CANVAS");
    assert.equal((await hint()).text, "Enter Pause");
    await key("Enter");
    assert.equal(
        (await hint()).text,
        "Enter Resume",
        "Enter pauses after mute"
    );
    await key("Enter");
    await open("#random=0.9&clock");
    await evaluate("document.activeElement.blur()");
    await wait(inGame);
    await key("Enter");
    await wait("!document.querySelector('.arcade-attract')");
    await viewport(393, 852);
    await open("#random=0.9&clock");
    await advance(476);
    assert.deepEqual(await hint(), {
        text: "Tap to start",
        below: true,
        inPlayfield: false,
    });
    await viewport(1280, 900);

    // Move, Fire and Enter Start fit on one line wherever the keyboard hints show.
    for (const [width, height] of [
        [701, 800],
        [1280, 900],
    ]) {
        await viewport(width, height);
        await open("#random=0.9&clock");
        const tops = await evaluate(
            "[...document.querySelectorAll('.arcade-keyboard-hint > span')].map(e => Math.round(e.getBoundingClientRect().top))"
        );
        assert.equal(tops.length, 3);
        assert.equal(
            new Set(tops).size,
            1,
            `one hint line at ${width}×${height}: ${tops}`
        );
    }
    await viewport(1280, 900);

    // Normal variant: PLAY typed with a correct Y, no carrier.
    await open("#random=0.9&clock");
    await advance(476);
    assert.deepEqual(await text(), ["PLA", "SPACE  INVADERS", ...table, "Y"]);
    assert.deepEqual(await evaluate(STRETCH_AUDIT), [], "title text keeps 7/6");
    await advance(400);
    assert.equal(await carrier(), false);

    // Font assumption behind the one-column text inset: ink starts at the box edge.
    assert.ok(
        Math.abs(
            (await evaluate(`(() => {
                const ctx = document.createElement('canvas').getContext('2d');
                ctx.font = '16px "Space Invaders"';
                return ctx.measureText('Y').actualBoundingBoxLeft;
            })()`)) - 0
        ) < 0.5
    );

    // The title screen has no Start button; Enter starts mid-sequence and skips the rest.
    await open("#random=0.1&clock");
    await advance(300);
    assert.equal(
        await evaluate(
            "document.querySelectorAll('.arcade-playfield button').length"
        ),
        0,
        "no Start button on the title screen"
    );
    await key("Space");
    await advance(1);
    assert.ok(
        await evaluate("!!document.querySelector('.arcade-attract')"),
        "Space is fire, not start"
    );
    const [mx, my] = await playfieldPoint();
    for (const type of ["mousePressed", "mouseReleased"])
        await send("Input.dispatchMouseEvent", {
            type,
            x: mx,
            y: my,
            button: "left",
            clickCount: 1,
        });
    await advance(1);
    assert.ok(
        await evaluate("!!document.querySelector('.arcade-attract')"),
        "a mouse click does not start"
    );
    await key("Enter");
    await wait("!document.querySelector('.arcade-attract')");
    assert.equal(
        await evaluate(
            "getComputedStyle(document.querySelector('.arcade-lives')).visibility"
        ),
        "visible"
    );
    assert.deepEqual(await evaluate(STRETCH_AUDIT), [], "game text keeps 7/6");

    // Touch screens have no Enter key: a tap on the playfield starts.
    await open("#random=0.1&clock");
    await advance(300);
    await tapPlayfield();
    await wait("!document.querySelector('.arcade-attract')");

    // One muted start resumes the audio context a fixed number of times.
    await open("#random=0.1&clock");
    await evaluate("document.querySelector('.arcade-sound').click()");
    await evaluate("document.querySelector('.arcade-section').focus()");
    await key("Enter");
    await wait("!document.querySelector('.arcade-attract')");
    const oneStart = await evaluate("resumes");
    assert.ok(oneStart > 0);
    assert.equal(await evaluate("scrollY"), 0);

    // Review focus 1: a held Enter (auto-repeat) starts once.
    await open("#random=0.1&clock");
    await evaluate("document.querySelector('.arcade-sound').click()");
    await evaluate("document.querySelector('.arcade-section').focus()");
    await send("Input.dispatchKeyEvent", {
        type: "keyDown",
        code: "Enter",
        key: "Enter",
    });
    await send("Input.dispatchKeyEvent", {
        type: "keyDown",
        code: "Enter",
        key: "Enter",
        autoRepeat: true,
    });
    await send("Input.dispatchKeyEvent", {
        type: "keyUp",
        code: "Enter",
        key: "Enter",
    });
    await wait("!document.querySelector('.arcade-attract')");
    assert.equal(await evaluate("resumes"), oneStart, "held Enter starts once");

    // Review focus 5: mute set on the title screen silences the game; unmute restores it.
    await advance(30);
    assert.equal(await evaluate("gains[0].gain.value"), 0, "muted after start");
    await evaluate("document.querySelector('.arcade-sound').click()");
    await advance(1);
    assert.ok(
        await evaluate("gains[0].gain.value > 0"),
        "unmute restores sound"
    );

    // Enter, then a tap while the audio still downloads, start one game, not two.
    await open("#random=0.1&clock&holdaudio");
    await evaluate("document.querySelector('.arcade-sound').click()");
    await evaluate("document.querySelector('.arcade-section').focus()");
    await key("Enter");
    await tapPlayfield();
    await evaluate("releaseAudio()");
    await wait("!document.querySelector('.arcade-attract')");
    assert.equal(
        await evaluate("resumes"),
        oneStart,
        "overlapping starts run once"
    );

    // Standalone game over and Play again (development server only: needs /src modules).
    await open("#random=0.9&clock");
    await key("Enter");
    await wait("!document.querySelector('.arcade-attract')");
    const imported = await send("Runtime.evaluate", {
        expression: "import('/src/game/invaders.ts').then(m => m.step)",
        awaitPromise: true,
    });
    if (imported.exceptionDetails)
        console.log("skipped standalone game over: no /src modules here");
    else {
        await send("Debugger.enable");
        const breakpoint = await send("Debugger.setBreakpointOnFunctionCall", {
            objectId: imported.result.objectId,
        });
        const stopped = new Promise(resolve => {
            paused = resolve;
        });
        const tick = evaluate("advance(1)");
        const frame = (await stopped).callFrames[0];
        await send("Debugger.evaluateOnCallFrame", {
            callFrameId: frame.callFrameId,
            expression:
                "g.memory[0x20e7]=0; g.memory[0x21ff]=0; g.memory[0x2015]=0;",
        });
        await send("Debugger.removeBreakpoint", {
            breakpointId: breakpoint.breakpointId,
        });
        await send("Debugger.resume");
        await tick;
        await send("Debugger.disable");
        await advance(1);
        // ROM $16C9: "GAME OVER" typed at $2D18 over the frozen playfield; no panel, no button.
        await wait("!!document.querySelector('.arcade-game-over')");
        assert.equal(
            await evaluate(
                "!!document.querySelector('.arcade-title-screen') || document.querySelectorAll('.arcade-playfield button').length"
            ),
            0,
            "no game-over panel or button"
        );
        await advance(60);
        const over = await evaluate(`(() => {
            const field = document.querySelector('.arcade-playfield').getBoundingClientRect();
            const text = document.querySelector('.arcade-game-over');
            const r = text.getBoundingClientRect();
            return {text: text.textContent, left: (r.left - field.left) / field.width * 224, top: (r.top - field.top) / field.height * 208 + 32};
        })()`);
        assert.equal(over.text, "GAME OVER");
        assert.ok(
            Math.abs(over.left - 73) < 0.5,
            `GAME OVER ink at x=73: ${over.left}`
        );
        assert.ok(
            Math.abs(over.top - 56) < 0.5,
            `GAME OVER cell at y=56: ${over.top}`
        );
        assert.deepEqual(
            await evaluate(STRETCH_AUDIT),
            [],
            "game over text keeps 7/6"
        );
        assert.equal(
            (await hint()).text,
            "Enter Play again",
            "game over offers Enter"
        );
        await key("Enter");
        await wait(
            "!document.querySelector('.arcade-title-screen') && !document.querySelector('.arcade-attract')"
        );
        assert.equal(
            (await hint()).text,
            "Enter Pause",
            "new game shows Pause"
        );
    }

    // Review focus 2 and 3: short phone fits the whole table; text follows a resize.
    await viewport(375, 667);
    await open("#random=0.9&clock");
    await advance(476);
    assert.ok(
        await evaluate(
            "[...document.querySelectorAll('.arcade-attract-text')].every(e => e.getBoundingClientRect().bottom <= innerHeight)"
        )
    );
    await viewport(1280, 900);
    await advance(1);
    assert.ok(
        await evaluate(`(() => {
            const field = document.querySelector('.arcade-playfield').getBoundingClientRect();
            const play = document.querySelector('.arcade-attract-text').getBoundingClientRect();
            return Math.abs((play.left - field.left) / field.width - 97 / 224) < 0.002;
        })()`)
    );

    // The game sits in the middle of the page.
    for (const [width, height] of [
        [1280, 900],
        [1920, 1080],
        [667, 375],
    ]) {
        await viewport(width, height);
        await open("#random=0.9&clock");
        const centered = await evaluate(`(() => {
            const r = document.querySelector('.arcade-section').getBoundingClientRect();
            return [r.top - (innerHeight - r.bottom), r.left - (innerWidth - r.right)];
        })()`);
        assert.ok(
            centered.every(offset => Math.abs(offset) < 1.5),
            `centered at ${width}×${height}: ${centered}`
        );
    }
    await viewport(1280, 900);

    // Review focus 4: a saved dark theme does not change the page.
    await evaluate("localStorage.setItem('theme', 'dark')");
    await open("#random=0.9&clock");
    assert.equal(
        await evaluate("getComputedStyle(document.body).backgroundColor"),
        "rgb(0, 0, 0)"
    );
    assert.equal(
        await evaluate(
            "getComputedStyle(document.querySelector('.arcade-section')).color"
        ),
        "rgb(255, 255, 255)"
    );
    await evaluate("localStorage.removeItem('theme')");

    // Reduced motion shows the final screen at once.
    await send("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });
    await open("#random=0.1&clock");
    await advance(1);
    assert.deepEqual(await text(), ["PLA", "SPACE  INVADERS", ...table, "Y"]);
    assert.equal(await carrier(), false);
    await send("Emulation.setEmulatedMedia", { features: [] });

    // Enter starts and hands keyboard focus to the game.
    await open("#random=0.1&clock");
    await key("Enter");
    await wait(
        "!document.querySelector('.arcade-attract') && document.activeElement?.tagName === 'CANVAS'"
    );
    console.log("space-invaders page: ok");
} finally {
    socket.close();
}
