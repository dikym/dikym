import React from "react";
import type { NavigationItem } from "../types";
import MobileMenu from "../components/MobileMenu";

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
        <nav className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-md border-b border-gray-100 z-50 shadow-sm">
            <div className="max-w-5xl mx-auto px-6 py-4">
                <div className="flex justify-between items-center">
                    <div className="text-xl font-bold text-gray-900 font-mono">
                        dikym
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex space-x-8">
                        {navigationItems.map(section => (
                            <button
                                key={section.id}
                                onClick={() => onScrollToSection(section.id)}
                                className={`text-sm font-medium transition-all duration-300 pb-1 relative cursor-pointer ${
                                    activeSection === section.id
                                        ? "text-gray-900"
                                        : "text-gray-600 hover:text-gray-900"
                                }`}
                            >
                                {section.label}
                                {activeSection === section.id && (
                                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gray-900 rounded-full"></span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden hover:bg-gray-100 rounded-lg transition-colors duration-200"
                        onClick={onToggleMobileMenu}
                    >
                        <div className="w-6 h-6 grid grid-cols-2 gap-1">
                            <div className="w-2 h-2 bg-gray-900 rounded-full"></div>
                            <div className="w-2 h-2 bg-gray-900 rounded-full"></div>
                            <div className="w-2 h-2 bg-gray-900 rounded-full"></div>
                            <div className="w-2 h-2 bg-gray-900 rounded-full"></div>
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
