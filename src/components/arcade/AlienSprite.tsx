import type { Ref } from "react";
import { TWIN } from "../../game/sprites";

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
        shapeRendering="crispEdges"
        aria-hidden="true"
    >
        {TWIN.map((rows, frame) => (
            <g key={frame} className="crab-frame">
                {rows.flatMap((row, y) =>
                    [...row].map((pixel, x) =>
                        pixel === "X" ? (
                            <rect
                                key={`${x}-${y}`}
                                x={x}
                                y={y}
                                width="1"
                                height="1"
                            />
                        ) : null
                    )
                )}
            </g>
        ))}
    </svg>
);

export default AlienSprite;
