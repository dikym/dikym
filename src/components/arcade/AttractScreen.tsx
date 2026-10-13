import { useEffect, useState } from "react";
import {
    FIELD_BOTTOM,
    FIELD_TOP,
    FRAME_S,
    W,
    pixelColor,
} from "../../game/machine";
import { ALIEN_SPRITES, UFO } from "../../game/sprites";

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

const TYPE_FRAMES = 6;
// Quorzak title screen, in playfield coordinates; frames count from mount.
const LINES = [
    { text: "QUORZAK", x: 84, y: 64, start: 8, step: TYPE_FRAMES },
    { text: "POINT TABLE", x: 68, y: 112, start: 100, step: 0 },
    { text: "=? MYSTERY", x: 80, y: 136, start: 110, step: TYPE_FRAMES },
    { text: "=30 POINTS", x: 80, y: 152, start: 176, step: TYPE_FRAMES },
    { text: "=20 POINTS", x: 80, y: 168, start: 242, step: TYPE_FRAMES },
    { text: "=10 POINTS", x: 80, y: 184, start: 308, step: TYPE_FRAMES },
];
const ICONS_AT = 100;
const ICONS = [
    UFO,
    ALIEN_SPRITES[0][0],
    ALIEN_SPRITES[1][0],
    ALIEN_SPRITES[2][0],
].map((rows, i) => ({ rows, x: 60, y: 136 + i * 16 }));
const END = 308 + 9 * TYPE_FRAMES;
const GAME_OVER = { text: "GAME OVER", x: 76, y: 56 };

const AttractScreen: React.FC = () => {
    const frame = useRomFrames(END);
    return (
        <div className="arcade-attract">
            <p className="sr-only">
                Play Quorzak. Point table: mystery ship, 30 points, 20 points,
                10 points.
            </p>
            <div aria-hidden="true">
                {LINES.map(({ text, x, y, start, step }) => (
                    <span
                        key={text}
                        className="arcade-attract-text"
                        style={textStyle(x, y)}
                    >
                        {frame < start
                            ? ""
                            : step
                              ? text.slice(
                                    0,
                                    Math.floor((frame - start) / step) + 1
                                )
                              : text}
                    </span>
                ))}
                {frame >= ICONS_AT &&
                    ICONS.map((icon, i) => (
                        <PixelSprite
                            key={i}
                            rows={icon.rows}
                            x={icon.x}
                            y={icon.y}
                        />
                    ))}
            </div>
        </div>
    );
};

export default AttractScreen;

export const GameOverText: React.FC = () => {
    const { text, x, y } = GAME_OVER;
    const frame = useRomFrames((text.length - 1) * TYPE_FRAMES);
    return (
        <span
            className="arcade-attract-text arcade-game-over"
            style={textStyle(x, y)}
        >
            {text.slice(0, Math.floor(frame / TYPE_FRAMES) + 1)}
        </span>
    );
};
