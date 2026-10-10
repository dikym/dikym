import { useLayoutEffect } from "react";

const viewportCenter = () => {
    const navbarBottom =
        document.querySelector("header > nav")?.getBoundingClientRect()
            .bottom ?? 0;
    return (navbarBottom + window.innerHeight) / 2;
};

export const captureScrollPosition = (previousElement?: HTMLElement) => {
    const center = viewportCenter();
    let bounds: DOMRect | undefined;
    const atCenter = (element: HTMLElement) => {
        const measured = element.getBoundingClientRect();
        if (measured.top > center || measured.bottom < center) return false;
        bounds = measured;
        return true;
    };
    const element =
        previousElement?.isConnected &&
        atCenter(previousElement) &&
        bounds?.top !== center
            ? previousElement
            : Array.from(
                  document.querySelectorAll<HTMLElement>(
                      "main > section, .arcade-section, footer"
                  )
              ).find(atCenter);
    return {
        element,
        progress: bounds ? (center - bounds.top) / bounds.height : 0,
        scrollY: window.scrollY,
        width: window.innerWidth,
        height: window.innerHeight,
    };
};

export const fitArcadeToViewport = (section: HTMLElement) => {
    const board = section.querySelector<HTMLElement>(".arcade-game")!;
    const panel = section.querySelector<HTMLElement>(".arcade-panel")!;
    // The second pass applies the fitted width to the HUD before scrolling.
    for (let pass = 0; pass < 2; pass++) {
        const width = parseFloat(getComputedStyle(board).width);
        board.style.setProperty("--arcade-ui-scale", String(width / 448));
        const game = board.getBoundingClientRect();
        const navbarBottom =
            document.querySelector("header > nav")?.getBoundingClientRect()
                .bottom ?? 0;
        const available =
            window.innerHeight -
            navbarBottom -
            (panel.getBoundingClientRect().height - game.height);
        if (game.width && game.height)
            section.style.setProperty(
                "--arcade-height-width",
                `${Math.max(1, (available * width) / game.height)}px`
            );
    }
    // Title screen text keeps its width-fitted size and shrinks only when height limits the game.
    const screen = board.parentElement!;
    const padding = getComputedStyle(screen);
    const room = Math.min(
        448,
        screen.clientWidth -
            parseFloat(padding.paddingLeft) -
            parseFloat(padding.paddingRight)
    );
    board.style.setProperty(
        "--arcade-fit-scale",
        String(Math.min(1, parseFloat(getComputedStyle(board).width) / room))
    );
};

export const scrollPositionTop = (
    position: ReturnType<typeof captureScrollPosition>
) => {
    if (position.scrollY <= 0) return 0;
    if (!position.element?.isConnected) return window.scrollY;
    const bounds = position.element.getBoundingClientRect();
    return (
        window.scrollY +
        bounds.top +
        bounds.height * position.progress -
        viewportCenter()
    );
};

export const usePreserveScrollPosition = () => {
    useLayoutEffect(() => {
        const root = document.documentElement;
        const previousAnchor = root.style.overflowAnchor;
        root.style.overflowAnchor = "none";
        let position = captureScrollPosition();
        const capture = () => {
            if (
                window.innerWidth === position.width &&
                (window.innerHeight === position.height ||
                    !position.element?.matches(".arcade-section"))
            )
                position = captureScrollPosition(position.element);
        };
        const restore = () => {
            const arcade =
                document.querySelector<HTMLElement>(".arcade-section");
            if (arcade) fitArcadeToViewport(arcade);
            window.scrollTo({
                top: scrollPositionTop(position),
                behavior: "instant",
            });
            position = captureScrollPosition(position.element);
        };
        const resize = () => {
            if (
                window.innerWidth === position.width &&
                (window.innerHeight === position.height ||
                    !position.element?.matches(".arcade-section"))
            )
                return;
            restore();
        };
        const cancelRestore = () => {
            if (window.innerWidth === position.width) return;
            position = captureScrollPosition(position.element);
        };
        const interactions = ["pointerdown", "wheel", "keydown", "click"];
        for (const event of interactions)
            document.addEventListener(event, cancelRestore, {
                capture: true,
                passive: true,
            });
        window.addEventListener("scroll", capture, { passive: true });
        window.addEventListener("resize", resize);
        const observer = new ResizeObserver(resize);
        observer.observe(document.querySelector("header > nav")!);
        return () => {
            observer.disconnect();
            root.style.overflowAnchor = previousAnchor;
            window.removeEventListener("scroll", capture);
            window.removeEventListener("resize", resize);
            for (const event of interactions)
                document.removeEventListener(event, cancelRestore, true);
        };
    }, []);
};
