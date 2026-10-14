import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from "react";
import AttractScreen, { GameOverText } from "./AttractScreen";
import AlienSprite from "./AlienSprite";
import { createArcadeAudio } from "../../game/audio";
import { ALIEN_SPRITES, PLAYER, SCORE_GLYPHS } from "../../game/sprites";
import {
    COLS,
    FIELD_TOP,
    FIELD_BOTTOM,
    FRAME_S,
    PIXEL_ASPECT,
    W,
    litPixel,
    pixelColor,
    newGame,
    step,
} from "../../game/machine";
import type { Game, Input, Invader } from "../../game/machine";
import {
    captureScrollPosition,
    fitArcadeToViewport,
    scrollPositionTop,
} from "../../hooks/usePreserveScrollPosition";

const ARRIVING_INVADER = COLS * 4 - 1;

const drawSprite = (
    ctx: CanvasRenderingContext2D,
    rows: string[],
    x: number,
    y: number
) => {
    rows.forEach((row, dy) => {
        for (let dx = 0; dx < row.length; dx++)
            if (row[dx] === "X")
                ctx.fillRect(Math.round(x) + dx, Math.round(y) + dy, 1, 1);
    });
};

const readBest = (): number => {
    try {
        return Number(localStorage.getItem("quorzak-best")) || 0;
    } catch {
        return 0;
    }
};

const KEYS: Record<string, keyof Input> = {
    ArrowLeft: "left",
    KeyA: "left",
    ArrowRight: "right",
    KeyD: "right",
    Space: "fire",
    ArrowUp: "fire",
    KeyW: "fire",
};

interface QuorzakProps {
    // All absent on the standalone subdomain page.
    onClose?: (finished: boolean) => void;
    origin?: DOMRect;
    openingScroll?: ReturnType<typeof captureScrollPosition>;
}

interface Hud {
    score: number;
    lives: number;
    wave: number;
    over: boolean;
}

const Quorzak: React.FC<QuorzakProps> = ({
    onClose,
    origin,
    openingScroll,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const sectionRef = useRef<HTMLElement>(null);
    const alienRef = useRef<SVGSVGElement>(null);
    const arrivedRef = useRef(!onClose);
    const [arrived, setArrived] = useState(!onClose);
    const [closing, setClosing] = useState(false);
    const [ufoPoints, setUfoPoints] = useState<{
        x: number;
        y: number;
        points: number;
    } | null>(null);
    const closingRef = useRef(false);
    const returningInvaderRef = useRef<Invader | null>(null);
    const interruptedRef = useRef<{
        height: number;
        alien: DOMRect;
        color: string;
    } | null>(null);
    const gameRef = useRef<Game | null>(null);
    gameRef.current ??= newGame();
    const inputRef = useRef<Input>({ left: false, right: false, fire: false });
    const heldRef = useRef({
        left: new Set<string>(),
        right: new Set<string>(),
        fire: new Set<string>(),
    });
    const setInput = useCallback(
        (action: keyof Input, source: string, pressed: boolean) => {
            const held = heldRef.current[action];
            if (pressed) held.add(source);
            else held.delete(source);
            inputRef.current[action] = held.size > 0;
        },
        []
    );
    const clearInput = useCallback(() => {
        for (const action of ["left", "right", "fire"] as const) {
            heldRef.current[action].clear();
            inputRef.current[action] = false;
        }
    }, []);
    const startedRef = useRef(false);
    const [started, setStarted] = useState(false);
    const [hud, setHud] = useState<Hud>({
        score: 0,
        lives: 3,
        wave: 1,
        over: false,
    });
    const [best, setBest] = useState(readBest);
    const audioRef = useRef<ReturnType<typeof createArcadeAudio>>(null);
    const [muted, setMuted] = useState(false);

    useEffect(
        () => () => {
            audioRef.current?.close();
            audioRef.current = null;
        },
        []
    );

    useLayoutEffect(() => {
        const section = sectionRef.current!;
        const panel = section.querySelector<HTMLElement>(".arcade-panel")!;
        const fit = () => fitArcadeToViewport(section);
        fit();
        const observer = new ResizeObserver(fit);
        observer.observe(panel);
        window.addEventListener("resize", fit);
        return () => {
            observer.disconnect();
            window.removeEventListener("resize", fit);
        };
    }, []);

    const requestClose = useCallback(() => {
        if (closingRef.current) return;
        closingRef.current = true;
        audioRef.current?.close();
        audioRef.current = null;
        clearInput();
        returningInvaderRef.current =
            gameRef.current!.invaders.find(
                invader => invader.row === 1 && invader.alive
            ) ?? gameRef.current!.invaders[ARRIVING_INVADER];
        setClosing(true);
    }, [clearInput]);

    const startingRef = useRef(false);
    // Enter and the controls hand focus back to the game.
    const focusGame = useCallback(() => {
        canvasRef.current?.focus({ preventScroll: true });
    }, []);
    useEffect(() => {
        if (onClose) return;
        // The subdomain page only hosts the game: focus always returns to it
        // (background clicks, Tab, buttons), except inside the notice dialog.
        let timer = 0;
        const keep = () => {
            clearTimeout(timer);
            timer = window.setTimeout(() => {
                const active = document.activeElement;
                if (
                    active === sectionRef.current ||
                    active === canvasRef.current ||
                    active?.closest("dialog")
                )
                    return;
                focusGame();
            });
        };
        const focusOut = (e: FocusEvent) => {
            if (!e.relatedTarget) keep();
        };
        document.addEventListener("focusin", keep);
        document.addEventListener("focusout", focusOut);
        return () => {
            clearTimeout(timer);
            document.removeEventListener("focusin", keep);
            document.removeEventListener("focusout", focusOut);
        };
    }, [onClose, focusGame]);
    const standaloneRef = useRef(!onClose);
    // Enter pauses and resumes a running game.
    const pausedRef = useRef(false);
    const [paused, setPaused] = useState(false);
    // Keys reach the game only from the field or the section itself, not from a button or outside.
    const [focused, setFocused] = useState(false);
    const focusedRef = useRef(false);
    const setFocus = (value: boolean) => {
        if (closingRef.current) return;
        focusedRef.current = value;
        setFocused(value);
    };
    // A tap focuses the section before its click lands, so the click reads the state from pointerdown.
    const focusedAtPressRef = useRef(false);
    const setPause = useCallback(
        (value: boolean) => {
            pausedRef.current = value;
            setPaused(value);
            clearInput();
        },
        [clearInput]
    );
    const noticeRef = useRef<HTMLDialogElement>(null);
    const start = async () => {
        // Enter and a tap can both arrive while the audio still downloads.
        if (startingRef.current) return;
        startingRef.current = true;
        try {
            audioRef.current ??= createArcadeAudio();
            audioRef.current?.setMuted(muted);
            await audioRef.current?.start();
            if (closingRef.current) return;
            if (startedRef.current) gameRef.current = newGame();
            setPause(false);
            startedRef.current = true;
            setStarted(true);
            setHud({ score: 0, lives: 3, wave: 1, over: false });
            canvasRef.current?.focus();
        } finally {
            startingRef.current = false;
        }
    };
    // Lets the window key handler start the game without re-subscribing each render.
    const startRef = useRef(start);
    useLayoutEffect(() => {
        startRef.current = start;
    });

    // The same transition runs in both directions, keeping the alien attached to the page.
    useLayoutEffect(() => {
        const section = sectionRef.current!;
        // The subdomain page has no portfolio to fly in from or scroll back to.
        if (!onClose || !origin || !openingScroll) {
            section.classList.add("is-expanded");
            section.focus({ preventScroll: true });
            return;
        }
        const alien = alienRef.current!;
        section
            .querySelector<HTMLButtonElement>(".arcade-exit")
            ?.focus({ preventScroll: true });
        if (!section.contains(document.activeElement))
            section.focus({ preventScroll: true });
        const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
        let cancelled = false;
        let scrollStart = window.scrollY;
        const root = document.documentElement;
        const previousStyles = {
            overflow: root.style.overflow,
            overflowAnchor: root.style.overflowAnchor,
            touchAction: root.style.touchAction,
            scrollbarGutter: root.style.scrollbarGutter,
        };
        Object.assign(root.style, {
            overflow: "hidden",
            overflowAnchor: "none",
            touchAction: "none",
            scrollbarGutter: "stable",
        });
        let scrollLocked = true;
        const unlockScroll = () => {
            if (!scrollLocked) return;
            Object.assign(root.style, previousStyles);
            scrollLocked = false;
        };
        const canvas = canvasRef.current!.getBoundingClientRect();
        const bounds = section.getBoundingClientRect();
        const interrupted = closing ? interruptedRef.current : null;
        interruptedRef.current = null;
        const initialHeight = closing
            ? (interrupted?.height ?? bounds.height)
            : 0;
        const navbarBottom =
            document.querySelector("header > nav")?.getBoundingClientRect()
                .bottom ?? 0;
        const openingTop =
            navbarBottom +
            Math.max(
                0,
                (window.innerHeight - navbarBottom - bounds.height) / 2
            );
        const invader = closing
            ? returningInvaderRef.current!
            : gameRef.current!.invaders[ARRIVING_INVADER];
        const scale = canvas.width / W;
        const scaleY = scale * PIXEL_ASPECT;
        const targetX = canvas.x + (invader.x + 3) * scale;
        const targetY = canvas.y + (invader.y - FIELD_TOP) * scaleY;
        const formation = new DOMRect(targetX, targetY, 9 * scale, 8 * scaleY);
        const triggerAlien =
            section.parentElement!.querySelector<SVGSVGElement>(
                ".arcade-trigger svg"
            )!;
        const trigger = triggerAlien.getBoundingClientRect();
        const footerColor = getComputedStyle(triggerAlien).color;
        const formationColor = pixelColor(invader.x + 3, invader.y);
        const source = closing
            ? (interrupted?.alien ?? formation)
            : new DOMRect(
                  origin.x,
                  origin.y - scrollStart,
                  origin.width,
                  origin.height
              );
        const destination = closing ? trigger : formation;
        const closingScroll = () =>
            openingScroll.width === window.innerWidth
                ? openingScroll.scrollY
                : scrollPositionTop(openingScroll) -
                  (openingScroll.element &&
                  section.compareDocumentPosition(openingScroll.element) &
                      Node.DOCUMENT_POSITION_FOLLOWING
                      ? section.getBoundingClientRect().height
                      : 0);
        let scrollEnd = closing
            ? Math.max(0, closingScroll())
            : Math.max(0, scrollStart + bounds.top - openingTop);
        Object.assign(alien.style, {
            visibility: closing && gameRef.current!.over ? "hidden" : "visible",
            left: `${source.x - bounds.x}px`,
            top: `${source.y - bounds.y}px`,
            width: `${source.width}px`,
            height: `${source.height}px`,
        });
        section.classList.remove("is-expanded");
        const timing = {
            duration: reduced ? 0 : 1200,
            // A quick start keeps the peak scroll speed low when the page travels far.
            easing: "cubic-bezier(.4,0,.2,1)",
        };
        const reveal = section.animate(
            [
                { height: `${initialHeight}px` },
                { height: closing ? "0px" : `${bounds.height}px` },
            ],
            { ...timing, fill: "forwards" }
        );
        const flight = alien.animate(
            [
                {
                    transform: "translate(0, 0) scale(1)",
                    color: closing
                        ? (interrupted?.color ?? formationColor)
                        : footerColor,
                },
                {
                    transform: `translate(${destination.x - source.x}px, ${destination.y - source.y}px) scale(${destination.width / source.width})`,
                    color: closing ? footerColor : formationColor,
                },
            ],
            { ...timing, fill: "forwards" }
        );
        let startFrame = 0;
        if (!reduced) {
            reveal.pause();
            flight.pause();
            reveal.currentTime = flight.currentTime = 0;
            startFrame = requestAnimationFrame(() => {
                const readyAt = performance.now();
                const start = (stamp: number) => {
                    if (stamp < readyAt) {
                        startFrame = requestAnimationFrame(start);
                        return;
                    }
                    reveal.play();
                    flight.play();
                };
                startFrame = requestAnimationFrame(start);
            });
        }
        // Lift Contact with the reveal instead of jumping to the game afterward.
        let scrollFrame = 0;
        const followReveal = () => {
            const progress = reveal.effect!.getComputedTiming().progress ?? 0;
            window.scrollTo({
                top: scrollStart + (scrollEnd - scrollStart) * progress,
                behavior: "instant",
            });
            scrollFrame = requestAnimationFrame(followReveal);
        };
        scrollFrame = requestAnimationFrame(followReveal);
        const resize = () => {
            if (reveal.playState !== "running" && reveal.playState !== "paused")
                return;
            const position = captureScrollPosition();
            fitArcadeToViewport(section);
            const height = section
                .querySelector<HTMLElement>(".arcade-panel")!
                .getBoundingClientRect().height;
            (reveal.effect as KeyframeEffect).setKeyframes([
                { height: closing ? `${height}px` : "0px" },
                { height: closing ? "0px" : `${height}px` },
            ]);
            window.scrollTo({
                top: scrollPositionTop(position),
                behavior: "instant",
            });
            const resized = section.getBoundingClientRect();
            const nav = document
                .querySelector("header > nav")!
                .getBoundingClientRect().bottom;
            scrollEnd = Math.max(
                0,
                closing
                    ? closingScroll()
                    : window.scrollY +
                          resized.top -
                          nav -
                          Math.max(0, (window.innerHeight - nav - height) / 2)
            );
            const progress = reveal.effect!.getComputedTiming().progress ?? 0;
            if (progress < 1)
                scrollStart =
                    (window.scrollY - scrollEnd * progress) / (1 - progress);
            const field = canvasRef.current!.getBoundingClientRect();
            const destination = closing
                ? triggerAlien.getBoundingClientRect()
                : new DOMRect(
                      field.x + ((invader.x + 3) * field.width) / W,
                      field.y +
                          (((invader.y - FIELD_TOP) * field.width) / W) *
                              PIXEL_ASPECT,
                      (9 * field.width) / W,
                      ((8 * field.width) / W) * PIXEL_ASPECT
                  );
            const color = getComputedStyle(alien);
            (flight.effect as KeyframeEffect).setKeyframes([
                {
                    offset: progress,
                    transform: color.transform,
                    color: color.color,
                },
                {
                    offset: 1,
                    transform: `translate(${destination.x - resized.x - parseFloat(alien.style.left)}px, ${destination.y - resized.y - parseFloat(alien.style.top)}px) scale(${destination.width / parseFloat(alien.style.width)})`,
                    color: closing ? footerColor : formationColor,
                },
            ]);
        };
        window.addEventListener("resize", resize);
        void Promise.all([reveal.finished, flight.finished])
            .then(() => {
                if (cancelled) return;
                cancelAnimationFrame(scrollFrame);
                window.scrollTo({
                    top: scrollEnd,
                    behavior: "instant",
                });
                unlockScroll();
                if (closing) {
                    onClose(gameRef.current!.over);
                    return;
                }
                reveal.cancel();
                section.classList.add("is-expanded");
                // The field, not a button, takes focus so Enter starts the game.
                canvasRef.current?.focus({ preventScroll: true });
                arrivedRef.current = true;
                setArrived(true);
            })
            .catch(() => {
                if (cancelled) return;
                cancelAnimationFrame(scrollFrame);
                unlockScroll();
            });
        return () => {
            cancelled = true;
            window.removeEventListener("resize", resize);
            if (reveal.playState === "running" || reveal.playState === "paused")
                interruptedRef.current = {
                    height: section.getBoundingClientRect().height,
                    alien: alien.getBoundingClientRect(),
                    color: getComputedStyle(alien).color,
                };
            cancelAnimationFrame(startFrame);
            cancelAnimationFrame(scrollFrame);
            unlockScroll();
            reveal.cancel();
            flight.cancel();
        };
    }, [origin, closing, onClose, openingScroll]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const action = KEYS[e.code];
            if (action && e.type === "keyup") {
                setInput(action, `key:${e.code}`, false);
                return;
            }
            const enter =
                e.type === "keydown" &&
                !e.repeat &&
                (e.code === "Enter" || e.code === "NumpadEnter");
            if (!sectionRef.current?.contains(e.target as Node)) return;
            if (e.key === "Escape" && e.type === "keydown") {
                if (onClose) requestClose();
                return;
            }
            if (
                enter &&
                !(e.target instanceof HTMLButtonElement) &&
                !(e.target instanceof HTMLAnchorElement)
            ) {
                e.preventDefault();
                if (!startedRef.current || gameRef.current!.over) {
                    // Not while the portfolio alien is still flying in.
                    if (arrivedRef.current) void startRef.current();
                } else setPause(!pausedRef.current);
                return;
            }
            if (!action) return;
            if (
                !startedRef.current ||
                gameRef.current!.over ||
                pausedRef.current ||
                e.target instanceof HTMLButtonElement
            )
                return;
            e.preventDefault();
            setInput(action, `key:${e.code}`, true);
        };
        window.addEventListener("keydown", onKey);
        window.addEventListener("keyup", onKey);
        window.addEventListener("blur", clearInput);
        document.addEventListener("visibilitychange", clearInput);
        return () => {
            window.removeEventListener("keydown", onKey);
            window.removeEventListener("keyup", onKey);
            window.removeEventListener("blur", clearInput);
            document.removeEventListener("visibilitychange", clearInput);
        };
    }, [onClose, requestClose, clearInput, setInput, setPause]);

    // iOS shows its magnifier on a long press even with user-select: none; cancelling touchstart stops it.
    useEffect(() => {
        const controls = sectionRef.current?.querySelector(
            ".arcade-touch-controls"
        );
        const prevent = (e: Event) => e.preventDefault();
        controls?.addEventListener("touchstart", prevent, { passive: false });
        return () => controls?.removeEventListener("touchstart", prevent);
    }, []);

    // Game loop.
    useEffect(() => {
        const ctx = canvasRef.current?.getContext("2d");
        if (!ctx) return;
        ctx.imageSmoothingEnabled = false;
        // The original screen reserves 32 pixels for a HUD, now rendered in HTML.
        ctx.setTransform(1, 0, 0, 1, 0, -FIELD_TOP);
        const image = ctx.createImageData(W, FIELD_BOTTOM - FIELD_TOP);
        for (let y = FIELD_TOP; y < FIELD_BOTTOM; y++) {
            const red = y < 62;
            const green = y >= 184;
            for (let x = 0; x < W; x++) {
                const i = ((y - FIELD_TOP) * W + x) * 4;
                image.data[i] = green ? 32 : 255;
                image.data[i + 1] = red ? 32 : 255;
                image.data[i + 2] = red || green ? 32 : 255;
            }
        }

        let frame = 0;
        let accumulator = 0;
        let last = performance.now();
        let drawn = false;
        let drawnArrived = false;
        let drawnClosing = false;
        const loop = (now: number) => {
            if (!sectionRef.current || !canvasRef.current) return;
            const dt = Math.min((now - last) / 1000, 0.05);
            last = now;
            let updated = false;
            if (
                startedRef.current &&
                !gameRef.current!.over &&
                !pausedRef.current &&
                !closingRef.current &&
                !document.hidden &&
                sectionRef.current?.contains(document.activeElement)
            ) {
                accumulator += dt;
                while (accumulator + 1e-9 >= FRAME_S) {
                    step(gameRef.current!, inputRef.current, FRAME_S);
                    accumulator -= FRAME_S;
                    updated = true;
                }
            } else accumulator = 0;

            frame = requestAnimationFrame(loop);

            const s = gameRef.current!;
            for (const event of s.events) audioRef.current?.play(event);
            audioRef.current?.sync(
                s.sound,
                startedRef.current &&
                    !pausedRef.current &&
                    !closingRef.current &&
                    !document.hidden &&
                    sectionRef.current.contains(document.activeElement) &&
                    !s.over
            );
            s.events.length = 0;
            if (
                drawn &&
                !updated &&
                drawnArrived === arrivedRef.current &&
                drawnClosing === closingRef.current
            )
                return;
            drawn = true;
            drawnArrived = arrivedRef.current;
            drawnClosing = closingRef.current;
            const points = s.ufoPoints;
            // The attract screen ends on the ground line; mobile compositing can leak that edge row.
            // Elsewhere the ROM's screens keep the line.
            const groundHidden = !startedRef.current && standaloneRef.current;
            for (let x = 0; x < W; x++)
                for (let y = FIELD_TOP; y < FIELD_BOTTOM; y++) {
                    const scorePixel =
                        points &&
                        y >= 40 &&
                        y < 48 &&
                        x >= points.x &&
                        x < points.x + 24;
                    image.data[((y - FIELD_TOP) * W + x) * 4 + 3] =
                        !scorePixel &&
                        !(groundHidden && y === FIELD_BOTTOM - 1) &&
                        litPixel(s, x, y)
                            ? 255
                            : 0;
                }
            ctx.putImageData(image, 0, 0);
            if (!startedRef.current) {
                for (const inv of s.invaders) {
                    if (
                        !arrivedRef.current &&
                        inv === s.invaders[ARRIVING_INVADER]
                    )
                        continue;
                    ctx.fillStyle = pixelColor(inv.x, inv.y);
                    drawSprite(
                        ctx,
                        ALIEN_SPRITES[
                            inv.row === 0 ? 0 : inv.row < 3 ? 1 : 2
                        ][0],
                        inv.x,
                        inv.y
                    );
                }
            }
            const returning = returningInvaderRef.current;
            if (closingRef.current && returning?.alive && !s.over) {
                // A rack moves one alien at a time; its previous row can be 8px higher.
                ctx.clearRect(returning.x, returning.y - 8, 17, 16);
            }
            setUfoPoints(previous =>
                points
                    ? previous?.x === points.x &&
                      previous.points === points.points
                        ? previous
                        : { x: points.x, y: points.y, points: points.points! }
                    : previous === null
                      ? previous
                      : null
            );
            const over = s.over;

            setHud(prev =>
                prev.score === s.score &&
                prev.lives === s.lives &&
                prev.wave === s.wave &&
                prev.over === over
                    ? prev
                    : {
                          score: s.score,
                          lives: s.lives,
                          wave: s.wave,
                          over,
                      }
            );
        };
        frame = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(frame);
    }, []);

    // Keep the best score.
    useEffect(() => {
        if (hud.score <= best) return;
        setBest(hud.score);
        try {
            localStorage.setItem("quorzak-best", String(hud.score));
        } catch {
            // storage blocked: best score lasts for this visit only
        }
    }, [hud.score, best]);

    const hold = (action: keyof Input) => ({
        onPointerDown: (e: React.PointerEvent) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            setInput(action, `pointer:${e.pointerId}`, true);
        },
        onPointerUp: (e: React.PointerEvent) =>
            setInput(action, `pointer:${e.pointerId}`, false),
        onPointerCancel: (e: React.PointerEvent) =>
            setInput(action, `pointer:${e.pointerId}`, false),
        onLostPointerCapture: (e: React.PointerEvent) =>
            setInput(action, `pointer:${e.pointerId}`, false),
        onKeyDown: (e: React.KeyboardEvent) => {
            if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                setInput(action, `button:${e.key}`, true);
            }
        },
        onKeyUp: (e: React.KeyboardEvent) =>
            setInput(action, `button:${e.key}`, false),
        onBlur: () => {
            setInput(action, "button: ", false);
            setInput(action, "button:Enter", false);
        },
    });

    // Same states as the Enter hint: the opening keeps it, out of focus asks for a tap first.
    const tapHint = !(focused || !arrived)
        ? "Tap to focus"
        : hud.over
          ? "Tap to play again"
          : !started
            ? "Tap to start"
            : "";

    const exitIcon = (
        <svg viewBox="0 0 16 16" aria-hidden="true">
            <path
                d="m3.5 3.5 9 9m0-9-9 9"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeLinecap="round"
            />
        </svg>
    );

    return (
        <>
            <section
                ref={sectionRef}
                tabIndex={-1}
                aria-labelledby="quorzak-title"
                // Closing parks focus on Close; setFocus keeps the state it had before.
                onFocus={e =>
                    setFocus(
                        e.target === e.currentTarget ||
                            e.target === canvasRef.current
                    )
                }
                onBlur={e => {
                    if (e.currentTarget.contains(e.relatedTarget)) return;
                    clearInput();
                    setFocus(false);
                }}
                onPointerDown={() => {
                    focusedAtPressRef.current = focusedRef.current;
                }}
                // A click anywhere on the cabinet, except buttons and links, focuses the game.
                // On touch screens, which have no Enter key, a tap in focus also starts it.
                onClick={e => {
                    if (
                        closingRef.current ||
                        (e.target as Element).closest("button, a")
                    )
                        return;
                    if (
                        focusedAtPressRef.current &&
                        arrived &&
                        (!started || hud.over) &&
                        (e.nativeEvent as PointerEvent).pointerType === "touch"
                    )
                        void start();
                    else focusGame();
                }}
                className="arcade-section"
            >
                <div className="arcade-clip">
                    <div className="arcade-panel">
                        <div className="arcade-cabinet">
                            <header className="arcade-marquee">
                                <h2 id="quorzak-title" className="sr-only">
                                    Arcade
                                </h2>
                                <button
                                    // Sound and Close never take focus from a click, so it stays in or out of the game.
                                    onMouseDown={e => e.preventDefault()}
                                    onClick={() => {
                                        setMuted(!muted);
                                        audioRef.current?.setMuted(!muted);
                                    }}
                                    aria-label={
                                        muted ? "Unmute sound" : "Mute sound"
                                    }
                                    aria-pressed={muted}
                                    className="arcade-button arcade-sound"
                                >
                                    {/* Tabler Icons — license in public/licenses/tabler-icons.txt. */}
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.875"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-hidden="true"
                                    >
                                        {muted ? (
                                            <>
                                                <path d="M15 8a5 5 0 0 1 1.912 4.934m-1.377 2.602a5 5 0 0 1 -.535 .464" />
                                                <path d="M17.7 5a9 9 0 0 1 2.362 11.086m-1.676 2.299a9 9 0 0 1 -.686 .615" />
                                                <path d="M9.069 5.054l.431 -.554a.8 .8 0 0 1 1.5 .5v2m0 4v8a.8 .8 0 0 1 -1.5 .5l-3.5 -4.5h-2a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1h2l1.294 -1.664" />
                                                <path d="M3 3l18 18" />
                                            </>
                                        ) : (
                                            <>
                                                <path d="M15 8a5 5 0 0 1 0 8" />
                                                <path d="M17.7 5a9 9 0 0 1 0 14" />
                                                <path d="M6 15h-2a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1h2l3.5 -4.5a.8 .8 0 0 1 1.5 .5v14a.8 .8 0 0 1 -1.5 .5l-3.5 -4.5" />
                                            </>
                                        )}
                                    </svg>
                                </button>
                                {onClose && (
                                    <button
                                        onMouseDown={e => e.preventDefault()}
                                        onClick={requestClose}
                                        aria-label="Close game"
                                        className="arcade-button arcade-exit"
                                    >
                                        {exitIcon}
                                    </button>
                                )}
                            </header>

                            <div className="arcade-body">
                                <div className="arcade-screen">
                                    <div className="arcade-game">
                                        <div className="arcade-scoreboard">
                                            <div>
                                                <span className="arcade-label">
                                                    Score
                                                </span>
                                                <b>
                                                    {String(hud.score).padStart(
                                                        4,
                                                        "0"
                                                    )}
                                                </b>
                                            </div>
                                            <div className="text-(--arcade-accent)">
                                                <span className="arcade-label">
                                                    Hi-score
                                                </span>
                                                <b>
                                                    {String(best).padStart(
                                                        4,
                                                        "0"
                                                    )}
                                                </b>
                                            </div>
                                            <div>
                                                <span className="arcade-label">
                                                    Wave
                                                </span>
                                                <b>
                                                    {String(hud.wave).padStart(
                                                        2,
                                                        "0"
                                                    )}
                                                </b>
                                            </div>
                                        </div>
                                        <div className="arcade-playfield">
                                            <canvas
                                                ref={canvasRef}
                                                width={W}
                                                height={
                                                    FIELD_BOTTOM - FIELD_TOP
                                                }
                                                // Tab reaches the game in every state; Enter starts it from here.
                                                tabIndex={closing ? -1 : 0}
                                                aria-label="Game field. Enter to start or pause, left and right arrows to move, Space to fire."
                                                className="block w-full [image-rendering:pixelated]"
                                            />
                                            {ufoPoints && (
                                                <svg
                                                    className="arcade-ufo-points"
                                                    width={36 / PIXEL_ASPECT}
                                                    height="12"
                                                    viewBox="0 0 24 8"
                                                    preserveAspectRatio="none"
                                                    shapeRendering="crispEdges"
                                                    role="img"
                                                    aria-label={`${ufoPoints.points} points`}
                                                    style={{
                                                        left: `clamp(0px, ${(ufoPoints.x / W) * 100}%, calc(100% - ${18 / 7}em))`,
                                                        top: `${((ufoPoints.y - FIELD_TOP) / (FIELD_BOTTOM - FIELD_TOP)) * 100}%`,
                                                    }}
                                                >
                                                    {String(ufoPoints.points)
                                                        .padStart(3, " ")
                                                        .split("")
                                                        .flatMap((digit, i) =>
                                                            SCORE_GLYPHS[
                                                                digit
                                                            ].flatMap(
                                                                (row, y) =>
                                                                    [
                                                                        ...row,
                                                                    ].map(
                                                                        (
                                                                            pixel,
                                                                            x
                                                                        ) =>
                                                                            pixel ===
                                                                            "X" ? (
                                                                                <rect
                                                                                    key={`${i}-${x}-${y}`}
                                                                                    x={
                                                                                        i *
                                                                                            8 +
                                                                                        x
                                                                                    }
                                                                                    y={
                                                                                        y
                                                                                    }
                                                                                    width="1"
                                                                                    height="1"
                                                                                    fill="currentColor"
                                                                                />
                                                                            ) : null
                                                                    )
                                                            )
                                                        )}
                                                </svg>
                                            )}
                                            {!onClose && !started ? (
                                                <AttractScreen />
                                            ) : (
                                                hud.over && (
                                                    // ROM layout: GAME OVER typed over the frozen playfield, no panel.
                                                    <GameOverText />
                                                )
                                            )}
                                        </div>
                                        <div className="arcade-status">
                                            <span
                                                className={
                                                    !onClose && !started
                                                        ? "arcade-lives invisible"
                                                        : "arcade-lives"
                                                }
                                                role="img"
                                                aria-label={`${hud.lives} lives remaining`}
                                            >
                                                <span className="arcade-life-count">
                                                    {hud.lives}
                                                </span>
                                                {Array.from(
                                                    {
                                                        length: Math.max(
                                                            0,
                                                            hud.lives - 1
                                                        ),
                                                    },
                                                    (_, life) => (
                                                        <svg
                                                            key={life}
                                                            viewBox="0 0 16 8"
                                                            preserveAspectRatio="none"
                                                            aria-hidden="true"
                                                            className="text-(--arcade-player)"
                                                            shapeRendering="crispEdges"
                                                        >
                                                            {PLAYER.flatMap(
                                                                (row, y) =>
                                                                    [
                                                                        ...row,
                                                                    ].map(
                                                                        (
                                                                            pixel,
                                                                            x
                                                                        ) =>
                                                                            pixel ===
                                                                            "X" ? (
                                                                                <rect
                                                                                    key={`${x}-${y}`}
                                                                                    x={
                                                                                        x
                                                                                    }
                                                                                    y={
                                                                                        y
                                                                                    }
                                                                                    width="1"
                                                                                    height="1"
                                                                                    fill="currentColor"
                                                                                />
                                                                            ) : null
                                                                    )
                                                            )}
                                                        </svg>
                                                    )
                                                )}
                                            </span>
                                            <span
                                                role="status"
                                                aria-label={
                                                    hud.over
                                                        ? "Game over"
                                                        : started
                                                          ? "Playing"
                                                          : "Ready"
                                                }
                                            >
                                                Free play
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <aside
                                    className="arcade-controls"
                                    aria-label="Game instructions"
                                >
                                    <div className="arcade-keyboard-hint">
                                        <span>
                                            <kbd aria-label="Left arrow">
                                                <svg
                                                    width="16"
                                                    height="16"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    aria-hidden="true"
                                                >
                                                    <path d="M19 12H5m7-7-7 7 7 7" />
                                                </svg>
                                            </kbd>
                                            <kbd aria-label="Right arrow">
                                                <svg
                                                    width="16"
                                                    height="16"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    aria-hidden="true"
                                                >
                                                    <path d="M5 12h14m-7-7 7 7-7 7" />
                                                </svg>
                                            </kbd>
                                            <kbd>A</kbd>
                                            <kbd>D</kbd> Move
                                        </span>
                                        <span>
                                            <kbd aria-label="Up arrow">
                                                <svg
                                                    width="16"
                                                    height="16"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    aria-hidden="true"
                                                >
                                                    <path d="M12 19V5m-7 7 7-7 7 7" />
                                                </svg>
                                            </kbd>
                                            <kbd>Space</kbd>
                                            <kbd>W</kbd> Fire
                                        </span>
                                        <span className="arcade-start-hint">
                                            {/* The opening accepts no input yet, so it keeps the Enter hint. */}
                                            {focused || !arrived ? (
                                                <>
                                                    <kbd>Enter</kbd>{" "}
                                                    {hud.over
                                                        ? "Play again"
                                                        : !started
                                                          ? "Start"
                                                          : paused
                                                            ? "Resume"
                                                            : "Pause"}
                                                </>
                                            ) : (
                                                <>
                                                    <kbd>Click</kbd> Focus
                                                </>
                                            )}
                                        </span>
                                    </div>
                                    <p
                                        className={
                                            tapHint
                                                ? "arcade-start-hint arcade-tap-hint"
                                                : "arcade-start-hint arcade-tap-hint invisible"
                                        }
                                    >
                                        {tapHint || "Tap to start"}
                                    </p>
                                    <div className="arcade-touch-controls">
                                        <button
                                            disabled={
                                                !started || hud.over || closing
                                            }
                                            aria-label="Move left"
                                            className="arcade-button"
                                            {...hold("left")}
                                        >
                                            <svg
                                                viewBox="0 0 16 16"
                                                aria-hidden="true"
                                                shapeRendering="crispEdges"
                                            >
                                                <path
                                                    d="M8 2H6v2H4v2H2v4h2v2h2v2h2v-4h6V6H8z"
                                                    fill="currentColor"
                                                />
                                            </svg>
                                        </button>
                                        <button
                                            disabled={
                                                !started || hud.over || closing
                                            }
                                            aria-label="Move right"
                                            className="arcade-button"
                                            {...hold("right")}
                                        >
                                            <svg
                                                viewBox="0 0 16 16"
                                                aria-hidden="true"
                                                shapeRendering="crispEdges"
                                            >
                                                <path
                                                    d="M8 2h2v2h2v2h2v4h-2v2h-2v2H8v-4H2V6h6z"
                                                    fill="currentColor"
                                                />
                                            </svg>
                                        </button>
                                        <button
                                            disabled={
                                                !started || hud.over || closing
                                            }
                                            className="arcade-button arcade-fire"
                                            {...hold("fire")}
                                        >
                                            <span className="arcade-stretch">
                                                Fire
                                            </span>
                                        </button>
                                    </div>
                                    {!onClose && (
                                        <p className="arcade-credit">
                                            Quorzak · Made by{" "}
                                            <a href="https://dikym.me/">Diky</a>{" "}
                                            ·{" "}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    noticeRef.current?.showModal();
                                                    // Enter then closes the notice instead of following its first link.
                                                    noticeRef.current
                                                        ?.querySelector<HTMLButtonElement>(
                                                            "form button"
                                                        )
                                                        ?.focus();
                                                }}
                                            >
                                                Notice
                                            </button>
                                        </p>
                                    )}
                                </aside>
                            </div>
                        </div>
                    </div>
                </div>
                {(!arrived || closing) && (
                    <AlienSprite
                        ref={alienRef}
                        className="arcade-arriving-alien"
                    />
                )}
            </section>
            {!onClose && (
                // Outside the section, so the game pauses and ignores keys while it is open.
                <dialog
                    ref={noticeRef}
                    className="arcade-notice"
                    aria-labelledby="arcade-notice-title"
                    onClose={focusGame}
                    onClick={e => {
                        if (e.target === e.currentTarget)
                            e.currentTarget.close();
                    }}
                >
                    <h2 id="arcade-notice-title">About this page</h2>
                    <p>
                        Quorzak is an original game by{" "}
                        <a href="https://dikym.me/">Diky</a>, written in Intel
                        8080 assembly and run by a browser-based 8080 emulator.
                    </p>
                    <p>
                        Third-party licenses:{" "}
                        <a href="/licenses/8080js.txt">8080js</a>,{" "}
                        <a href="/fonts/quorzak/license.txt">font</a> (“Space
                        Invaders (extended)” by Patrick H. Lauke, CC BY 3.0),{" "}
                        <a href="/licenses/tabler-icons.txt">icons</a>.
                    </p>
                    <form method="dialog">
                        <button>Close</button>
                    </form>
                </dialog>
            )}
        </>
    );
};

export default Quorzak;
