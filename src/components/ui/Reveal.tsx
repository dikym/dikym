import type { ReactNode } from "react";
import { useReveal } from "../../hooks/useReveal";

interface RevealProps {
    children: ReactNode;
    className?: string;
    variant?: "rv" | "stagger";
}

export const Reveal: React.FC<RevealProps> = ({
    children,
    className = "",
    variant = "rv",
}) => {
    const [ref, isIn] = useReveal<HTMLDivElement>();
    return (
        <div
            ref={ref}
            className={`${variant} ${isIn ? "is-in" : ""} ${className}`}
        >
            {children}
        </div>
    );
};

interface RevealLinesProps {
    as?: "h1" | "h2";
    lead: string;
    dim: string;
    className?: string;
}

// Two-tone heading: first line ink, second line muted, each rising from a mask.
export const RevealLines: React.FC<RevealLinesProps> = ({
    as: Tag = "h2",
    lead,
    dim,
    className = "",
}) => {
    const [ref, isIn] = useReveal<HTMLHeadingElement>();
    return (
        <Tag ref={ref} className={`lines ${isIn ? "is-in" : ""} ${className}`}>
            <span className="ln">
                <span>{lead}</span>
            </span>
            <span className="ln">
                <span className="text-ink-3">{dim}</span>
            </span>
        </Tag>
    );
};
