import type { Ref } from "react";
import { pixelPath, TWIN } from "../../game/sprites";

// One path per frame: its pixels antialias like the scaled game field, with no seams.
const FRAMES = TWIN.map(rows => pixelPath(rows));

const AlienSprite = ({
    className,
    ref,
}: {
    className?: string;
    ref?: Ref<SVGSVGElement>;
}) => (
    <svg
        ref={ref}
        className={className}
        viewBox="0 0 11 8"
        preserveAspectRatio="none"
        fill="currentColor"
        aria-hidden="true"
    >
        {FRAMES.map((d, frame) => (
            <path key={frame} className="crab-frame" d={d} />
        ))}
    </svg>
);

export default AlienSprite;
