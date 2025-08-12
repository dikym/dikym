import type { NavigationItem } from "../types";
import SocialLinks from "./SocialLinks";

interface MobileMenuProps {
    navigationItems: NavigationItem[];
    onScrollToSection: (sectionId: string) => void;
    onClose: () => void;
}

const MobileMenu: React.FC<MobileMenuProps> = ({
    navigationItems,
    onScrollToSection,
    onClose,
}) => {
    return (
        <div className="fixed inset-0 bg-white z-50 md:hidden">
            <div className="flex flex-col h-screen bg-white">
                {/* Mobile Menu Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
                    <div className="text-xl font-bold text-gray-900 font-mono">
                        dikym
                    </div>
                    <button
                        onClick={onClose}
                        className="hover:bg-gray-100 rounded-lg transition-colors duration-200 touch-manipulation"
                        aria-label="Close menu"
                    >
                        <svg
                            className="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 flex items-center justify-center">
                    <div className="space-y-8 text-center w-full px-6">
                        {navigationItems.map(section => (
                            <button
                                key={section.id}
                                onClick={() => onScrollToSection(section.id)}
                                className="block w-full text-3xl font-bold transition-all duration-300 py-3 rounded-lg touch-manipulation"
                            >
                                {section.label}
                            </button>
                        ))}
                    </div>
                </div>

                <SocialLinks />
            </div>
        </div>
    );
};

export default MobileMenu;
