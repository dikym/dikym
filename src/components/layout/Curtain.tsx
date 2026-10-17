import { useEffect, useRef, useState } from "react";

const COLUMNS = 8;
const REVEAL_MS = 520 + (COLUMNS - 1) * 38;
const FILL_MS = 1100;

const shouldPlay = (): boolean => {
    try {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
            return false;
        if (sessionStorage.getItem("boot-seen")) return false;
        sessionStorage.setItem("boot-seen", "1");
        return true;
    } catch {
        return false;
    }
};
// Decided once at load, so StrictMode double renders don't skip the intro.
const PLAY = shouldPlay();

// Intro once per session: "Welcome." fills left to right, then columns lift away.
const Curtain: React.FC = () => {
    const [stage, setStage] = useState<"covered" | "reveal" | "done">(
        PLAY ? "covered" : "done"
    );
    const nameRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        if (stage !== "covered") return;
        const root = document.documentElement;
        root.style.overflow = "hidden";
        const start = performance.now();
        let pct = 0;
        let fontsReady = false;
        let frame = 0;

        // Only the page fonts: document.fonts.ready would also wait for the arcade font.
        Promise.all([
            Promise.allSettled([
                document.fonts.load('1em "General Sans"'),
                document.fonts.load('1em "Pixelify Sans"'),
            ]),
            new Promise(r => setTimeout(r, FILL_MS)),
        ]).then(() => (fontsReady = true));

        const reveal = () => {
            cancelAnimationFrame(frame);
            root.style.overflow = "";
            setStage("reveal");
        };
        // Creep to 92% while loading, then finish quickly once fonts are in.
        const tick = (now: number) => {
            pct = fontsReady
                ? Math.min(100, pct + 7)
                : Math.min(92, ((now - start) / FILL_MS) * 92);
            nameRef.current?.style.setProperty("--p", pct.toFixed(2));
            if (pct >= 100) return reveal();
            frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        const fallback = window.setTimeout(reveal, 3000);

        return () => {
            cancelAnimationFrame(frame);
            clearTimeout(fallback);
            root.style.overflow = "";
        };
    }, [stage]);

    useEffect(() => {
        if (stage !== "reveal") return;
        const timer = window.setTimeout(() => setStage("done"), REVEAL_MS + 60);
        return () => clearTimeout(timer);
    }, [stage]);

    if (stage === "done") return null;

    return (
        <div
            aria-hidden="true"
            className={`curtain pointer-events-none fixed inset-0 z-[500] is-${stage}`}
        >
            {Array.from({ length: COLUMNS }, (_, i) => (
                <div
                    key={i}
                    className="curtain-col"
                    style={{ "--i": i } as React.CSSProperties}
                />
            ))}
            <div
                className={`text-ink absolute inset-0 z-10 flex items-center justify-center transition-opacity duration-300 ${stage === "covered" ? "opacity-100" : "opacity-0"}`}
            >
                <span
                    ref={nameRef}
                    className="curtain-name text-[max(42px,5.6vw)] leading-[.92] font-medium tracking-[-0.045em]"
                    style={{ "--p": 0 } as React.CSSProperties}
                >
                    Welcome<span className="text-amber">.</span>
                </span>
            </div>
        </div>
    );
};

export default Curtain;
