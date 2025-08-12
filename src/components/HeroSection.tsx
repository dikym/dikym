interface HeroSectionProps {
    onScrollToSection: (sectionId: string) => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onScrollToSection }) => {
    return (
        <section
            id="home"
            className="pt-32 pb-20"
            style={{ scrollMarginTop: "60px" }}
        >
            <div className="max-w-5xl mx-auto px-6">
                <div className="max-w-4xl">
                    <div className="mb-8">
                        <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6 text-gray-900">
                            Building fast, impactful web experiences across the
                            full stack.
                        </h1>
                        <p className="text-xl text-gray-600 leading-relaxed mb-8 max-w-3xl">
                            Passionate web developer with a special love for
                            crafting clean, user-friendly interfaces that
                            perform smoothly and deliver exceptional user
                            experiences.
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 mb-16">
                        <button
                            onClick={() => onScrollToSection("projects")}
                            className="bg-gray-900 text-white px-8 py-3 rounded-lg font-medium hover:bg-gray-800 transition-all duration-200 flex items-center gap-2 justify-center hover:shadow-lg hover:-translate-y-0.5"
                        >
                            View Projects
                            <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                                />
                            </svg>
                        </button>
                        <button
                            onClick={() => onScrollToSection("contact")}
                            className="border border-gray-300 px-8 py-3 rounded-lg font-medium hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
                        >
                            Get In Touch
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default HeroSection;
