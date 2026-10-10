import {
    lazy,
    Suspense,
    useCallback,
    useLayoutEffect,
    useRef,
    useState,
} from "react";
import CrabSprite from "../arcade/CrabSprite";
import {
    captureScrollPosition,
    scrollPositionTop,
} from "../../hooks/usePreserveScrollPosition";

const SpaceInvaders = lazy(() => import("../arcade/SpaceInvaders"));

const ArcadeSection = () => {
    const [origin, setOrigin] = useState<DOMRect | null>(null);
    const open = origin !== null;
    const triggerRef = useRef<HTMLButtonElement>(null);
    const openingScrollRef = useRef<ReturnType<
        typeof captureScrollPosition
    > | null>(null);
    useLayoutEffect(() => {
        if (origin || !openingScrollRef.current) return;
        const position = openingScrollRef.current;
        window.scrollTo({
            top:
                position.width === window.innerWidth
                    ? position.scrollY
                    : scrollPositionTop(position),
            behavior: "instant",
        });
        openingScrollRef.current = null;
    }, [origin]);
    const close = useCallback((finished: boolean) => {
        setOrigin(null);
        triggerRef.current?.focus({ preventScroll: true });
        if (
            finished &&
            !matchMedia("(prefers-reduced-motion: reduce)").matches
        ) {
            triggerRef.current
                ?.querySelector("svg")
                ?.animate(
                    [
                        { transform: "translateY(calc(100% + 2px))" },
                        { transform: "translateY(0)" },
                    ],
                    { duration: 360, easing: "cubic-bezier(.2,.8,.2,1)" }
                );
        }
    }, []);

    return (
        <div className="arcade-entry">
            <div id="arcade" className="arcade-slot">
                {origin && (
                    <Suspense fallback={null}>
                        <SpaceInvaders
                            onClose={close}
                            origin={origin}
                            openingScroll={openingScrollRef.current!}
                        />
                    </Suspense>
                )}
                <button
                    ref={triggerRef}
                    className="arcade-trigger"
                    aria-label="Open arcade"
                    aria-expanded={open}
                    aria-controls="arcade"
                    tabIndex={open ? -1 : 0}
                    onClick={() => {
                        if (open) return;
                        openingScrollRef.current = captureScrollPosition();
                        const rect = triggerRef
                            .current!.querySelector("svg")!
                            .getBoundingClientRect();
                        setOrigin(
                            new DOMRect(
                                rect.x,
                                rect.y + window.scrollY,
                                rect.width,
                                rect.height
                            )
                        );
                    }}
                >
                    <CrabSprite />
                </button>
            </div>
        </div>
    );
};

export default ArcadeSection;
