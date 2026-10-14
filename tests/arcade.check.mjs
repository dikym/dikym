// Run Vite and Chromium with --remote-debugging-port=9222, then:
// node tests/arcade.check.mjs http://127.0.0.1:5173
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
        if (!getComputedStyle(el).fontFamily.includes('Quorzak')) continue;
        let stretched = false;
        for (let e = el; e && e !== section; e = e.parentElement) {
            const y = Number(getComputedStyle(e).scale.split(' ')[1]);
            if (Math.abs(Math.abs(y) - 7 / 6) < 0.001) { stretched = true; break; }
        }
        if (!stretched) bad.push(node.textContent.trim());
    }
    return bad;
})()`;
import { writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

// The canvas shows the field at a whole-number scale; nearest-neighbour reads it back at 224x208.
const FIELD = `(() => {
    const c = document.createElement('canvas');
    c.width = 224;
    c.height = 208;
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    x.drawImage(document.querySelector('canvas'), 0, 0, 224, 208);
    return x;
})()`;

const tabs = await fetch("http://127.0.0.1:9222/json").then(r => r.json());
const socket = new WebSocket(
    tabs.find(tab => tab.type === "page").webSocketDebuggerUrl
);
await new Promise(resolve =>
    socket.addEventListener("open", resolve, { once: true })
);
let sequence = 0;
const pending = new Map();
const errors = [];
socket.addEventListener("message", event => {
    const message = JSON.parse(event.data);
    if (message.method === "Runtime.exceptionThrown")
        errors.push(message.params.exceptionDetails);
    if (message.id) {
        const { resolve, reject } = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) reject(new Error(JSON.stringify(message.error)));
        else resolve(message.result);
    }
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
    });
    assert.ok(
        !result.exceptionDetails,
        JSON.stringify(result.exceptionDetails)
    );
    return result.result.value;
};
const waitFor = async expression => {
    for (let i = 0; i < 100; i++) {
        if (await evaluate(expression)) return;
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert.fail(
        `Timed out: ${expression}\n${JSON.stringify(await evaluate(`({width:innerWidth,height:innerHeight,scrollY,sections:[...document.querySelectorAll('main > section, .arcade-section, footer')].map(e=>({id:e.id,top:e.getBoundingClientRect().top,height:e.getBoundingClientRect().height}))})`))}`
    );
};
const click = async selector => {
    await evaluate(
        `document.querySelector(${JSON.stringify(selector)}).click()`
    );
    await evaluate("if (window.tickArcade) tickArcade(3)");
};
const mouseClick = async selector => {
    const point = await evaluate(
        `(() => { const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`
    );
    for (const type of ["mousePressed", "mouseReleased"])
        await send("Input.dispatchMouseEvent", {
            type,
            ...point,
            button: "left",
            clickCount: 1,
        });
};
const scrollStyles = () =>
    evaluate(`['overflow', 'overflowAnchor', 'touchAction', 'scrollbarGutter']
        .map(property => document.documentElement.style[property])`);
const checkScrollLocked = async () => {
    assert.deepEqual(
        await scrollStyles(),
        ["hidden", "none", "none", "stable"],
        "animation locks user scroll while allowing scripted scroll"
    );
};
const checkOpeningPosition = async () => {
    const position = await evaluate(`(() => {
        const section = document.querySelector('.arcade-section').getBoundingClientRect();
        const navbar = document.querySelector('header > nav').getBoundingClientRect();
        return {top: section.top - navbar.bottom, bottom: innerHeight - section.bottom};
    })()`);
    assert.ok(
        Math.abs(position.top - Math.max(0, position.bottom)) < 1,
        "opening centers the arcade below the navbar"
    );
};
const checkCloseSpacing = async () => {
    const gaps = await evaluate(`(() => {
        const section = document.querySelector('.arcade-panel').getBoundingClientRect();
        const button = document.querySelector('.arcade-exit').getBoundingClientRect();
        return [button.top - section.top, section.right - button.right];
    })()`);
    assert.deepEqual(gaps, [12, 12], "Close stays at the panel's top right");
    const spacing = await evaluate(`(() => {
        const buttons = document.querySelector('.arcade-marquee').getBoundingClientRect();
        const screen = document.querySelector('.arcade-screen').getBoundingClientRect();
        const controls = document.querySelector('.arcade-controls').getBoundingClientRect();
        return {actual: screen.top - buttons.bottom, expected: controls.top - screen.bottom};
    })()`);
    assert.ok(
        Math.abs(spacing.actual - spacing.expected) < 0.1,
        "screen has equal gaps to header buttons and touch controls"
    );
};
const checkMobileButtons = async () => {
    assert.deepEqual(
        await evaluate(`(() => {
            const controls = document.querySelector('.arcade-marquee');
            const style = getComputedStyle(controls);
            return [style.visibility, style.opacity, style.transitionDuration,
                controls.getAnimations({subtree: true}).length,
                controls.offsetParent === document.querySelector('.arcade-panel')];
        })()`),
        ["visible", "1", "0s", 0, true],
        "mobile sound and Close have no independent animation"
    );
    await checkCloseSpacing();
};
const key = (type, key, code) =>
    send("Input.dispatchKeyEvent", {
        type,
        key,
        code,
        text: type === "keyDown" && code === "Enter" ? "\r" : undefined,
        windowsVirtualKeyCode: {
            Tab: 9,
            Enter: 13,
            Escape: 27,
            Space: 32,
            ArrowRight: 39,
        }[code],
    });

// Arrange end-game scenarios through the debugger, without a production test API.
const setUpGame = async expression => {
    await send("Debugger.enable");
    const engine = await send("Runtime.evaluate", {
        expression: `import(performance.getEntriesByType('resource').find(entry => entry.name.includes('/src/game/machine.ts')).name).then(module => module.step)`,
        awaitPromise: true,
    });
    assert.equal(engine.result.type, "function", engine.result.description);
    const breakpoint = await send("Debugger.setBreakpointOnFunctionCall", {
        objectId: engine.result.objectId,
    });
    const paused = new Promise(resolve => {
        const listener = event => {
            const message = JSON.parse(event.data);
            if (message.method !== "Debugger.paused") return;
            socket.removeEventListener("message", listener);
            resolve(message.params.callFrames[0].callFrameId);
        };
        socket.addEventListener("message", listener);
    });
    const finalShot = evaluate("tickArcade(1)");
    const callFrameId = await paused;
    const arranged = await send("Debugger.evaluateOnCallFrame", {
        callFrameId,
        expression,
    });
    assert.ok(
        !arranged.exceptionDetails,
        JSON.stringify(arranged.exceptionDetails)
    );
    await send("Debugger.removeBreakpoint", {
        breakpointId: breakpoint.breakpointId,
    });
    await send("Debugger.resume");
    await finalShot;
    await send("Debugger.disable");
};

try {
    await send("Runtime.enable");
    await send("Page.enable");
    await send("Page.addScriptToEvaluateOnNewDocument", {
        source: `window.arcadeAudioContexts = [];
            window.AudioContext = class extends AudioContext {
                constructor(...args) { super(...args); arcadeAudioContexts.push(this); }
            };
            window.initialScrollSamples = [];
            window.recordInitialScroll = () => {
                initialScrollSamples.push(scrollY);
                window.initialScrollFrame = requestAnimationFrame(recordInitialScroll);
            };
            requestAnimationFrame(recordInitialScroll);`,
    });
    await send("Emulation.setFocusEmulationEnabled", { enabled: true });
    await send("Emulation.setDeviceMetricsOverride", {
        width: 1280,
        height: 900,
        deviceScaleFactor: 1,
        mobile: false,
    });
    // Runtime.enable replays errors from the previously inspected page.
    errors.length = 0;
    await send("Page.navigate", {
        url: process.argv[2] || "http://127.0.0.1:5173",
    });
    await waitFor('!!document.querySelector("nav button")');
    for (const [width, height] of [
        [375, 667],
        [1280, 900],
        [393, 852],
        [1280, 900],
    ]) {
        await send("Emulation.setDeviceMetricsOverride", {
            width,
            height,
            deviceScaleFactor: 1,
            mobile: width < 700,
        });
        await evaluate(
            "new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))"
        );
        assert.equal(
            await evaluate("scrollY"),
            0,
            "resize at page top must keep scroll at zero from initial render"
        );
    }
    await evaluate("document.fonts.ready");
    await waitFor("!document.querySelector('.curtain')");
    assert.equal(
        await evaluate(
            "performance.getEntriesByType('resource').some(entry => entry.name.includes('/src/game/machine.ts') || entry.name.includes('/src/game/cpu8080.js'))"
        ),
        false,
        "opening the portfolio does not load the arcade engine"
    );
    await evaluate("cancelAnimationFrame(initialScrollFrame)");
    assert.ok(
        await evaluate("initialScrollSamples.every(y => y === 0)"),
        "initial render and resize never scroll away from the top"
    );
    const scrollCapture = await evaluate(`(async () => {
        const { captureScrollPosition } = await import('/src/hooks/usePreserveScrollPosition.ts');
        const same = (a, b) => a.element === b.element && a.progress === b.progress
            && a.scrollY === b.scrollY && a.width === b.width && a.height === b.height;
        const fresh = captureScrollPosition();
        const element = fresh.element;
        const originalRect = element.getBoundingClientRect;
        let reads = 0;
        element.getBoundingClientRect = function () { reads++; return originalRect.call(this); };
        let cached;
        try { cached = captureScrollPosition(element); }
        finally { element.getBoundingClientRect = originalRect; }
        const outside = captureScrollPosition(document.querySelector('footer'));
        const detached = captureScrollPosition(document.createElement('section'));
        const next = document.querySelector('#about');
        const nextRect = next.getBoundingClientRect;
        const first = document.querySelector('#home');
        const firstRect = first.getBoundingClientRect;
        const center = (document.querySelector('header > nav').getBoundingClientRect().bottom + innerHeight) / 2;
        let boundary;
        first.getBoundingClientRect = () => new DOMRect(0, center - 100, innerWidth, 100);
        next.getBoundingClientRect = () => new DOMRect(0, center, innerWidth, 100);
        try { boundary = same(captureScrollPosition(), captureScrollPosition(next)); }
        finally { first.getBoundingClientRect = firstRect; next.getBoundingClientRect = nextRect; }
        const originalTransform = element.style.transform;
        let moved, movedFresh;
        try {
            element.style.transform = 'translateY(-12px)';
            moved = captureScrollPosition(element);
            movedFresh = captureScrollPosition();
        } finally { element.style.transform = originalTransform; }
        return { same: same(fresh, cached), reads, outside: same(fresh, outside),
            detached: same(fresh, detached), boundary, moved: same(moved, movedFresh),
            measuredAgain: moved.progress !== fresh.progress };
    })()`);
    assert.deepEqual(
        scrollCapture,
        {
            same: true,
            reads: 1,
            outside: true,
            detached: true,
            boundary: true,
            moved: true,
            measuredAgain: true,
        },
        "scroll capture measures the retained section once, falls back for a different or removed section or a shared boundary, and reads current geometry"
    );
    for (const [width, height] of [
        [1280, 900],
        [390, 844],
        [768, 1024],
        [1024, 768],
        [960, 900],
        [961, 900],
        [1920, 1080],
    ]) {
        await send("Emulation.setDeviceMetricsOverride", {
            width,
            height,
            deviceScaleFactor: 1,
            mobile: false,
        });
        const layout = await evaluate(`(() => {
            const hero = document.querySelector('#home > .wrap');
            const list = document.querySelector('#projects aside');
            return {
                heroColumns: getComputedStyle(hero).gridTemplateColumns.split(' ').length,
                projectDirection: getComputedStyle(list).flexDirection,
                skillColumns: [...document.querySelectorAll('#skills .grid-cols-4')].map(grid => getComputedStyle(grid).gridTemplateColumns.split(' ').length),
                aboutCopyFillsRow: document.querySelector('#about .rv').clientWidth === document.querySelector('#about .rv').parentElement.clientWidth,
                descriptionsUncapped: [...document.querySelectorAll('main > section p')].every(p => getComputedStyle(p).maxWidth === 'none' && getComputedStyle(p.parentElement).maxWidth === 'none'),
                overflow: document.documentElement.scrollWidth > innerWidth,
            };
        })()`);
        assert.equal(
            layout.heroColumns,
            width <= 960 ? 1 : 2,
            "hero reflows with the tablet navigation breakpoint"
        );
        assert.equal(
            layout.projectDirection,
            width <= 960 ? "row" : "column",
            "tablet projects use a horizontal picker"
        );
        assert.equal(
            layout.overflow,
            false,
            "responsive layouts must not overflow the page"
        );
        assert.ok(
            layout.skillColumns.length > 0 &&
                layout.skillColumns.every(
                    columns =>
                        columns ===
                        (width >= 1024
                            ? 10
                            : width >= 768
                              ? 6
                              : width >= 640
                                ? 5
                                : 4)
                ),
            "tablet skills use six columns while phone and desktop keep their original columns"
        );
        if (width >= 768 && width < 1024) {
            assert.equal(
                layout.aboutCopyFillsRow,
                true,
                "tablet About paragraphs fill the available row"
            );
            assert.equal(
                layout.descriptionsUncapped,
                true,
                "tablet section descriptions have no width cap"
            );
        }
        for (const label of [
            "About",
            "Skills",
            "Projects",
            "Contact",
            "About",
        ]) {
            if (width <= 960) await click('[aria-label="Open menu"]');
            await evaluate(
                `Array.from(document.querySelectorAll(${JSON.stringify(width <= 960 ? "#mobile-menu button" : "header > nav > .wrap button")})).find(button => button.textContent.trim() === ${JSON.stringify(label)}).click()`
            );
            await evaluate(`new Promise(resolve => {
                let previous = window.scrollY;
                let stable = 0;
                const check = () => {
                    stable = window.scrollY === previous ? stable + 1 : 0;
                    previous = window.scrollY;
                    if (stable >= 10) resolve(); else requestAnimationFrame(check);
                };
                requestAnimationFrame(check);
            })`);
            const gap = await evaluate(
                `document.getElementById(${JSON.stringify(label.toLowerCase())}).getBoundingClientRect().top - document.querySelector('header > nav').getBoundingClientRect().bottom`
            );
            const contactAtPageEnd =
                label === "Contact" &&
                (await evaluate(
                    "window.scrollY >= document.documentElement.scrollHeight - window.innerHeight - 0.5"
                ));
            assert.ok(
                Math.abs(gap) <= 0.5 || contactAtPageEnd,
                `${label} at ${width}px aligns to the nearest scroll pixel (gap ${gap}px)`
            );
        }
        if (width <= 960) {
            const portfolio = await evaluate(`(() => {
                const list = document.querySelector('#projects aside');
                list.scrollLeft = list.scrollWidth;
                const result = {
                    scrollbar: getComputedStyle(list).scrollbarWidth,
                    webkitScrollbar: getComputedStyle(list, '::-webkit-scrollbar').display,
                    scrolled: list.scrollLeft > 0,
                    overflows: list.scrollWidth > list.clientWidth,
                };
                list.scrollLeft = 0;
                return result;
            })()`);
            assert.equal(portfolio.scrollbar, "none");
            assert.equal(portfolio.webkitScrollbar, "none");
            assert.equal(
                portfolio.scrolled,
                portfolio.overflows,
                "phone and tablet projects remain scrollable when needed"
            );
        }
    }
    await send("Emulation.setDeviceMetricsOverride", {
        width: 1280,
        height: 900,
        deviceScaleFactor: 1,
        mobile: false,
    });
    assert.equal(
        await evaluate(
            'document.fonts.load(\'16px "Quorzak"\', "SCORE HI-SCORE 0123456789").then(fonts => fonts.length > 0 && fonts.every(font => font.status === "loaded"))'
        ),
        true
    );
    await click("nav button");
    await click("nav button");
    await click("nav button");
    assert.equal(
        await evaluate('!!document.querySelector(".arcade-section")'),
        false,
        "logo clicks no longer open the game"
    );
    const footerAlienSize = () =>
        evaluate(`(() => {
            const rect = document.querySelector('.arcade-trigger svg').getBoundingClientRect();
            return [rect.width, rect.height];
        })()`);
    const desktopAlienSize = await footerAlienSize();
    await send("Emulation.setDeviceMetricsOverride", {
        width: 375,
        height: 667,
        deviceScaleFactor: 1,
        mobile: true,
    });
    const mobileAlienSize = await footerAlienSize();
    await click(".arcade-trigger");
    await waitFor(
        "!!document.querySelector('.arcade-section.is-expanded') && !document.querySelector('.arcade-arriving-alien')"
    );
    assert.equal(
        await evaluate(
            "document.querySelector('.arcade-slot').style.getPropertyValue('--arcade-height-width')"
        ),
        "",
        "viewport fitting belongs to the game, not the persistent footer wrapper"
    );
    await click(".arcade-exit");
    await waitFor("!document.querySelector('.arcade-section')");
    assert.deepEqual(
        await footerAlienSize(),
        mobileAlienSize,
        "mobile open/close preserves the original footer alien dimensions"
    );
    await send("Emulation.setDeviceMetricsOverride", {
        width: 1280,
        height: 900,
        deviceScaleFactor: 1,
        mobile: false,
    });
    assert.deepEqual(
        await footerAlienSize(),
        desktopAlienSize,
        "desktop to mobile, open/close, then desktop restores the original alien dimensions"
    );
    await evaluate(
        'document.querySelector(".arcade-trigger").scrollIntoView({behavior:"instant", block:"center"}); document.querySelector(".arcade-trigger").focus()'
    );
    assert.equal(
        await evaluate(
            'document.querySelector(".arcade-entry").getBoundingClientRect().height'
        ),
        0,
        "floating alien adds no layout height"
    );
    assert.equal(
        await evaluate(
            'Math.round(document.querySelector("#contact").getBoundingClientRect().bottom) === Math.round(document.querySelector("footer").getBoundingClientRect().top)'
        ),
        true,
        "Contact meets the footer with no extra strip"
    );
    const alienBefore = await evaluate(
        'document.querySelector(".arcade-trigger svg").getBoundingClientRect().top'
    );
    const alienWidth = await evaluate(
        'document.querySelector(".arcade-trigger svg").getBoundingClientRect().width'
    );
    const legGap = await evaluate(
        '(() => { const svg = document.querySelector(".arcade-trigger svg").getBoundingClientRect(); return document.querySelector("footer").getBoundingClientRect().top - svg.bottom; })()'
    );
    assert.ok(
        Math.abs(legGap - 1) < 0.5,
        `alien legs stand on the footer rule, which sits 1px above the footer box: ${legGap}`
    );
    assert.equal(
        await evaluate(
            'document.querySelectorAll(".arcade-trigger .crab-frame").length'
        ),
        2,
        "trigger uses both original animation frames"
    );
    assert.equal(
        await evaluate(
            'getComputedStyle(document.querySelector(".arcade-trigger .crab-frame")).animationDuration'
        ),
        "0.6s",
        "keyboard focus speeds up the sprite"
    );
    const footerBefore = await evaluate(
        'document.querySelector("footer").getBoundingClientRect().top + scrollY'
    );
    const contactBefore = await evaluate(
        'document.querySelector("#contact").getBoundingClientRect().top'
    );
    const previousScrollStyles = await scrollStyles();
    const openingScroll = await evaluate("window.scrollY");
    await click(".arcade-trigger");
    await waitFor('!!document.querySelector(".arcade-section")');
    await checkScrollLocked();
    await evaluate(
        `window.alienPositions = []; const trackAlien = () => { const alien = document.querySelector(".arcade-arriving-alien"); if (alien) { alienPositions.push(alien.getBoundingClientRect().top); requestAnimationFrame(trackAlien); } }; trackAlien();`
    );
    assert.equal(
        await evaluate('!!document.querySelector("dialog")'),
        false,
        "game opens inline"
    );
    await new Promise(resolve => setTimeout(resolve, 350));
    assert.equal(
        await evaluate(
            'Math.round(document.querySelector(".arcade-section").getBoundingClientRect().height) === Math.round(document.querySelector(".arcade-clip").getBoundingClientRect().height)'
        ),
        true,
        "revealed content fills the opening without an empty strip"
    );
    assert.equal(
        await evaluate(
            'document.querySelector(".arcade-arriving-alien").getAnimations().length'
        ),
        1,
        "alien flies during the section reveal"
    );
    assert.ok(
        (await evaluate(
            'document.querySelector("#contact").getBoundingClientRect().top'
        )) <
            contactBefore - 10,
        "Contact rises while the game is revealed"
    );
    const opening = await send("Page.captureScreenshot", { format: "png" });
    await writeFile(
        "/tmp/dikym-arcade-opening.png",
        Buffer.from(opening.data, "base64")
    );
    await waitFor(
        '!!document.querySelector(".arcade-section.is-expanded") && !document.querySelector(".arcade-arriving-alien")'
    );
    await checkOpeningPosition();
    const arcadeCenter = await evaluate(`(() => {
        const bounds = document.querySelector('.arcade-section').getBoundingClientRect();
        const center = (document.querySelector('header > nav').getBoundingClientRect().bottom + innerHeight) / 2;
        return (center - bounds.top) / bounds.height;
    })()`);
    await evaluate(`window.arcadeResizeProgress = [];
        window.measureArcadeResize = () => {
            const bounds = document.querySelector('.arcade-section').getBoundingClientRect();
            const center = (document.querySelector('header > nav').getBoundingClientRect().bottom + innerHeight) / 2;
            arcadeResizeProgress.push((center - bounds.top) / bounds.height);
        };
        window.sampleArcadeResize = () => {
            measureArcadeResize();
            requestAnimationFrame(() => {
                measureArcadeResize();
                requestAnimationFrame(measureArcadeResize);
            });
        };
        window.addEventListener('resize', sampleArcadeResize);`);
    for (const [width, height] of [
        [393, 852],
        [393, 667],
        [375, 667],
        [1280, 900],
    ]) {
        await send("Emulation.setDeviceMetricsOverride", {
            width,
            height,
            deviceScaleFactor: 1,
            mobile: width < 700,
        });
        await waitFor(`(() => {
            const bounds = document.querySelector('.arcade-section').getBoundingClientRect();
            const center = (document.querySelector('header > nav').getBoundingClientRect().bottom + innerHeight) / 2;
            return Math.abs((center - bounds.top) / bounds.height - ${arcadeCenter}) < 0.01;
        })()`);
        await evaluate(
            "new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve))))"
        );
    }
    assert.ok(
        await evaluate(
            `arcadeResizeProgress.length > 0 && arcadeResizeProgress.every(progress => Math.abs(progress - ${arcadeCenter}) < 0.01)`
        ),
        "resize preserves the arcade position in the resize handler and the first two frames"
    );
    await evaluate("window.removeEventListener('resize', sampleArcadeResize)");
    assert.deepEqual(
        await scrollStyles(),
        previousScrollStyles,
        "opening restores the previous scroll styles"
    );
    await checkCloseSpacing();
    const alienPositions = await evaluate("alienPositions");
    assert.ok(
        Math.abs(
            alienWidth -
                (await evaluate(
                    'document.querySelector("canvas").getBoundingClientRect().width * 11 / 224'
                ))
        ) < 0.1,
        "trigger and game alien have the same size"
    );
    assert.ok(
        alienPositions.length > 5,
        "sampled the alien throughout its flight"
    );
    assert.ok(
        Math.max(...alienPositions) <= alienBefore + 3,
        "alien never dips toward the footer before joining"
    );
    assert.equal(
        await evaluate(
            'Math.round(document.querySelector(".arcade-panel").getBoundingClientRect().width) === Math.round(document.querySelector(".arcade-slot").getBoundingClientRect().width)'
        ),
        true,
        "game fills the section"
    );
    assert.ok(
        (await evaluate(
            'document.querySelector("canvas").getBoundingClientRect().width'
        )) <= 448,
        "movement area stays bounded"
    );
    assert.equal(
        await evaluate(
            'getComputedStyle(document.querySelector(".arcade-screen")).borderBottomWidth'
        ),
        "0px",
        "no divider bar around the game"
    );
    assert.equal(
        await evaluate(
            'document.querySelectorAll(".arcade-trigger-row").length'
        ),
        0,
        "hidden alien trigger leaves no empty bar"
    );
    assert.equal(
        await evaluate(
            'getComputedStyle(document.querySelector(".arcade-slot")).borderTopWidth'
        ),
        "1px",
        "Contact has a bottom rule while the game is open"
    );
    // Control game time only after checking the real entrance animation.
    const gameScroll = await evaluate("window.scrollY");
    await evaluate(
        `Array.from(document.querySelectorAll('header > nav > .wrap button')).find(button => button.textContent.trim() === 'Contact').click()`
    );
    await waitFor(
        `Math.abs(document.getElementById('contact').getBoundingClientRect().top - document.querySelector('header > nav').getBoundingClientRect().bottom) <= 0.5`
    );
    await evaluate(
        `window.scrollTo({top: ${gameScroll}, behavior: 'instant'})`
    );
    await evaluate(`window.realRequestAnimationFrame = window.requestAnimationFrame; window.realCancelAnimationFrame = window.cancelAnimationFrame;
        window.arcadeFrames = new Map(); window.arcadeFrameId = 0; window.arcadeNow = performance.now();
        window.requestAnimationFrame = callback => { const id = ++arcadeFrameId; arcadeFrames.set(id, callback); return id; };
        window.cancelAnimationFrame = id => arcadeFrames.delete(id);
        window.tickArcade = count => { for (let i = 0; i < count; i++) { arcadeNow += 50; const callbacks = [...arcadeFrames.values()]; arcadeFrames.clear(); callbacks.forEach(callback => callback(arcadeNow)); } };`);
    await waitFor("arcadeFrames.size > 0");
    await evaluate("tickArcade(1)");
    assert.ok(
        (await evaluate(
            'document.querySelector("footer").getBoundingClientRect().top + scrollY'
        )) >
            footerBefore + 200,
        "game expands above the footer"
    );
    assert.equal(
        await evaluate(
            'document.querySelector("#contact").compareDocumentPosition(document.querySelector("#arcade")) & Node.DOCUMENT_POSITION_FOLLOWING'
        ),
        4,
        "game follows Contact"
    );
    await evaluate("tickArcade(1)");
    const readyFrame = await evaluate(
        'document.querySelector("canvas").toDataURL()'
    );
    const readyField = await evaluate(`${FIELD}.canvas.toDataURL()`);
    assert.equal(
        createHash("sha256")
            .update(Buffer.from(readyField.split(",")[1], "base64"))
            .digest("hex"),
        "be056fe49e025d0e5d9291fdf71f0db7286e968e983c71bc7e3ec39d03b7163b",
        "initial canvas PNG matches the native baseline"
    );
    assert.equal(
        await evaluate("arcadeAudioContexts.length"),
        0,
        "no AudioContext before Enter"
    );
    const crtRatio = await evaluate(
        `(() => { const c=document.querySelector('canvas'),r=c.getBoundingClientRect(); return (r.height/c.height)/(r.width/c.width); })()`
    );
    assert.ok(
        Math.abs(crtRatio - 7 / 6) < 0.001,
        "native CRT proportions replace square pixels"
    );
    const idleDraws = await evaluate(`(() => {
        const ctx = document.querySelector('canvas').getContext('2d');
        const original = ctx.drawImage;
        let draws = 0;
        ctx.drawImage = function (...args) { draws++; return original.apply(this, args); };
        try { tickArcade(500); } finally { ctx.drawImage = original; }
        return draws;
    })()`);
    assert.equal(
        idleDraws,
        0,
        "idle arcade reuses its canvas throughout the animation instead of repainting every frame"
    );
    assert.equal(
        await evaluate('document.querySelector("canvas").toDataURL()'),
        readyFrame,
        "game must wait for Enter"
    );
    assert.equal(
        await evaluate(
            'document.activeElement === document.querySelector("canvas")'
        ),
        true,
        "arrival focuses the game so Enter starts it"
    );
    assert.equal(
        await evaluate('document.querySelector("canvas").tabIndex'),
        0,
        "Tab reaches the game before it starts"
    );
    await evaluate('document.querySelector(".arcade-sound").focus()');
    await key("keyDown", "Tab", "Tab");
    await key("keyUp", "Tab", "Tab");
    assert.deepEqual(
        await evaluate(
            `[document.activeElement.className, getComputedStyle(document.activeElement).outlineStyle]`
        ),
        ["arcade-button arcade-exit", "solid"],
        "Tab moves from sound to Close and outlines it"
    );
    await key("keyDown", "Tab", "Tab");
    await key("keyUp", "Tab", "Tab");
    assert.equal(
        await evaluate("document.activeElement.tagName"),
        "CANVAS",
        "Tab moves from Close into the game"
    );

    const screenshot = await send("Page.captureScreenshot", { format: "png" });
    await writeFile(
        "/tmp/dikym-arcade-desktop.png",
        Buffer.from(screenshot.data, "base64")
    );
    await evaluate(
        'document.documentElement.classList.add("dark"); tickArcade(1)'
    );
    assert.equal(
        await evaluate('document.querySelector("canvas").toDataURL()'),
        readyFrame,
        "native arcade colors stay the same in either application theme"
    );
    const darkScreenshot = await send("Page.captureScreenshot", {
        format: "png",
    });
    await writeFile(
        "/tmp/dikym-arcade-dark.png",
        Buffer.from(darkScreenshot.data, "base64")
    );
    await evaluate(
        'document.documentElement.classList.remove("dark"); tickArcade(1)'
    );
    await key("keyDown", "Enter", "Enter");
    await key("keyUp", "Enter", "Enter");
    await waitFor(
        '!!document.querySelector(".arcade-status [aria-label=Playing]")'
    );
    await waitFor(`arcadeAudioContexts[0]?.state === 'running'`);
    await click(".arcade-sound");
    assert.equal(
        await evaluate(
            `document.querySelector('.arcade-sound').getAttribute('aria-label')`
        ),
        "Unmute sound"
    );
    await click(".arcade-sound");
    assert.equal(
        await evaluate(
            `document.querySelector('.arcade-sound').getAttribute('aria-pressed')`
        ),
        "false"
    );
    assert.equal(await evaluate("document.activeElement.tagName"), "CANVAS");
    const enterHint = () =>
        evaluate(
            "document.querySelector('.arcade-keyboard-hint .arcade-start-hint').textContent"
        );
    await key("keyDown", "Enter", "Enter");
    await key("keyUp", "Enter", "Enter");
    assert.equal(await enterHint(), "Enter Resume", "Enter pauses the game");
    await evaluate("document.activeElement.blur()");
    await key("keyDown", "Enter", "Enter");
    await key("keyUp", "Enter", "Enter");
    assert.equal(
        await evaluate("document.activeElement === document.body"),
        true,
        "Enter outside the game does not take focus back"
    );
    assert.equal(
        await enterHint(),
        "Click Focus",
        "out of focus, the hint offers a click instead of Enter"
    );
    await mouseClick(".arcade-sound");
    await mouseClick(".arcade-sound");
    assert.deepEqual(
        await evaluate(
            "[document.activeElement === document.body, document.querySelector('.arcade-sound').getAttribute('aria-pressed')]"
        ),
        [true, "false"],
        "clicking sound mutes and unmutes without taking focus"
    );
    assert.equal(
        await enterHint(),
        "Click Focus",
        "clicking sound leaves the game out of focus"
    );
    await mouseClick(".arcade-scoreboard");
    assert.equal(
        await evaluate("document.activeElement.tagName"),
        "CANVAS",
        "a click on the cabinet brings focus back to the game"
    );
    assert.equal(
        await enterHint(),
        "Enter Resume",
        "back in focus, the hint offers Enter again"
    );
    await key("keyDown", "Enter", "Enter");
    await key("keyUp", "Enter", "Enter");
    assert.equal(await enterHint(), "Enter Pause", "Enter resumes the game");
    await setUpGame("window.nativeGame = g;");
    await evaluate("tickArcade(60)");
    await setUpGame("g.elapsed = -1000; window.nativeGame = g;");
    const pixels = await evaluate(`(() => {
        const g = nativeGame, ctx = ${FIELD};
        const data = ctx.getImageData(0, 0, 224, 208).data;
        let lit = 0, mismatches = 0;
        for (let x = 0; x < 224; x++) for (let y = 32; y < 240; y++) {
            const on = !!(g.memory[0x2400 + x * 32 + ((255-y)>>3)] & (1 << ((255-y)&7)));
            const i = ((y-32) * 224 + x) * 4;
            if (on) {
                lit++;
                const color = y < 62 ? [255,32,32] : y >= 184 ? [32,255,32] : [255,255,255];
                if (data[i+3] !== 255 || color.some((v,j) => v !== data[i+j])) mismatches++;
            } else if (data[i+3] !== 0) mismatches++;
        }
        return {lit, mismatches};
    })()`);
    assert.ok(
        pixels.lit > 1000,
        "native framebuffer contains the rack, cannon and shields"
    );
    assert.equal(
        pixels.mismatches,
        0,
        "every rendered pixel matches native VRAM and the fixed color overlay"
    );
    for (const dark of [false, true]) {
        await evaluate(
            `document.documentElement.classList.toggle('dark',${dark}); tickArcade(1)`
        );
        assert.equal(
            await evaluate(
                "getComputedStyle(document.querySelector('.arcade-panel')).backgroundColor"
            ),
            "rgb(0, 0, 0)"
        );
        assert.equal(
            await evaluate(
                "getComputedStyle(document.querySelector('.arcade-section')).color"
            ),
            "rgb(255, 255, 255)"
        );
    }
    for (const width of [1280, 390]) {
        await send("Emulation.setDeviceMetricsOverride", {
            width,
            height: 900,
            deviceScaleFactor: 1,
            mobile: false,
        });
        const ratio = await evaluate(
            `(() => { const c=document.querySelector('canvas'), r=c.getBoundingClientRect(); return (r.height/c.height)/(r.width/c.width); })()`
        );
        assert.ok(
            Math.abs(ratio - 7 / 6) < 0.001,
            `CRT pixel proportions at ${width}`
        );
        await evaluate(
            "document.querySelector('.arcade-section').scrollIntoView({block:'start',behavior:'instant'}); tickArcade(1)"
        );
        const capture = await send("Page.captureScreenshot", { format: "png" });
        await writeFile(
            `/tmp/dikym-native-arcade-${width}.png`,
            Buffer.from(capture.data, "base64")
        );
    }
    await setUpGame(`g.memory[0x2007]=10; g.memory[0x2008]=128;`);
    await evaluate("tickArcade(1)");
    await waitFor("!!document.querySelector('.arcade-ufo-points')");
    for (const width of [1280, 390]) {
        await send("Emulation.setDeviceMetricsOverride", {
            width,
            height: 900,
            deviceScaleFactor: 1,
            mobile: false,
        });
        await waitFor(
            "Math.abs(Number(getComputedStyle(document.querySelector('.arcade-scoreboard')).zoom) - document.querySelector('canvas').getBoundingClientRect().width / 448) < 0.0001"
        );
        assert.equal(
            await evaluate(
                "document.querySelector('.arcade-ufo-points').getBoundingClientRect().height"
            ),
            await evaluate(
                "document.querySelector('canvas').getBoundingClientRect().width / 32"
            )
        );
        assert.equal(
            await evaluate(
                "getComputedStyle(document.querySelector('.arcade-status [role=status]')).fontSize"
            ),
            "16px"
        );
        const sizes = await evaluate(`(() => {
            const points = document.querySelector('.arcade-ufo-points').getBoundingClientRect();
            const ship = document.querySelector('.arcade-lives svg').getBoundingClientRect();
            const alien = document.querySelector('.arcade-trigger svg').getBoundingClientRect();
            const field = document.querySelector('canvas').getBoundingClientRect();
            return {points: points.width / points.height, ship: ship.width / ship.height, shipWidth: ship.width, shipHeight: ship.height, fieldWidth: field.width, fieldHeight: field.height, alien: alien.width / alien.height, livesFont: getComputedStyle(document.querySelector('.arcade-lives')).fontSize};
        })()`);
        assert.ok(Math.abs(sizes.points - 18 / 7) < 0.01);
        assert.ok(Math.abs(sizes.ship - 12 / 7) < 0.01);
        assert.ok(
            Math.abs(sizes.shipWidth - (sizes.fieldWidth * 16) / 224) < 0.02
        );
        assert.ok(
            Math.abs(sizes.shipHeight - (sizes.fieldHeight * 8) / 208) < 0.02
        );
        assert.ok(Math.abs(sizes.alien - 33 / 28) < 0.01);
        assert.equal(sizes.livesFont, "16px");
        const near = (actual, expected, message) =>
            assert.ok(
                Math.abs(actual - expected) < 0.5,
                `${message}: ${actual} vs ${expected}`
            );
        const ink = await evaluate(`(() => {
            const ctx = document.createElement('canvas').getContext('2d');
            ctx.font = '16px "Quorzak"';
            const m = ctx.measureText('C');
            return {capTop: m.fontBoundingBoxAscent - m.actualBoundingBoxAscent, descent: m.fontBoundingBoxDescent};
        })()`);
        near(ink.capTop, 2, "font cap starts 1/8 em below the box top");
        near(ink.descent, 0, "font baseline sits at the box bottom");
        const hud = await evaluate(`(() => {
            const field = document.querySelector('canvas').getBoundingClientRect();
            const box = selector => document.querySelector(selector).getBoundingClientRect();
            const ink = selector => { const range = document.createRange(); range.selectNodeContents(document.querySelector(selector)); return range.getBoundingClientRect(); };
            const digit = ink('.arcade-life-count'), ship = box('.arcade-lives svg');
            const credit = ink('.arcade-status [role=status]'), label = box('.arcade-label');
            return {left: field.left, bottom: field.bottom, column: field.width / 224,
                digit: [digit.left, digit.top, digit.height], ship: [ship.left, ship.top],
                credit: [credit.left, credit.top, credit.height], label: label.height};
        })()`);
        const row = (hud.column * 7) / 6;
        // Screen rows: line 239, spare ships 240–247, text cap 241–247.
        near(hud.ship[1], hud.bottom, "cannons sit flush under the line");
        near(
            hud.digit[1],
            hud.bottom,
            "lives digit cell starts under the line"
        );
        near(hud.credit[1], hud.bottom, "CREDIT cell starts under the line");
        near(hud.digit[2], 8 * row, "lives digit cell is 8 game rows");
        near(hud.credit[2], 8 * row, "CREDIT cell is 8 game rows");
        near(hud.label, 8 * row, "scoreboard label cell is 8 game rows");
        // ROM glyph ink starts one column into its cell; the font's starts at its box edge.
        near(
            hud.digit[0],
            hud.left + 9 * hud.column,
            "lives digit ink at ROM x=9"
        );
        near(
            hud.ship[0],
            hud.left + 24 * hud.column,
            "first cannon at ROM x=24"
        );
        near(
            hud.credit[0],
            hud.left + 137 * hud.column,
            "1 PLAYER ink at x=137"
        );
        const board = await evaluate(`(() => {
            const field = document.querySelector('canvas').getBoundingClientRect();
            const ink = node => { const range = document.createRange(); range.selectNodeContents(node); return range.getBoundingClientRect(); };
            return {left: field.left, top: field.top, column: field.width / 224,
                board: document.querySelector('.arcade-scoreboard').getBoundingClientRect().top,
                labels: [...document.querySelectorAll('.arcade-label')].map(node => { const r = ink(node); return [r.left + r.width / 2, r.top]; }),
                scores: [...document.querySelectorAll('.arcade-scoreboard b')].filter(node => node.textContent).map(node => { const r = ink(node); return [r.left + r.width / 2, r.top]; }),
                fonts: [...document.querySelectorAll('.arcade-label, .arcade-scoreboard b')].map(node => getComputedStyle(node).fontSize)};
        })()`);
        const boardRow = (board.column * 7) / 6;
        // Screen rows 0–31: labels at y=8, values at y=24.
        near(
            board.board,
            board.top - 32 * boardRow,
            "scoreboard spans ROM rows 0–31"
        );
        // Three centred columns, each label over its value.
        for (const [i, x] of [224 / 6, 112, (224 * 5) / 6].entries()) {
            near(
                board.labels[i][0],
                board.left + x * board.column,
                `label ${i} centred at x=${x}`
            );
            near(
                board.labels[i][1],
                board.top - 24 * boardRow,
                `label ${i} cell at ROM y=8`
            );
        }
        for (const [i, x] of [224 / 6, 112, (224 * 5) / 6].entries()) {
            near(
                board.scores[i][0],
                board.left + x * board.column,
                `score ${i} centred at x=${x}`
            );
            near(
                board.scores[i][1],
                board.top - 8 * boardRow,
                `score ${i} cell at ROM y=24`
            );
        }
        assert.ok(board.fonts.every(size => size === "16px"));

        assert.ok(
            await evaluate(`(() => {
            const bounds = document.querySelector('.arcade-game').getBoundingClientRect();
            return ['.arcade-scoreboard', '.arcade-playfield', '.arcade-status'].every(selector => {
                const child = document.querySelector(selector).getBoundingClientRect();
                return child.left >= bounds.left - 0.1 && child.right <= bounds.right + 0.1
                    && child.top >= bounds.top - 0.1 && child.bottom <= bounds.bottom + 0.1;
            });
        })()`),
            "focus frame includes the scoreboard, playfield and lives/CREDIT row"
        );
    }
    await setUpGame("window.savedLives=g.memory[0x2003];");
    const lifePositions = [];
    for (const lives of [3, 2, 1]) {
        await setUpGame(`g.memory[0x2003]=${lives};`);
        await evaluate("tickArcade(1)");
        await waitFor(
            `document.querySelector('.arcade-life-count').textContent === '${lives}'`
        );
        lifePositions.push(
            await evaluate(
                "document.querySelector('.arcade-life-count').getBoundingClientRect().left"
            )
        );
        assert.equal(
            await evaluate(
                "document.querySelectorAll('.arcade-lives svg').length"
            ),
            lives - 1
        );
    }
    assert.ok(
        lifePositions.every(
            position => Math.abs(position - lifePositions[0]) < 0.1
        ),
        "life count stays at the same position as spare cannons disappear"
    );
    await setUpGame("g.memory[0x2003]=savedLives;");
    await setUpGame("g.memory[0x2007]=0; g.elapsed=0;");
    await evaluate(
        "document.querySelector('.arcade-section').focus({preventScroll:true})"
    );
    assert.equal(
        await evaluate(
            "getComputedStyle(document.querySelector('.arcade-section')).outlineStyle"
        ),
        "none"
    );
    assert.equal(
        await evaluate(
            "getComputedStyle(document.querySelector('.arcade-game')).outlineStyle"
        ),
        "solid",
        "a click on the cabinet keeps keys in the game, so the game stays outlined"
    );
    await evaluate(
        "document.querySelector('canvas').focus({preventScroll:true})"
    );
    await setUpGame("window.nativeGame=g;");
    const nativeBefore = await evaluate("nativeGame.memory[0x2050]");
    await key("keyDown", "ArrowRight", "ArrowRight");
    await evaluate("tickArcade(5)");
    await key("keyUp", "ArrowRight", "ArrowRight");
    assert.deepEqual(
        await evaluate(`[
        getComputedStyle(document.querySelector('.arcade-game')).outlineStyle,
        getComputedStyle(document.querySelector('canvas')).outlineStyle
    ]`),
        ["solid", "none"],
        "keyboard focus outlines the whole game instead of just the canvas"
    );
    assert.ok(
        await evaluate(`nativeGame.memory[0x2050] > ${nativeBefore}`),
        "keyboard moves original cannon"
    );
    const pausedFrame = await evaluate(
        "document.querySelector('canvas').toDataURL()"
    );
    await evaluate(
        "document.querySelector('nav button').focus({preventScroll:true})"
    );
    await evaluate("tickArcade(15)");
    assert.equal(
        await evaluate("document.querySelector('canvas').toDataURL()"),
        pausedFrame,
        "leaving the section pauses gameplay"
    );
    await evaluate(
        "document.querySelector('canvas').focus({preventScroll:true})"
    );
    const shotsBefore = await evaluate("nativeGame.memory[0x2055]");
    await key("keyDown", " ", "Space");
    await evaluate("tickArcade(2)");
    await key("keyUp", " ", "Space");
    assert.equal(
        await evaluate("nativeGame.memory[0x2055]"),
        shotsBefore + 1,
        "Space fires one ROM shot"
    );
    await setUpGame("g.memory.fill(0,0x2010,0x2047);");
    await evaluate("tickArcade(100)");
    assert.equal(
        await evaluate("nativeGame.wave"),
        2,
        "clearing the rack starts wave two"
    );
    assert.equal(
        await evaluate(
            "!!document.querySelector('.arcade-status [aria-label=Playing]')"
        ),
        true,
        "no invented victory screen"
    );
    await setUpGame("g.memory[0x2000]=2; g.memory[0x2003]=0;");
    await evaluate("tickArcade(1)");
    await waitFor("!!document.querySelector('.arcade-game-over')");
    assert.deepEqual(
        await evaluate(STRETCH_AUDIT),
        [],
        "arcade text keeps the ROM's 7/6 pixel aspect"
    );
    const gameOverDraws = await evaluate(`(() => {
        const ctx = document.querySelector('canvas').getContext('2d');
        const original = ctx.drawImage;
        const frame = document.querySelector('canvas').toDataURL();
        let draws = 0;
        ctx.drawImage = function (...args) { draws++; return original.apply(this, args); };
        try { tickArcade(500); } finally { ctx.drawImage = original; }
        return {draws, unchanged: document.querySelector('canvas').toDataURL() === frame};
    })()`);
    assert.deepEqual(
        gameOverDraws,
        { draws: 0, unchanged: true },
        "game over preserves the final image without repainting"
    );
    await key("keyDown", "Enter", "Enter");
    await key("keyUp", "Enter", "Enter");
    await waitFor(
        "!!document.querySelector('.arcade-status [aria-label=Playing]')"
    );
    await evaluate("tickArcade(1)");
    assert.equal(
        await evaluate(
            "document.querySelector('.arcade-scoreboard b').textContent"
        ),
        "0000"
    );
    assert.equal(
        await evaluate("document.querySelectorAll('.arcade-lives svg').length"),
        2,
        "three lives show two spare cannons"
    );
    await send("Emulation.setDeviceMetricsOverride", {
        width: 1280,
        height: 900,
        deviceScaleFactor: 1,
        mobile: false,
    });
    await setUpGame("window.nativeGame=g;");
    await evaluate("tickArcade(60)");
    await setUpGame("g.elapsed=-1000;");
    await evaluate("window.scrollBy({top: 80, behavior: 'instant'})");
    const expandedHeight = await evaluate(
        'document.querySelector(".arcade-section").getBoundingClientRect().height'
    );
    await evaluate(`window.closeTicker = setInterval(() => {
        tickArcade(1);
        const alien = document.querySelector('.arcade-arriving-alien');
        if (!alien) return;
        const a = alien.getBoundingClientRect();
        const b = document.querySelector('.arcade-trigger svg').getBoundingClientRect();
        window.returnGap = Math.hypot(a.x - b.x, a.y - b.y);
    }, 16)`);
    await key("keyDown", "Escape", "Escape");
    await key("keyUp", "Escape", "Escape");
    await evaluate("tickArcade(3)");
    await checkScrollLocked();
    await new Promise(resolve => setTimeout(resolve, 350));
    const closing = await evaluate(`(() => {
        const section = document.querySelector('.arcade-section');
        return { height: section.getBoundingClientRect().height,
            alien: !!section.querySelector('.arcade-arriving-alien'),
            outline: getComputedStyle(section.querySelector('.arcade-exit')).outlineStyle };
    })()`);
    assert.ok(
        closing.height > 0 && closing.height < expandedHeight,
        "section collapses gradually"
    );
    assert.equal(closing.alien, true, "alien returns during collapse");
    assert.ok(
        await evaluate(`(() => {
        const ctx = ${FIELD};
        const inv = nativeGame.invaders.find(inv => inv.row === 1 && inv.alive);
        const departed = ctx.getImageData(inv.x, inv.y - 40, 17, 16).data;
        const neighbour = ctx.getImageData(inv.x + 16, inv.y - 32, 16, 8).data;
        return departed.every((value, i) => i % 4 !== 3 || value === 0)
            && neighbour.some((value, i) => i % 4 === 3 && value > 0);
    })()`),
        "departing alien leaves the canvas while its neighbour remains"
    );
    assert.equal(
        closing.outline,
        "none",
        "Close has no keyboard focus outline"
    );
    await waitFor('!document.querySelector(".arcade-section")');
    await evaluate("clearInterval(closeTicker)");
    assert.ok(
        Math.abs((await evaluate("window.scrollY")) - openingScroll) < 1,
        "closing restores the scroll position from before opening"
    );
    assert.deepEqual(
        await scrollStyles(),
        previousScrollStyles,
        "closing restores the previous scroll styles"
    );
    assert.ok(
        await evaluate("returnGap < 3"),
        "alien reaches its original position before disappearing"
    );
    assert.equal(
        await evaluate(
            'document.querySelector(".arcade-entry").getBoundingClientRect().height'
        ),
        0
    );
    assert.notEqual(await evaluate("document.body.style.overflow"), "hidden");
    assert.equal(
        await evaluate(
            `getComputedStyle(document.querySelector('.arcade-trigger')).outlineStyle`
        ),
        "none",
        "alien has no focus outline after closing"
    );
    assert.equal(
        await evaluate(
            'document.activeElement === document.querySelector(".arcade-trigger")'
        ),
        true
    );
    const interruptedOpeningScroll = await evaluate("window.scrollY");
    await click(".arcade-trigger");
    await new Promise(resolve => setTimeout(resolve, 250));
    await click(".arcade-exit");
    await click(".arcade-exit");
    await checkScrollLocked();
    await waitFor('!document.querySelector(".arcade-section")');
    assert.ok(
        Math.abs(
            (await evaluate("window.scrollY")) - interruptedOpeningScroll
        ) < 1,
        "closing during entrance restores the original scroll position"
    );
    assert.deepEqual(
        await scrollStyles(),
        previousScrollStyles,
        "interrupted opening releases the scroll lock after closing"
    );
    assert.equal(
        await evaluate(
            'document.querySelector(".arcade-entry").getBoundingClientRect().height'
        ),
        0,
        "closing during entrance leaves no extra section"
    );
    for (const dark of [false, true]) {
        await evaluate(
            `document.documentElement.classList.toggle('dark', ${dark})`
        );
        await click(".arcade-trigger");
        await waitFor(
            "!!document.querySelector('.arcade-section.is-expanded') && !document.querySelector('.arcade-arriving-alien')"
        );
        await click(".arcade-exit");
        await evaluate("tickArcade(1)");
        assert.ok(
            await evaluate(`(() => {
            const ctx = ${FIELD};
            const pixels = ctx.getImageData(24, 40, 17, 16).data;
            const neighbour = ctx.getImageData(40, 48, 16, 8).data;
            return pixels.every((value, i) => i % 4 !== 3 || value === 0)
                && neighbour.some((value, i) => i % 4 === 3 && value > 0);
        })()`),
            "idle formation removes only the returning crab"
        );
        const colors = await evaluate(`(() => {
            const alien = document.querySelector('.arcade-arriving-alien');
            const flight = alien.getAnimations()[0];
            flight.pause();
            const samples = [0, 600, 1200].map(time => {
                flight.currentTime = time;
                return getComputedStyle(alien).color;
            });
            return {
                samples,
                formation: getComputedStyle(document.querySelector('.arcade-section')).color,
                footer: getComputedStyle(document.querySelector('.arcade-trigger svg')).color,
            };
        })()`);
        assert.equal(
            colors.samples[0],
            colors.formation,
            "return starts with formation color"
        );
        assert.equal(
            colors.samples[2],
            colors.footer,
            "return ends with footer color"
        );
        assert.notEqual(
            colors.samples[1],
            colors.formation,
            "return color changes gradually"
        );
        assert.notEqual(
            colors.samples[1],
            colors.footer,
            "return color is between its endpoints"
        );
        await evaluate(`document.querySelectorAll('.arcade-section, .arcade-arriving-alien')
            .forEach(element => element.getAnimations().forEach(animation => animation.finish()))`);
        await waitFor('!document.querySelector(".arcade-section")');
    }
    await evaluate("document.documentElement.classList.remove('dark')");
    await send("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });
    await key("keyDown", "Enter", "Enter");
    await key("keyUp", "Enter", "Enter");
    await waitFor(
        '!!document.querySelector(".arcade-section.is-expanded") && !document.querySelector(".arcade-arriving-alien")'
    );
    assert.deepEqual(
        await scrollStyles(),
        previousScrollStyles,
        "reduced motion releases the scroll lock immediately"
    );
    for (const [width, height] of [
        [390, 844],
        [320, 568],
        [280, 568],
        [768, 1024],
        [844, 390],
    ]) {
        await send("Emulation.setDeviceMetricsOverride", {
            width,
            height,
            deviceScaleFactor: 1,
            mobile: false,
        });
        await waitFor(
            "Math.abs(Number(getComputedStyle(document.querySelector('.arcade-scoreboard')).zoom) - document.querySelector('canvas').getBoundingClientRect().width / 448) < 0.0001"
        );
        assert.equal(
            await evaluate(
                'document.querySelector(".arcade-panel").scrollWidth <= document.querySelector(".arcade-panel").clientWidth'
            ),
            true,
            `no overflow at ${width}`
        );
        const hudScale = await evaluate(`(() => {
            const board = document.querySelector('.arcade-scoreboard');
            const field = document.querySelector('canvas').getBoundingClientRect();
            const labels = [...board.querySelectorAll('.arcade-label')];
            const fonts = [...board.querySelectorAll('.arcade-label, b')];
            return {scale: Number(getComputedStyle(board).zoom), expected: field.width / 448,
                lines: labels.map(label => { const range = document.createRange(); range.selectNodeContents(label); return range.getClientRects().length; }),
                transforms: fonts.map(node => getComputedStyle(node).transform),
                whiteSpace: labels.map(node => getComputedStyle(node).whiteSpace)};
        })()`);
        assert.ok(Math.abs(hudScale.scale - hudScale.expected) < 0.001);
        assert.ok(hudScale.lines.every(lines => lines === 1));
        assert.ok(hudScale.transforms.every(transform => transform === "none"));
        assert.ok(
            hudScale.whiteSpace.every(whiteSpace => whiteSpace === "normal")
        );
        await checkCloseSpacing();
    }
    await evaluate('document.querySelector(".arcade-panel").style.zoom = "2"');
    await waitFor(
        'document.querySelector(".arcade-panel").scrollWidth <= document.querySelector(".arcade-panel").clientWidth'
    );
    await evaluate('document.querySelector(".arcade-panel").style.zoom = "1"');
    await send("Emulation.setDeviceMetricsOverride", {
        width: 390,
        height: 844,
        deviceScaleFactor: 1,
        mobile: true,
    });
    await send("Emulation.setTouchEmulationEnabled", { enabled: true });
    await evaluate("tickArcade(1)");
    await evaluate(
        'document.querySelector(".arcade-section").scrollIntoView({behavior:"instant",block:"start"})'
    );
    const mobileScreenshot = await send("Page.captureScreenshot", {
        format: "png",
    });
    await writeFile(
        "/tmp/dikym-arcade-mobile.png",
        Buffer.from(mobileScreenshot.data, "base64")
    );
    // Touch screens have no Enter key: a tap anywhere but sound and Close focuses, then starts.
    const tap = async selector => {
        const point = await evaluate(
            `(() => { const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`
        );
        await send("Input.dispatchTouchEvent", {
            type: "touchStart",
            touchPoints: [point],
        });
        await send("Input.dispatchTouchEvent", {
            type: "touchEnd",
            touchPoints: [],
        });
    };
    const tapHint = () =>
        evaluate("document.querySelector('.arcade-tap-hint').textContent");
    const playing =
        "!!document.querySelector('.arcade-status [aria-label=Playing]')";
    await evaluate("document.activeElement.blur()");
    assert.equal(
        await tapHint(),
        "Tap to focus",
        "out of focus asks for a tap"
    );
    await tap(".arcade-sound");
    await tap(".arcade-sound");
    assert.equal(
        await tapHint(),
        "Tap to focus",
        "tapping sound does not focus"
    );
    await tap(".arcade-scoreboard");
    assert.deepEqual(
        await evaluate(`[document.activeElement.tagName, ${playing}]`),
        ["CANVAS", false],
        "the first tap only focuses"
    );
    assert.equal(await tapHint(), "Tap to start");
    await tap(".arcade-sound");
    assert.equal(
        await evaluate(playing),
        false,
        "tapping sound does not start"
    );
    await tap(".arcade-sound");
    // Safari: the press is a touch PointerEvent, the click after it a plain MouseEvent.
    await evaluate(`(() => {
        const target = document.querySelector('.arcade-scoreboard');
        target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch' }));
        target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    })()`);
    await waitFor(
        "!!document.querySelector('.arcade-status [aria-label=Playing]')"
    );
    for (const selector of [
        '[aria-label="Move left"]',
        '[aria-label="Move right"]',
        ".arcade-fire",
    ]) {
        const position = await evaluate(
            `(() => { const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`
        );
        await send("Input.dispatchTouchEvent", {
            type: "touchStart",
            touchPoints: [position],
        });
        await evaluate("tickArcade(5)");
        await send("Input.dispatchTouchEvent", {
            type: "touchEnd",
            touchPoints: [],
        });
    }
    await click(".arcade-exit");
    await waitFor('!document.querySelector(".arcade-section")');
    assert.equal(
        await evaluate(
            'document.activeElement === document.querySelector(".arcade-trigger")'
        ),
        true,
        "closing restores focus"
    );
    for (const [result, setup] of [
        ["out of lives", "g.memory[0x2000]=2;"],
        ["landed", "g.memory[0x2000]=2;"],
        ["reduced motion", "g.memory[0x2000]=2;"],
    ]) {
        const reduced = result === "reduced motion";
        await send("Emulation.setEmulatedMedia", {
            features: [
                {
                    name: "prefers-reduced-motion",
                    value: reduced ? "reduce" : "no-preference",
                },
            ],
        });
        await click(".arcade-trigger");
        if (!reduced) {
            await checkMobileButtons();
            assert.equal(
                await evaluate(
                    `document.activeElement === document.querySelector('.arcade-exit')`
                ),
                true,
                "opening still accepts keyboard input"
            );
            assert.equal(
                await evaluate(
                    "document.querySelector('.arcade-keyboard-hint .arcade-start-hint').textContent"
                ),
                "Enter Start",
                "the opening animation keeps the Enter hint"
            );
        }
        await waitFor(
            `!!document.querySelector('.arcade-section.is-expanded') && !document.querySelector('.arcade-arriving-alien')`
        );
        await checkOpeningPosition();
        await checkMobileButtons();
        await key("keyDown", "Enter", "Enter");
        await key("keyUp", "Enter", "Enter");
        await waitFor(
            "!!document.querySelector('.arcade-status [aria-label=Playing]')"
        );
        await setUpGame(setup);
        await evaluate("tickArcade(30)");
        await waitFor(`!!document.querySelector('.arcade-game-over')`);
        await evaluate(
            "window.resultTicker = setInterval(() => tickArcade(1), 16)"
        );
        await evaluate("document.activeElement.blur()");
        await click(".arcade-exit");
        if (!reduced) {
            assert.equal(
                await evaluate(
                    "document.querySelector('.arcade-keyboard-hint .arcade-start-hint').textContent"
                ),
                "Click Focus",
                "closing while out of focus stays out of focus"
            );
            await checkMobileButtons();
            assert.ok(
                await evaluate(
                    `document.querySelector('.arcade-section').getBoundingClientRect().height > 0`
                ),
                "section collapses with controls attached to the panel"
            );
            await waitFor(
                `document.querySelector('.arcade-arriving-alien')?.style.visibility === 'hidden'`
            );
        }
        await waitFor(`!document.querySelector('.arcade-section')`);
        await evaluate("clearInterval(resultTicker)");
        const emergence = await evaluate(`(() => {
            const button = document.querySelector('.arcade-trigger');
            const sprite = button.querySelector('svg');
            const animation = sprite.getAnimations()[0];
            if (!animation) return null;
            animation.pause();
            animation.currentTime = 0;
            const from = sprite.getBoundingClientRect().top;
            const edge = button.getBoundingClientRect().bottom;
            animation.currentTime = 180;
            const middle = sprite.getBoundingClientRect().top;
            animation.currentTime = 360;
            const to = sprite.getBoundingClientRect().top;
            const box = sprite.getBoundingClientRect();
            // The sprite's bottom row is empty; its legs end one row above the box.
            const gap = document.querySelector('footer').getBoundingClientRect().top - box.bottom;
            animation.cancel();
            return {from, middle, to, edge, gap, overflow: getComputedStyle(button).overflowY};
        })()`);
        if (reduced)
            assert.equal(
                emergence,
                null,
                "reduced motion skips the footer reveal"
            );
        else {
            assert.ok(
                emergence,
                `${result}: footer alien has an emergence animation`
            );
            assert.ok(
                emergence.from >= emergence.edge - 1,
                `${result}: starts below the footer line`
            );
            assert.ok(
                emergence.from > emergence.middle &&
                    emergence.middle > emergence.to,
                `${result}: rises into position`
            );
            assert.equal(
                emergence.overflow,
                "hidden",
                "footer clips the emerging alien"
            );
            assert.ok(
                Math.abs(emergence.gap - 1) < 0.5,
                `${result}: ends standing on the footer rule (${emergence.gap})`
            );
        }
    }
    await waitFor(
        `arcadeAudioContexts.every(context => context.state === 'closed')`
    );
    const sounds = await evaluate(`(async () => {
        const { createArcadeAudio } = await import('/src/game/audio.ts');
        const Original = window.AudioContext;
        const results = [];
        try {
            for (const [name, port, bit] of [['shot',3,2],['death',3,4],['hit',3,8],['bonus',3,16],['fleet1',5,1],['fleet2',5,2],['fleet3',5,4],['fleet4',5,8],['ufo-hit',5,16],['ufo',3,1],['muted',3,2],['start',3,0]]) {
                const ctx = new OfflineAudioContext(1, 48000, 48000);
                Object.defineProperty(ctx,'state',{get:()=> 'running'});
                ctx.resume=async()=>{};
                window.AudioContext=function(){return ctx;};
                const audio=createArcadeAudio(); await audio.start();
                audio.sync([32,0],true);
                if(name==='muted') audio.setMuted(true);
                audio.play({port,value:port===3 ? 32|bit : bit});
                const output=await ctx.startRendering();
                results.push({name,peak:output.getChannelData(0).reduce((m,s)=>Math.max(m,Math.abs(s)),0)});
            }
        } finally {window.AudioContext=Original;}
        return results;
    })()`);
    for (const sound of sounds)
        assert.ok(
            ["muted", "start"].includes(sound.name)
                ? sound.peak === 0
                : sound.peak > 0 && sound.peak < 1,
            `${sound.name}: native audio output`
        );
    for (const [width, height] of [
        [320, 568],
        [844, 390],
        [375, 667],
        [393, 852],
    ]) {
        await send("Emulation.setDeviceMetricsOverride", {
            width,
            height,
            deviceScaleFactor: 1,
            mobile: true,
        });
        const originalScroll = await evaluate(
            "(() => { const before = scrollY; document.querySelector('.arcade-trigger').click(); return before; })()"
        );
        await waitFor(
            "!!document.querySelector('.arcade-section.is-expanded') && !document.querySelector('.arcade-arriving-alien')"
        );
        await checkOpeningPosition();
        assert.ok(
            await evaluate(`(() => {
            const bounds = document.querySelector('.arcade-section').getBoundingClientRect();
            const navbar = document.querySelector('header > nav').getBoundingClientRect();
            // The last row sits 1px below the viewport so the footer's top border stays hidden.
            return bounds.top >= navbar.bottom - 1 && bounds.bottom <= innerHeight + 2;
        })()`),
            "the complete arcade fits below the navbar"
        );
        if (width === 375 || width === 393) {
            await evaluate("tickArcade(1)");
            const screenshot = await send("Page.captureScreenshot", {
                format: "png",
            });
            await writeFile(
                `/tmp/dikym-arcade-centered-${width}.png`,
                Buffer.from(screenshot.data, "base64")
            );
        }
        await click(".arcade-exit");
        await waitFor("!document.querySelector('.arcade-section')");
        const returnedScroll = await evaluate("window.scrollY");
        assert.ok(
            Math.abs(returnedScroll - originalScroll) < 1,
            `${width}x${height}: closing restores scroll ${originalScroll}, got ${returnedScroll}`
        );
    }
    await evaluate(
        "window.requestAnimationFrame = realRequestAnimationFrame; window.cancelAnimationFrame = realCancelAnimationFrame"
    );
    await send("Emulation.setDeviceMetricsOverride", {
        width: 1280,
        height: 900,
        deviceScaleFactor: 1,
        mobile: false,
    });
    await evaluate(
        "new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))"
    );
    for (const selector of ["#projects", "#contact"]) {
        await evaluate(`(() => {
            const bounds = document.querySelector('${selector}').getBoundingClientRect();
            const center = (document.querySelector('header > nav').getBoundingClientRect().bottom + innerHeight) / 2;
            window.scrollTo({top: scrollY + bounds.top + bounds.height * 0.75 - center, behavior: 'instant'});
        })()`);
        await evaluate(
            "new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))"
        );
        for (const [width, height] of [
            [393, 852],
            [1280, 900],
        ]) {
            await send("Emulation.setDeviceMetricsOverride", {
                width,
                height,
                deviceScaleFactor: 1,
                mobile: width < 700,
            });
            await waitFor(`(() => {
                const bounds = document.querySelector('${selector}').getBoundingClientRect();
                const center = (document.querySelector('header > nav').getBoundingClientRect().bottom + innerHeight) / 2;
                return Math.abs((center - bounds.top) / bounds.height - 0.75) < 0.01;
            })()`);
        }
    }
    await click(".arcade-trigger");
    await waitFor(
        "!!document.querySelector('.arcade-section.is-expanded') && !document.querySelector('.arcade-arriving-alien')"
    );
    await send("Emulation.setDeviceMetricsOverride", {
        width: 393,
        height: 852,
        deviceScaleFactor: 1,
        mobile: true,
    });
    await waitFor(`(() => {
        const bounds = document.querySelector('.arcade-section').getBoundingClientRect();
        const center = (document.querySelector('header > nav').getBoundingClientRect().bottom + innerHeight) / 2;
        return Math.abs((center - bounds.top) / bounds.height - 0.5) < 0.01;
    })()`);
    await click(".arcade-exit");
    await waitFor("!document.querySelector('.arcade-section')");
    await waitFor(`(() => {
        const bounds = document.querySelector('#contact').getBoundingClientRect();
        const center = (document.querySelector('header > nav').getBoundingClientRect().bottom + innerHeight) / 2;
        return Math.abs((center - bounds.top) / bounds.height - 0.75) < 0.01;
    })()`);
    await send("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
    });
    for (const [from, to] of [
        [
            [1280, 900],
            [375, 667],
        ],
        [
            [375, 667],
            [1280, 900],
        ],
    ]) {
        await send("Emulation.setDeviceMetricsOverride", {
            width: from[0],
            height: from[1],
            deviceScaleFactor: 1,
            mobile: from[0] < 700,
        });
        await evaluate(
            "new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))"
        );
        const originalScroll = await evaluate("scrollY");
        for (const opening of [true, false]) {
            await evaluate(`window.motionSamples = []; window.motionAnimation = null;
                window.trackMotion = () => {
                    const section = document.querySelector('.arcade-section');
                    const animation = section?.getAnimations().find(animation => animation.playState !== 'idle');
                    if (animation) window.motionAnimation = animation;
                    motionSamples.push({time: Number(motionAnimation?.currentTime ?? 0), scrollY});
                    window.motionFrame = requestAnimationFrame(trackMotion);
                }; trackMotion();`);
            await click(opening ? ".arcade-trigger" : ".arcade-exit");
            await new Promise(resolve => setTimeout(resolve, 350));
            const [width, height] = opening ? to : from;
            await send("Emulation.setDeviceMetricsOverride", {
                width,
                height,
                deviceScaleFactor: 1,
                mobile: width < 700,
            });
            await waitFor(
                opening
                    ? "!!document.querySelector('.arcade-section.is-expanded') && !document.querySelector('.arcade-arriving-alien')"
                    : "!document.querySelector('.arcade-section')"
            );
            await new Promise(resolve => setTimeout(resolve, 100));
            const samples = await evaluate(
                "cancelAnimationFrame(motionFrame); motionSamples.filter(sample => sample.time >= 1000)"
            );
            assert.ok(
                samples.length > 3,
                "sampled the end of the resized animation"
            );
            assert.ok(
                samples
                    .slice(1)
                    .every(
                        (sample, i) =>
                            Math.abs(sample.scrollY - samples[i].scrollY) <= 2
                    ),
                "resizing during animation must not jump when the animation finishes"
            );
            if (opening) await checkOpeningPosition();
            else
                assert.ok(
                    Math.abs((await evaluate("scrollY")) - originalScroll) < 1,
                    "closing after an animated resize restores the original scroll position"
                );
        }
    }
    await send("Emulation.setDeviceMetricsOverride", {
        width: 440,
        height: 956,
        deviceScaleFactor: 1,
        mobile: true,
    });
    await click('[aria-label="Open menu"]');
    assert.ok(
        await evaluate(`(() => {
        const list = document.querySelector('#mobile-menu nav').getBoundingClientRect();
        return Math.abs(list.top + list.height / 2 - innerHeight / 2) < 1;
    })()`),
        "mobile menu list is centered in the viewport independently of the navbar"
    );
    await click('[aria-label="Close menu"]');
    // On a short viewport the game shrinks to fit; the footer alien must already match it.
    for (const [width, height, touch] of [
        [1280, 560, false],
        [390, 600, true],
    ]) {
        await send("Emulation.setDeviceMetricsOverride", {
            width,
            height,
            deviceScaleFactor: 1,
            mobile: touch,
        });
        await send("Emulation.setTouchEmulationEnabled", { enabled: touch });
        await send("Page.navigate", {
            url: process.argv[2] || "http://127.0.0.1:5173",
        });
        await waitFor('!!document.querySelector(".arcade-trigger svg")');
        const footerAlien = await evaluate(
            'document.querySelector(".arcade-trigger svg").getBoundingClientRect().width'
        );
        await click(".arcade-trigger");
        await waitFor(
            '!!document.querySelector(".arcade-section.is-expanded")'
        );
        const gameAlien = await evaluate(
            'document.querySelector("canvas").getBoundingClientRect().width * 11 / 224'
        );
        assert.ok(
            Math.abs(footerAlien - gameAlien) < 0.1,
            `${width}x${height}: footer alien ${footerAlien} matches the game's ${gameAlien}`
        );
        if (!touch) continue;
        // A phone's toolbar slides away mid-scroll: the taller viewport must not refit or jump.
        await evaluate("window.scrollBy(0, -150)");
        const before = await evaluate(
            "[scrollY, document.querySelector('canvas').getBoundingClientRect().width]"
        );
        await send("Emulation.setDeviceMetricsOverride", {
            width,
            height: height + 76,
            deviceScaleFactor: 1,
            mobile: true,
        });
        await new Promise(resolve => setTimeout(resolve, 300));
        assert.deepEqual(
            await evaluate(
                "[scrollY, document.querySelector('canvas').getBoundingClientRect().width]"
            ),
            before,
            "a toolbar-sized height change keeps the scroll and the game size"
        );
    }
    await send("Emulation.setTouchEmulationEnabled", { enabled: false });
    assert.deepEqual(errors, [], "browser must have no uncaught errors");
    console.log(
        "arcade: alien trigger, inline expansion, arrival, reduced motion, idle, Start, scoped keyboard input, fire, restart, close, touch, responsive layout, focus, and console passed"
    );
} finally {
    socket.close();
}
