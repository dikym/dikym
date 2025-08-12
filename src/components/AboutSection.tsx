const AboutSection: React.FC = () => {
    const stats = [
        {
            number: "5+",
            label: "Projects Delivered",
            description: "External client projects",
        },
        {
            number: "2+",
            label: "Years Experience",
            description: "Professional development",
        },
        {
            number: "10+",
            label: "Different Teams",
            description: "Cross-functional collaboration",
        },
    ];

    return (
        <section
            id="about"
            className="py-20 bg-gray-50"
            style={{ scrollMarginTop: "60px" }}
        >
            <div className="max-w-5xl mx-auto px-6">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    <div>
                        <h2 className="text-3xl md:text-4xl font-bold mb-8 text-gray-900">
                            About Me
                        </h2>
                        <div className="space-y-6">
                            <p className="text-lg text-gray-600 leading-relaxed">
                                I'm a passionate web developer with over{" "}
                                <span className="font-semibold text-gray-900">
                                    2+ years
                                </span>{" "}
                                of experience crafting digital experiences.
                                Currently based in{" "}
                                <span className="font-semibold text-gray-900">
                                    Malang, Indonesia
                                </span>
                                , I've contributed to{" "}
                                <span className="font-semibold text-gray-900">
                                    5+ external projects
                                </span>{" "}
                                and accumulated thousands of productive
                                development hours.
                            </p>
                            <p className="text-lg text-gray-600 leading-relaxed">
                                What drives me is the perfect blend of{" "}
                                <span className="font-semibold text-gray-900">
                                    technical precision
                                </span>{" "}
                                and
                                <span className="font-semibold text-gray-900">
                                    {" "}
                                    creative problem-solving
                                </span>
                                . I bring strong analytical thinking,
                                adaptability, and a commitment to delivering
                                high-quality outcomes that exceed expectations.
                            </p>
                            <p className="text-lg text-gray-600 leading-relaxed">
                                Whether working independently or collaborating
                                with cross-functional teams, I thrive on turning
                                complex challenges into elegant, performant
                                solutions that users love.
                            </p>
                        </div>
                    </div>
                    <div className="relative">
                        <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
                            <div className="space-y-6">
                                {stats.map((stat, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-4"
                                    >
                                        <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                                            <span className="text-gray-600 font-bold text-lg">
                                                {stat.number}
                                            </span>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-900">
                                                {stat.label}
                                            </h4>
                                            <p className="text-sm text-gray-600">
                                                {stat.description}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default AboutSection;
