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
            className="bg-gray-50 py-20"
            style={{ scrollMarginTop: "60px" }}
        >
            <div className="mx-auto max-w-5xl px-6">
                <div className="grid items-center gap-16 lg:grid-cols-2">
                    <div>
                        <h2 className="mb-8 text-3xl font-bold text-gray-900 md:text-4xl">
                            About Me
                        </h2>
                        <div className="space-y-6">
                            <p className="text-lg leading-relaxed text-gray-600">
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
                            <p className="text-lg leading-relaxed text-gray-600">
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
                            <p className="text-lg leading-relaxed text-gray-600">
                                Whether working independently or collaborating
                                with cross-functional teams, I thrive on turning
                                complex challenges into elegant, performant
                                solutions that users love.
                            </p>
                        </div>
                    </div>
                    <div className="relative">
                        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
                            <div className="space-y-6">
                                {stats.map((stat, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-4"
                                    >
                                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100">
                                            <span className="text-lg font-bold text-gray-600">
                                                {stat.number}
                                            </span>
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900">
                                                {stat.label}
                                            </h3>
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
