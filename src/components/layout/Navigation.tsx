import React from "react";
import type { NavigationItem } from "../../types";
import MobileMenu from "./MobileMenu.tsx";

interface NavigationProps {
    activeSection: string;
    isMobileMenuOpen: boolean;
    onScrollToSection: (sectionId: string) => void;
    onToggleMobileMenu: () => void;
    onCloseMobileMenu: () => void;
}

const Navigation: React.FC<NavigationProps> = ({
    activeSection,
    isMobileMenuOpen,
    onScrollToSection,
    onToggleMobileMenu,
    onCloseMobileMenu,
}) => {
    const navigationItems: NavigationItem[] = [
        { id: "home", label: "Home" },
        { id: "about", label: "About" },
        { id: "projects", label: "Projects" },
        { id: "contact", label: "Contact" },
    ];

    return (
        <nav className="fixed top-0 right-0 left-0 z-50 border-b border-gray-100 bg-white/90 shadow-sm backdrop-blur-md">
            <div className="mx-auto max-w-5xl px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="font-mono text-xl font-bold text-gray-900">
                        dikym
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden space-x-8 md:flex">
                        {navigationItems.map(section => (
                            <button
                                key={section.id}
                                onClick={() => onScrollToSection(section.id)}
                                className={`relative cursor-pointer pb-1 text-sm font-medium transition-all duration-300 ${
                                    activeSection === section.id
                                        ? "text-gray-900"
                                        : "text-gray-600 hover:text-gray-900"
                                }`}
                            >
                                {section.label}
                                {activeSection === section.id && (
                                    <span className="absolute bottom-0 left-0 h-0.5 w-full rounded-full bg-gray-900"></span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        aria-label="Toggle mobile menu"
                        className="rounded-lg transition-colors duration-200 hover:bg-gray-100 md:hidden"
                        onClick={onToggleMobileMenu}
                    >
                        <div className="grid h-6 w-6 grid-cols-2 gap-1">
                            <div className="h-2 w-2 rounded-full bg-gray-900"></div>
                            <div className="h-2 w-2 rounded-full bg-gray-900"></div>
                            <div className="h-2 w-2 rounded-full bg-gray-900"></div>
                            <div className="h-2 w-2 rounded-full bg-gray-900"></div>
                        </div>
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <MobileMenu
                    navigationItems={navigationItems}
                    onScrollToSection={onScrollToSection}
                    onClose={onCloseMobileMenu}
                />
            )}
        </nav>
    );
};

export default Navigation;
