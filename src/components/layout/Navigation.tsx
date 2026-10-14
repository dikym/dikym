import React, { useState } from "react";
import type { NavigationItem } from "../../types";
import MobileMenu from "./MobileMenu.tsx";

interface NavigationProps {
    activeSection: string;
    isMobileMenuOpen: boolean;
    mobileMenuButtonRef: React.RefObject<HTMLButtonElement | null>;
    onScrollToSection: (sectionId: string) => void;
    onToggleMobileMenu: () => void;
}

const navigationItems: NavigationItem[] = [
    { id: "about", label: "About" },
    { id: "skills", label: "Skills" },
    { id: "projects", label: "Projects" },
];

const Navigation: React.FC<NavigationProps> = ({
    activeSection,
    isMobileMenuOpen,
    mobileMenuButtonRef,
    onScrollToSection,
    onToggleMobileMenu,
}) => {
    const [isDark, setIsDark] = useState(() =>
        document.documentElement.classList.contains("dark")
    );

    const toggleTheme = (): void => {
        const next = !isDark;
        document.documentElement.classList.toggle("dark", next);
        try {
            localStorage.setItem("theme", next ? "dark" : "light");
        } catch {
            // storage blocked: theme still applies for this visit
        }
        setIsDark(next);
    };

    return (
        <header>
            <nav className="fixed inset-x-0 top-0 z-50">
                {/* Stacking as in the reference: frame (-10) < menu sheet (60) < bar content (70),
                    so the sheet's wipe covers the frame and uncovers it again on close */}
                <div className="border-line bg-sheet absolute inset-y-0 right-(--rule-x) left-(--rule-x) -z-10 border-x border-y" />
                <div className="wrap relative z-[70] flex items-center gap-3 py-[11px] min-[961px]:gap-[30px] min-[961px]:py-[15px]">
                    <button
                        onClick={() => onScrollToSection("home")}
                        aria-label="dikym — back to top"
                        className="text-ink font-pixel cursor-pointer text-[30px] leading-none font-normal transition-opacity duration-200 hover:opacity-72"
                    >
                        dikym
                    </button>

                    <div className="ml-auto hidden gap-6 min-[961px]:flex">
                        {navigationItems.map(item => {
                            const isActive = activeSection === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => onScrollToSection(item.id)}
                                    aria-current={isActive ? "true" : undefined}
                                    className="text-ink relative cursor-pointer text-base font-medium transition-opacity duration-200 hover:opacity-62"
                                >
                                    {item.label}
                                    <span
                                        className={`bg-amber absolute -bottom-1.5 left-1/2 size-1.5 -translate-x-1/2 rounded-full [transition:opacity_.25s_ease,translate_.25s_var(--ease-sv),scale_.25s_var(--ease-sv)] ${
                                            isActive
                                                ? "scale-100 opacity-100"
                                                : "translate-y-[3px] scale-40 opacity-0"
                                        }`}
                                    />
                                </button>
                            );
                        })}
                    </div>

                    <button
                        onClick={toggleTheme}
                        aria-pressed={isDark}
                        aria-label={
                            isDark ? "Switch to light" : "Switch to dark"
                        }
                        className="text-ink hover:bg-tile dark:text-amber focus-visible:outline-amber-2 -mr-3.5 ml-auto inline-flex size-[30px] cursor-pointer items-center justify-center rounded-full [transition:background_.2s_var(--ease-sv)] focus-visible:outline-2 focus-visible:outline-offset-2 min-[961px]:-ml-3.5"
                    >
                        <svg
                            viewBox="0 0 20 20"
                            className={`ease-sv size-[18px] transition-transform duration-450 ${isDark ? "rotate-180" : ""}`}
                            aria-hidden="true"
                        >
                            <circle
                                cx="10"
                                cy="10"
                                r="6.6"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                            />
                            <path
                                d="M10 3.4a6.6 6.6 0 0 0 0 13.2z"
                                fill="currentColor"
                            />
                        </svg>
                    </button>

                    <button
                        onClick={() => onScrollToSection("contact")}
                        className="btn btn-amber hidden px-[13px] py-1.5 text-base leading-[1.55] min-[961px]:inline-flex"
                    >
                        Contact
                    </button>

                    <button
                        ref={mobileMenuButtonRef}
                        onClick={onToggleMobileMenu}
                        aria-label={
                            isMobileMenuOpen ? "Close menu" : "Open menu"
                        }
                        aria-expanded={isMobileMenuOpen}
                        aria-controls="mobile-menu"
                        className="group ml-4 flex size-10 cursor-pointer flex-col items-center justify-center gap-2 min-[961px]:hidden"
                    >
                        <span className="bg-ink block h-0.5 w-[22px] rounded-sm transition-[translate,rotate] duration-340 ease-[cubic-bezier(.7,0,.2,1)] group-aria-expanded:translate-y-[5px] group-aria-expanded:rotate-45" />
                        <span className="bg-ink block h-0.5 w-[22px] rounded-sm transition-[translate,rotate] duration-340 ease-[cubic-bezier(.7,0,.2,1)] group-aria-expanded:-translate-y-[5px] group-aria-expanded:-rotate-45" />
                    </button>
                </div>

                <MobileMenu
                    isOpen={isMobileMenuOpen}
                    navigationItems={[
                        { id: "home", label: "Home" },
                        ...navigationItems,
                        { id: "contact", label: "Contact" },
                    ]}
                    activeSection={activeSection}
                    onScrollToSection={onScrollToSection}
                />
            </nav>
        </header>
    );
};

export default Navigation;
