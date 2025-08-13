import type { NavigationItem } from "../../types";
import SocialLinks from "../ui/SocialLinks.tsx";

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
        <div className="fixed inset-0 z-50 bg-white md:hidden">
            <div className="flex h-screen flex-col bg-white">
                {/* Mobile Menu Header */}
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                    <div className="font-mono text-xl font-bold text-gray-900">
                        dikym
                    </div>
                    <button
                        onClick={onClose}
                        className="touch-manipulation rounded-lg transition-colors duration-200 hover:bg-gray-100"
                        aria-label="Close menu"
                    >
                        <svg
                            className="h-6 w-6"
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

                <div className="flex flex-1 items-center justify-center">
                    <div className="w-full space-y-8 px-6 text-center">
                        {navigationItems.map(section => (
                            <button
                                key={section.id}
                                onClick={() => onScrollToSection(section.id)}
                                className="block w-full touch-manipulation rounded-lg py-3 text-3xl font-bold transition-all duration-300"
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
