interface ArrowProps {
    direction?: "ne" | "sw";
}

// Diagonal arrow; points north-east by default, south-west when rotated.
const Arrow: React.FC<ArrowProps> = ({ direction = "ne" }) => (
    <svg
        className={`ar ${direction === "sw" ? "ar-sw" : ""}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
    >
        <path d="M5.5 18.5 L18.5 5.5" />
        <path d="M9.5 5.5 H18.5 V14.5" />
    </svg>
);

export default Arrow;
