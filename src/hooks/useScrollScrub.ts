import { useEffect, useRef } from "react";

interface ScrubOptions {
    from?: number; // starting scale
    rise?: number; // starting Y offset in px
    start?: number; // viewport fraction where the container top starts the run
    span?: number; // viewport fraction the run takes to finish
    overlap?: number; // how much each child's window overlaps the next
}

const clamp = (v: number, min: number, max: number) =>
    Math.min(max, Math.max(min, v));

// easeOutBack: settles with a slight overshoot
const ease = (t: number) => {
    const y = t - 1;
    return 1 + 2.7 * y * y * y + 1.7 * y * y;
};

// Scroll-linked entrance: children scale and rise in one after another,
// tied to scroll position (scrubs back when scrolling up).
export const useScrollScrub = <T extends HTMLElement>({
    from = 0.88,
    rise = 18,
    start = 0.9,
    span = 0.5,
    overlap = 0.7,
}: ScrubOptions = {}) => {
    const ref = useRef<T>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const items = Array.from(el.children) as HTMLElement[];
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
            return;

        items.forEach(item => (item.style.willChange = "transform, opacity"));
        let frame = 0;
        let last = -1;

        const update = () => {
            frame = 0;
            const vh = window.innerHeight;
            const progress = clamp(
                (vh * start - el.getBoundingClientRect().top) / (vh * span),
                0,
                1
            );
            if (progress === last) return;
            last = progress;
            const step = 1 / items.length;
            items.forEach((item, i) => {
                const t = clamp((progress - i * step) / (step * overlap), 0, 1);
                const k = ease(t);
                item.style.opacity = clamp(t * 1.6, 0, 1).toFixed(3);
                item.style.transform = `translateY(${((1 - k) * rise).toFixed(2)}px) scale(${(from + (1 - from) * k).toFixed(4)})`;
            });
        };
        const schedule = () => {
            if (!frame) frame = requestAnimationFrame(update);
        };

        update();
        window.addEventListener("scroll", schedule, { passive: true });
        window.addEventListener("resize", schedule);
        return () => {
            window.removeEventListener("scroll", schedule);
            window.removeEventListener("resize", schedule);
            cancelAnimationFrame(frame);
        };
    }, [from, rise, start, span, overlap]);

    return ref;
};
