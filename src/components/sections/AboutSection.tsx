const AboutSection: React.FC = () => {
    const stats = [
        {
            number: "10+",
            label: "Projects Delivered",
            description: "External client projects",
        },
        {
            number: "3",
            label: "Years Experience",
            description: "Professional development",
        },
        {
            number: "10+",
            label: "Cross-Functional Teams",
            description: "Across design, product & engineering",
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
                                I'm a fullstack web developer with{" "}
                                <span className="font-semibold text-gray-900">
                                    3 years
                                </span>{" "}
                                of experience, currently building internal
                                products at{" "}
                                <span className="font-semibold text-gray-900">
                                    BVR Group Asia
                                </span>{" "}
                                in{" "}
                                <span className="font-semibold text-gray-900">
                                    Bali
                                </span>
                                . I'm comfortable across the whole stack:
                                responsive, performance-minded interfaces in{" "}
                                <span className="font-semibold text-gray-900">
                                    Next.js
                                </span>{" "}
                                and{" "}
                                <span className="font-semibold text-gray-900">
                                    Svelte
                                </span>{" "}
                                with Tailwind (and GSAP when a design calls for
                                motion), backed by APIs and database schemas in{" "}
                                <span className="font-semibold text-gray-900">
                                    Laravel
                                </span>
                                ,{" "}
                                <span className="font-semibold text-gray-900">
                                    Go
                                </span>
                                , and{" "}
                                <span className="font-semibold text-gray-900">
                                    PostgreSQL
                                </span>
                                .
                            </p>
                            <p className="text-lg leading-relaxed text-gray-600">
                                I've shipped for a range of clients — government
                                platforms like{" "}
                                <span className="font-semibold text-gray-900">
                                    Biofarma
                                </span>{" "}
                                and{" "}
                                <span className="font-semibold text-gray-900">
                                    Kominfo
                                </span>
                                , a property management system, landing pages,
                                and an e-commerce app where I wired up{" "}
                                <span className="font-semibold text-gray-900">
                                    Xendit
                                </span>{" "}
                                payments and{" "}
                                <span className="font-semibold text-gray-900">
                                    Biteship
                                </span>{" "}
                                shipping end to end.
                            </p>
                            <p className="text-lg leading-relaxed text-gray-600">
                                Performance isn't an afterthought for me: lazy
                                loading, smaller bundles, and high PageSpeed
                                scores are part of how I build. I pick up new
                                codebases and tools quickly, and I like turning
                                a Figma file into something that loads fast and
                                holds up on every screen.
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
