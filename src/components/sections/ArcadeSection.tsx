import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from "react";
import AlienSprite from "../arcade/AlienSprite";
import arcadeUrl from "virtual:arcade-url";
import {
    captureScrollPosition,
    scrollPositionTop,
} from "../../hooks/usePreserveScrollPosition";

let preparation: Promise<typeof import("../arcade/Quorzak")> | null = null;
let preparedComponent: typeof import("../arcade/Quorzak").default | null = null;
let failedAttempts = 0;
const loadGame = () =>
    (preparation ??= (
        failedAttempts
            ? import(/* @vite-ignore */ `${arcadeUrl}?retry=${failedAttempts}`)
            : import("../arcade/Quorzak")
    ).then(
        module => {
            preparedComponent = module.default;
            return module;
        },
        error => {
            preparation = null;
            failedAttempts++;
            throw error;
        }
    ));
const prepare = () =>
    void loadGame().catch(error => console.error("Arcade preload:", error));

const ArcadeSection = () => {
    const [GameComponent, setComponent] = useState(() => preparedComponent);
    const [pending, setPending] = useState(false);
    const [failed, setFailed] = useState(false);
    const requestRef = useRef<symbol | null>(null);
    const [origin, setOrigin] = useState<DOMRect | null>(null);
    const open = origin !== null;
    const triggerRef = useRef<HTMLButtonElement>(null);
    const openingScrollRef = useRef<ReturnType<
        typeof captureScrollPosition
    > | null>(null);
    useLayoutEffect(
        () => () => {
            requestRef.current = null;
        },
        []
    );
    // The font is ~3 KB gzipped: load it with the page, so the error bubble has it offline too.
    useEffect(() => {
        void document.fonts
            .load('14px "Quorzak"')
            .catch(error => console.error("Arcade font preload:", error));
    }, []);
    // The footer alien sizes itself like the game, which fits below the navbar.
    useLayoutEffect(() => {
        const nav = document.querySelector("header > nav");
        const slot = triggerRef.current!.parentElement!;
        if (!nav) return;
        const update = () =>
            slot.style.setProperty(
                "--nav-bottom",
                `${nav.getBoundingClientRect().bottom}px`
            );
        update();
        const observer = new ResizeObserver(update);
        observer.observe(nav);
        return () => observer.disconnect();
    }, []);
    useLayoutEffect(() => {
        if (!pending) return;
        const cancel = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return;
            requestRef.current = null;
            setPending(false);
            triggerRef.current?.focus({ preventScroll: true });
        };
        window.addEventListener("keydown", cancel);
        return () => window.removeEventListener("keydown", cancel);
    }, [pending]);
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
        requestRef.current = null;
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

    const requestOpen = () => {
        if (requestRef.current) return;
        const request = Symbol();
        requestRef.current = request;
        setFailed(false);
        prepare();
        const mount = (component: NonNullable<typeof preparedComponent>) => {
            if (requestRef.current !== request) return;
            const rect = triggerRef
                .current!.querySelector("svg")!
                .getBoundingClientRect();
            openingScrollRef.current = captureScrollPosition();
            setComponent(() => component);
            setOrigin(
                new DOMRect(
                    rect.x,
                    rect.y + window.scrollY,
                    rect.width,
                    rect.height
                )
            );
            setPending(false);
        };
        if (preparedComponent) mount(preparedComponent);
        else {
            setPending(true);
            void loadGame().then(
                module => mount(module.default),
                error => {
                    if (requestRef.current !== request) return;
                    requestRef.current = null;
                    setPending(false);
                    setFailed(true);
                    console.error("Arcade load:", error);
                }
            );
        }
    };

    return (
        <div className={failed ? "arcade-entry is-lost" : "arcade-entry"}>
            <div id="arcade" className="arcade-slot">
                {origin && GameComponent && (
                    <GameComponent
                        onClose={close}
                        origin={origin}
                        openingScroll={openingScrollRef.current!}
                    />
                )}
                <button
                    ref={triggerRef}
                    className="arcade-trigger"
                    aria-label="Open arcade"
                    aria-expanded={open}
                    aria-busy={pending}
                    aria-controls="arcade"
                    onPointerEnter={event => {
                        if (event.pointerType !== "touch") prepare();
                    }}
                    onFocus={prepare}
                    tabIndex={open ? -1 : 0}
                    onClick={requestOpen}
                >
                    <AlienSprite />
                </button>
                {pending && (
                    <span className="sr-only" role="status">
                        Loading arcade. Press Escape to cancel.
                    </span>
                )}
                {failed && (
                    <div role="alert" className="arcade-error">
                        <div className="flex items-start justify-between gap-3">
                            <p className="arcade-error-title">Signal lost</p>
                            <button
                                type="button"
                                aria-label="Dismiss"
                                onClick={() => {
                                    setFailed(false);
                                    triggerRef.current?.focus({
                                        preventScroll: true,
                                    });
                                }}
                                className="text-ink-2 hover:text-ink -mt-2 -mr-2 grid size-7 cursor-pointer place-items-center"
                            >
                                <svg
                                    viewBox="0 0 12 12"
                                    className="size-3"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    aria-hidden="true"
                                >
                                    <path d="M1 1l10 10M11 1L1 11" />
                                </svg>
                            </button>
                        </div>
                        <p className="text-ink-2 mt-2 text-sm">
                            The arcade could not beam down. Tap the alien to try
                            again, or refresh the page.
                        </p>
                        <button
                            type="button"
                            onClick={() => location.reload()}
                            className="border-line hover:border-ink mt-3 cursor-pointer border px-3 py-1.5 text-sm"
                        >
                            Refresh page
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ArcadeSection;
