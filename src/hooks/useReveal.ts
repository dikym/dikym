import { useEffect, useRef, useState } from "react";

// Flips to true once the element scrolls into view, then stays true.
export const useReveal = <T extends HTMLElement>(threshold = 0.16) => {
    const ref = useRef<T>(null);
    const [isIn, setIsIn] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el || isIn) return;
        const observer = new IntersectionObserver(
            entries => entries.some(e => e.isIntersecting) && setIsIn(true),
            { threshold }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [isIn, threshold]);

    return [ref, isIn] as const;
};
