import type { NavigationItem } from "../../types";

interface MobileMenuProps {
    isOpen: boolean;
    navigationItems: NavigationItem[];
    activeSection: string;
    onScrollToSection: (sectionId: string) => void;
}

const MobileMenu: React.FC<MobileMenuProps> = ({
    isOpen,
    navigationItems,
    activeSection,
    onScrollToSection,
}) => {
    return (
        <div
            id="mobile-menu"
            inert={!isOpen}
            className={`menu-sheet bg-page fixed inset-0 z-[60] min-[961px]:hidden ${isOpen ? "is-open" : ""}`}
        >
            <div className="flex h-full flex-col justify-between px-[calc(var(--gutter)+var(--inset))] pt-[calc(var(--nav-h)+clamp(24px,5vh,44px))] pb-[clamp(28px,5vh,48px)]">
                <nav className="absolute top-1/2 right-[calc(var(--gutter)+var(--inset))] left-[calc(var(--gutter)+var(--inset))] flex -translate-y-1/2 flex-col">
                    {navigationItems.map((item, i) => (
                        <span
                            key={item.id}
                            className="ln border-line-2 relative flex items-baseline gap-4 overflow-hidden border-b"
                            style={{ "--i": i } as React.CSSProperties}
                        >
                            <span className="eyebrow text-amber-2">
                                {String(i + 1).padStart(2, "0")}
                            </span>
                            <button
                                onClick={() => onScrollToSection(item.id)}
                                className={`flex-1 cursor-pointer py-[clamp(14px,2.4vh,22px)] text-left text-[clamp(30px,9vw,44px)] leading-[1.06] font-medium tracking-[-0.03em] ${
                                    activeSection === item.id
                                        ? "text-amber-2"
                                        : "text-ink"
                                }`}
                            >
                                {item.label}
                            </button>
                        </span>
                    ))}
                </nav>
                <div
                    className="menu-foot eyebrow text-ink-3 mt-auto flex items-baseline justify-between gap-4 tracking-[0.14em]"
                    style={
                        { "--i": navigationItems.length } as React.CSSProperties
                    }
                >
                    <a href="mailto:hello@dikym.me" className="text-ink">
                        hello@dikym.me
                    </a>
                    <span>Bali, Indonesia</span>
                </div>
            </div>
        </div>
    );
};

export default MobileMenu;
