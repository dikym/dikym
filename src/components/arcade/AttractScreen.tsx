import { useEffect, useState } from "react";
import { ATTRACT_END, GAME_OVER, attractState } from "../../game/attract";
import {
    FIELD_BOTTOM,
    FIELD_TOP,
    FRAME_S,
    W,
    pixelColor,
} from "../../game/invaders";
import { ATTRACT_ICONS, CARRIER } from "../../game/sprites";

// Percentages of the playfield, which shows screen rows 32–239.
const place = (x: number, y: number) => ({
    left: `${(x / W) * 100}%`,
    top: `${((y - FIELD_TOP) / (FIELD_BOTTOM - FIELD_TOP)) * 100}%`,
});

// ROM glyphs leave cell column 0 blank; the site font's ink starts at its box edge.
const GLYPH_INSET = 1;

// A text cell takes the overlay colors of its rows; GAME OVER straddles red and white.
const textStyle = (x: number, y: number) => {
    const top = pixelColor(x, y + 1);
    const bottom = pixelColor(x, y + 7);
    if (top === bottom) return { ...place(x + GLYPH_INSET, y), color: top };
    let split = 1;
    while (pixelColor(x, y + split) === top) split++;
    return {
        ...place(x + GLYPH_INSET, y),
        color: "transparent",
        backgroundImage: `linear-gradient(${top} ${(split / 8) * 100}%, ${bottom} ${(split / 8) * 100}%)`,
        backgroundClip: "text",
        WebkitBackgroundClip: "text",
    };
};

// Counts ROM frames from mount up to `end`; reduced motion starts at the end.
const useRomFrames = (end: number) => {
    const [frame, setFrame] = useState(() =>
        matchMedia("(prefers-reduced-motion: reduce)").matches ? end : 0
    );
    const done = frame >= end;
    useEffect(() => {
        if (done) return;
        let elapsed = 0;
        let last = performance.now();
        let id = requestAnimationFrame(function tick(now) {
            // Same cap as the game loop, so a background tab resumes where it stopped.
            elapsed += Math.min(Math.max(0, now - last) / 1000, 0.05);
            last = now;
            setFrame(Math.min(end, Math.floor(elapsed / FRAME_S + 1e-9)));
            id = requestAnimationFrame(tick);
        });
        return () => cancelAnimationFrame(id);
    }, [done, end]);
    return frame;
};

interface PixelSpriteProps {
    rows: string[];
    x: number;
    y: number;
    className?: string;
}

const PixelSprite: React.FC<PixelSpriteProps> = ({
    rows,
    x,
    y,
    className = "",
}) => (
    <svg
        className={`arcade-attract-sprite ${className}`}
        style={{ ...place(x, y), color: pixelColor(x, y) }}
        viewBox="0 0 16 8"
        preserveAspectRatio="none"
        shapeRendering="crispEdges"
    >
        {rows.flatMap((row, py) =>
            [...row].map((pixel, px) =>
                pixel === "X" ? (
                    <rect
                        key={`${px}-${py}`}
                        x={px}
                        y={py}
                        width="1"
                        height="1"
                        fill="currentColor"
                    />
                ) : null
            )
        )}
    </svg>
);

const AttractScreen: React.FC = () => {
    const [upsideDown] = useState(() => Math.random() < 0.5);
    const frame = useRomFrames(
        ATTRACT_END[upsideDown ? "upsideDown" : "normal"]
    );

    const state = attractState(frame, upsideDown);
    return (
        <div className="arcade-attract">
            <p className="sr-only">
                Play Space Invaders. Score advance table: mystery ship, 30
                points, 20 points, 10 points.
            </p>
            <div aria-hidden="true">
                {state.lines.map(line => (
                    <span
                        key={line.text}
                        className="arcade-attract-text"
                        style={textStyle(line.x, line.y)}
                    >
                        {line.text.slice(0, line.visible)}
                    </span>
                ))}
                {state.y && (
                    <span
                        className={
                            state.y.flipped
                                ? "arcade-attract-text arcade-attract-flipped"
                                : "arcade-attract-text"
                        }
                        style={textStyle(state.y.x, state.y.y)}
                    >
                        Y
                    </span>
                )}
                {state.icons.map((icon, i) => (
                    <PixelSprite
                        key={i}
                        rows={ATTRACT_ICONS[i]}
                        x={icon.x}
                        y={icon.y}
                    />
                ))}
                {state.carrier && (
                    <PixelSprite
                        rows={CARRIER[state.carrier.phase][state.carrier.image]}
                        x={state.carrier.x}
                        y={state.carrier.y}
                        className="arcade-attract-carrier"
                    />
                )}
            </div>
        </div>
    );
};

export default AttractScreen;

export const GameOverText: React.FC = () => {
    const { text, x, y, step } = GAME_OVER;
    const frame = useRomFrames((text.length - 1) * step);
    return (
        <span
            className="arcade-attract-text arcade-game-over"
            style={textStyle(x, y)}
        >
            {text.slice(0, Math.floor(frame / step) + 1)}
        </span>
    );
};
