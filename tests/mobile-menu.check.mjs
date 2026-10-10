// Run Vite and Chrome with --remote-debugging-port=9222, then:
// node tests/mobile-menu.check.mjs http://127.0.0.1:5177
import assert from "node:assert/strict";

const site = process.argv[2] || "http://127.0.0.1:5177";
const debuggerUrl = process.argv[3] || "http://127.0.0.1:9222";
const tab = await fetch(`${debuggerUrl}/json/new?about:blank`, {
    method: "PUT",
}).then(r => r.json());
const socket = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise(resolve =>
    socket.addEventListener("open", resolve, { once: true })
);
let sequence = 0;
const pending = new Map();
const warnings = [];
socket.addEventListener("message", event => {
    const message = JSON.parse(event.data);
    if (message.method === "Log.entryAdded")
        warnings.push(message.params.entry.text);
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
    });
    assert.ok(
        !result.exceptionDetails,
        JSON.stringify(result.exceptionDetails)
    );
    return result.result.value;
};
const wait = async expression => {
    for (let i = 0; i < 400; i++) {
        if (await evaluate(expression)) return;
        await new Promise(resolve => setTimeout(resolve, 25));
    }
    assert.fail(`Timed out: ${expression}`);
};
const key = async value => {
    const params = {
        key: value,
        code: value,
        windowsVirtualKeyCode: { Enter: 13, Tab: 9, Escape: 27 }[value],
    };
    await send("Input.dispatchKeyEvent", {
        type: "keyDown",
        ...params,
        text: value === "Enter" ? "\r" : undefined,
    });
    await send("Input.dispatchKeyEvent", { type: "keyUp", ...params });
};
const viewport = width =>
    send("Emulation.setDeviceMetricsOverride", {
        width,
        height: 852,
        deviceScaleFactor: 1,
        mobile: false,
    });
const open = async () => {
    await evaluate("toggle.focus(); toggle.click()");
    await wait(
        "!menu.inert && getComputedStyle(menu).visibility === 'visible'"
    );
    assert.equal(await evaluate("document.body.style.overflow"), "hidden");
};
const closed = async () => {
    await wait(
        "menu.inert && toggle.getAttribute('aria-expanded') === 'false'"
    );
    assert.equal(await evaluate("document.body.style.overflow"), "");
    assert.equal(
        await evaluate("menu.contains(document.activeElement)"),
        false
    );
};

try {
    await send("Page.enable");
    await send("Log.enable");
    await send("Emulation.setFocusEmulationEnabled", { enabled: true });
    await viewport(393);
    await send("Page.navigate", { url: site });
    await wait(
        "!!document.getElementById('mobile-menu') && !document.querySelector('.curtain')"
    );
    await evaluate(`
        window.menu = document.getElementById('mobile-menu');
        window.toggle = document.querySelector('[aria-controls="mobile-menu"]');
        window.hiddenFocus = [];
        new MutationObserver(() => {
            if (menu.inert && menu.contains(document.activeElement))
                hiddenFocus.push(document.activeElement.textContent);
        }).observe(menu, {attributes: true, attributeFilter: ['inert']});
    `);
    await closed();
    await evaluate("menu.querySelector('button').focus()");
    assert.equal(
        await evaluate("menu.contains(document.activeElement)"),
        false
    );

    await evaluate("toggle.focus()");
    await key("Enter");
    await wait(
        "!menu.inert && getComputedStyle(menu).visibility === 'visible'"
    );
    await key("Tab");
    assert.equal(
        await evaluate(
            "document.activeElement === menu.querySelector('button')"
        ),
        true,
        "Tab reaches the first menu item"
    );
    await key("Escape");
    await closed();
    assert.equal(await evaluate("document.activeElement === toggle"), true);
    await key("Tab");
    assert.equal(
        await evaluate("menu.contains(document.activeElement)"),
        false
    );

    for (let i = 0; i < 5; i++) {
        await open();
        await evaluate(`{
            const item = menu.querySelectorAll('button')[${i}];
            item.focus(); item.click();
        }`);
        await closed();
        assert.equal(await evaluate("document.activeElement === toggle"), true);
    }
    await open();
    await evaluate("menu.querySelector('a').focus()");
    await key("Escape");
    await closed();
    assert.equal(await evaluate("document.activeElement === toggle"), true);

    await open();
    await evaluate("menu.querySelector('button').focus(); toggle.click()");
    await closed();
    assert.equal(await evaluate("document.activeElement === toggle"), true);

    await open();
    await evaluate("menu.querySelector('button').focus()");
    await viewport(961);
    await closed();
    assert.equal(
        await evaluate(
            "document.activeElement === document.querySelector('header nav button')"
        ),
        true,
        "desktop resize restores focus to a visible navigation button"
    );
    await viewport(393);
    await closed();
    assert.deepEqual(await evaluate("hiddenFocus"), []);
    assert.equal(
        warnings.some(text => /Blocked aria-hidden/i.test(text)),
        false
    );
    console.log(
        "Mobile menu checks passed: keyboard, all links, focus, inert, resize, no aria-hidden warning"
    );
} finally {
    await send("Page.close");
    socket.close();
}
