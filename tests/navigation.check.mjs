// node --experimental-strip-types tests/navigation.check.mjs
import assert from "node:assert/strict";
import { useScrollToSection } from "../src/hooks/useScrollToSection.ts";

let scrolled;
let reducedMotion = false;
let ruleOffset;
let sectionTop = 645.65625;
globalThis.window = {
    scrollY: 500,
    matchMedia: () => ({ matches: reducedMotion }),
    scrollTo: options => {
        scrolled = options;
    },
};
globalThis.document = {
    getElementById: id =>
        id === "missing"
            ? null
            : {
                  getBoundingClientRect: () => ({ top: sectionTop }),
                  style: {
                      setProperty: (name, value) => {
                          assert.equal(name, "--section-rule-offset");
                          ruleOffset = parseFloat(value);
                      },
                  },
              },
    querySelector: () => ({
        getBoundingClientRect: () => ({ bottom: 66.796875 }),
    }),
};

const scrollToSection = useScrollToSection();
for (const top of [645.65625, 1748.21875, -116.4375, 2533.671875]) {
    sectionTop = top;
    scrollToSection("skills");
    const ruleTop = window.scrollY + top + ruleOffset - scrolled.top;
    assert.equal(
        ruleTop,
        67,
        "all section rules align at the same navbar pixel"
    );
    assert.equal(scrolled.behavior, "smooth");
}

reducedMotion = true;
scrollToSection("about");
assert.equal(scrolled.behavior, "instant");

scrolled = undefined;
scrollToSection("missing");
assert.equal(scrolled, undefined, "missing sections do not scroll");
console.log("Navigation checks passed");
