import { useState, useEffect } from "react";

const App = () => {
    const skillsData = [
        {
            category: "Frontend Development",
            icon: (
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="white"
                    className="size-6"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25"
                    />
                </svg>
            ),
            skills: [
                { name: "React", logo: "react.svg" },
                { name: "Next.js", logo: "nextjs.svg" },
                { name: "Node.js", logo: "nodejs.svg" },
                { name: "Angular", logo: "angular.svg" },
                { name: "TypeScript", logo: "typescript.svg" },
                { name: "Tailwind CSS", logo: "tailwindcss.svg" },
                { name: "GSAP", logo: "gsap.svg" },
                { name: "Alpine.js", logo: "alpinejs.svg" },
            ],
        },
        {
            category: "Backend Development",
            icon: (
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="white"
                    className="size-6"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"
                    />
                </svg>
            ),
            skills: [
                { name: "Laravel", logo: "laravel.svg" },
                { name: "PHP", logo: "php.svg" },
                { name: "MySQL", logo: "mysql.svg" },
                { name: "PostgreSQL", logo: "postgressql.svg" },
            ],
        },
        {
            category: "Tools & Integration",
            icon: (
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="white"
                    className="size-6"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z"
                    />
                </svg>
            ),
            skills: [
                { name: "Git", logo: "git.svg" },
                { name: "Postman", logo: "postman.svg" },
                { name: "OpenAPI", logo: "openapi.svg" },
                { name: "Xendit", logo: "xendit.svg" },
                { name: "Biteship", logo: "biteship.svg" },
                { name: "Linux", logo: "linux.svg" },
            ],
        },
    ];

    const [activeSection, setActiveSection] = useState("home");
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const scrollToSection = (sectionId: string) => {
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({
                behavior: "smooth",
                block: "start",
                inline: "nearest",
            });
        }
        setIsMobileMenuOpen(false); // Close mobile menu after navigation
    };

    useEffect(() => {
        const handleScroll = () => {
            const sections = ["home", "about", "projects", "contact"];
            const scrollPosition = window.scrollY + window.innerHeight / 2;

            // Loop dari section terakhir ke pertama untuk memastikan prioritas yang tepat
            for (let i = sections.length - 1; i >= 0; i--) {
                const section = sections[i];
                const element = document.getElementById(section);
                if (element) {
                    const { offsetTop } = element;
                    if (scrollPosition >= offsetTop) {
                        setActiveSection(section);
                        break;
                    }
                }
            }
        };

        window.addEventListener("scroll", handleScroll);
        handleScroll();

        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const projects = [
        {
            title: "SSPACE",
            description:
                "Translated Figma design into a fully responsive landing page using Tailwind, ensuring pixel-perfect implementation with smooth GSAP animations.",
            tech: ["Tailwind CSS", "GSAP"],
            url: "sspace.id",
        },
        {
            title: "Biofarma CMS",
            description:
                "Built a robust and scalable CMS interface using Next.js and TypeScript, with modular UI components and complex form handling.",
            tech: ["React.js", "Next.js", "TypeScript", "Tailwind CSS"],
            url: "biofarma.co.id",
        },
        {
            title: "Poktan360",
            description:
                "Developed complete web application using Angular and Laravel with role-based access control and high PageSpeed performance.",
            tech: ["Laravel", "MySQL", "Angular", "Tailwind CSS"],
            url: "poktan360.com",
        },
        {
            title: "SDM Digital",
            description:
                "Developed backend services using Laravel with PostgreSQL optimization, RESTful APIs, and automated job scheduling.",
            tech: ["PostgreSQL", "Laravel", "REST API"],
            url: "standar.sdmdigital.id",
        },
    ];

    return (
        <div className="min-h-screen bg-white text-gray-900 font-sans">
            {/* Enhanced Navigation */}
            <nav className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-md border-b border-gray-100 z-50 shadow-sm">
                <div className="max-w-5xl mx-auto px-6 py-4">
                    <div className="flex justify-between items-center">
                        <div className="text-xl font-bold text-gray-900 font-mono">
                            dikym
                        </div>
                        <div className="hidden md:flex space-x-8">
                            {[
                                { id: "home", label: "Home" },
                                { id: "about", label: "About" },
                                { id: "projects", label: "Projects" },
                                { id: "contact", label: "Contact" },
                            ].map(section => (
                                <button
                                    key={section.id}
                                    onClick={() => scrollToSection(section.id)}
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
                        <button
                            className="md:hidden hover:bg-gray-100 rounded-lg transition-colors duration-200"
                            onClick={() => setIsMobileMenuOpen(true)}
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
                {isMobileMenuOpen && (
                    <div className="fixed inset-0 bg-white z-50 md:hidden">
                        <div className="flex flex-col h-screen bg-white">
                            {/* Mobile Menu Header */}
                            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
                                <div className="text-xl font-bold text-gray-900 font-mono">
                                    dikym
                                </div>
                                <button
                                    onClick={() => setIsMobileMenuOpen(false)}
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
                                    {[
                                        { id: "home", label: "Home" },
                                        { id: "about", label: "About" },
                                        { id: "projects", label: "Projects" },
                                        { id: "contact", label: "Contact" },
                                    ].map(section => (
                                        <button
                                            key={section.id}
                                            onClick={() =>
                                                scrollToSection(section.id)
                                            }
                                            className="block w-full text-3xl font-bold transition-all duration-300 py-3 rounded-lg touch-manipulation"
                                        >
                                            {section.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="px-4 sm:px-6 py-8 border-t border-gray-100">
                                <div className="flex justify-center gap-8">
                                    <a
                                        href="https://linkedin.com/in/dikym"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-gray-400 hover:text-gray-600 transition-colors duration-200 p-2 hover:bg-gray-100 rounded-lg touch-manipulation"
                                        aria-label="LinkedIn"
                                    >
                                        <svg
                                            className="w-6 h-6"
                                            fill="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                        </svg>
                                    </a>
                                    <a
                                        href="https://github.com/dikym"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-gray-400 hover:text-gray-600 transition-colors duration-200 p-2 hover:bg-gray-100 rounded-lg touch-manipulation"
                                        aria-label="GitHub"
                                    >
                                        <svg
                                            className="w-6 h-6"
                                            fill="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    </a>
                                    <a
                                        href="mailto:890dikymaulidan@gmail.com"
                                        className="text-gray-400 hover:text-gray-600 transition-colors duration-200 p-2 hover:bg-gray-100 rounded-lg touch-manipulation"
                                        aria-label="Email"
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
                                                d="M3 8l7.89 7.89a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                            />
                                        </svg>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </nav>
            <section
                id="home"
                className="pt-32 pb-20"
                style={{ scrollMarginTop: "60px" }}
            >
                <div className="max-w-5xl mx-auto px-6">
                    <div className="max-w-4xl">
                        <div className="mb-8">
                            <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6 text-gray-900">
                                Building fast, impactful web experiences across
                                the full stack.
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
                                onClick={() => scrollToSection("projects")}
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
                                onClick={() => scrollToSection("contact")}
                                className="border border-gray-300 px-8 py-3 rounded-lg font-medium hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
                            >
                                Get In Touch
                            </button>
                        </div>
                    </div>
                </div>
            </section>
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
                                    high-quality outcomes that exceed
                                    expectations.
                                </p>
                                <p className="text-lg text-gray-600 leading-relaxed">
                                    Whether working independently or
                                    collaborating with cross-functional teams, I
                                    thrive on turning complex challenges into
                                    elegant, performant solutions that users
                                    love.
                                </p>
                            </div>
                        </div>
                        <div className="relative">
                            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
                                <div className="space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                                            <span className="text-gray-600 font-bold text-lg">
                                                5+
                                            </span>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-900">
                                                Projects Delivered
                                            </h4>
                                            <p className="text-sm text-gray-600">
                                                External client projects
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                                            <span className="text-gray-600 font-bold text-lg">
                                                2+
                                            </span>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-900">
                                                Years Experience
                                            </h4>
                                            <p className="text-sm text-gray-600">
                                                Professional development
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                                            <span className="text-gray-600 font-bold text-lg">
                                                10+
                                            </span>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-900">
                                                Different Teams
                                            </h4>
                                            <p className="text-sm text-gray-600">
                                                Cross-functional collaboration
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            <section className="py-20 bg-white">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
                            Skills & Technologies
                        </h2>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                            A comprehensive toolkit I've mastered to build
                            modern, scalable web applications
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {skillsData.map((category, categoryIndex) => (
                            <div key={categoryIndex}>
                                <div className="bg-gray-50 rounded-2xl p-8 h-full border border-gray-100 transition-shadow duration-300">
                                    <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center mb-6 transition-transform duration-300">
                                        {category.icon}
                                    </div>

                                    <h3 className="text-xl font-bold text-gray-900 mb-4">
                                        {category.category}
                                    </h3>

                                    <div className="space-y-3">
                                        {category.skills.map(
                                            (skill, skillIndex) => (
                                                <div
                                                    key={skillIndex}
                                                    className="flex items-center gap-3 rounded-lg p-2 transition-all duration-200"
                                                >
                                                    <div className="w-6 h-6 flex-shrink-0">
                                                        <img
                                                            src={skill.logo}
                                                            alt={`${skill.name} logo`}
                                                            className="w-full h-full object-contain"
                                                        />
                                                        <div
                                                            className="w-2 h-2 bg-gray-900 rounded-full hidden"
                                                            style={{
                                                                display: "none",
                                                            }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-gray-700 font-medium transition-colors">
                                                        {skill.name}
                                                    </span>
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
            <section
                id="projects"
                className="py-20"
                style={{ scrollMarginTop: "60px" }}
            >
                <div className="max-w-5xl mx-auto px-6">
                    <div className="mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
                            Projects
                        </h2>
                        <p className="text-lg text-gray-600">
                            A selection of my recent work and contributions
                        </p>
                    </div>
                    <div className="grid gap-8 md:grid-cols-2">
                        {projects.map((project, index) => (
                            <div
                                key={index}
                                className="group relative bg-white border border-gray-200 rounded-2xl p-8 hover:border-gray-300 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                            >
                                {/* Project Header */}
                                <div className="flex items-start justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900 mb-1">
                                                {project.title}
                                            </h3>
                                        </div>
                                    </div>
                                    <a
                                        href={`https://${project.url}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-2 hover:bg-gray-100 rounded-lg"
                                    >
                                        <svg
                                            className="w-5 h-5 text-gray-600"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                            />
                                        </svg>
                                    </a>
                                </div>
                                <p className="text-gray-600 leading-relaxed mb-6">
                                    {project.description}
                                </p>
                                <div className="flex flex-wrap gap-2 mb-6">
                                    {project.tech.map((tech, techIndex) => (
                                        <span
                                            key={techIndex}
                                            className="text-xs font-medium text-gray-600 bg-gray-100 px-3 py-2 rounded-full border transition-colors duration-200"
                                        >
                                            {tech}
                                        </span>
                                    ))}
                                </div>
                                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                    <span className="text-sm text-gray-500">
                                        {project.url}
                                    </span>
                                    <a
                                        href={`https://${project.url}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-sm font-medium text-gray-900 hover:text-gray-600 transition-colors duration-200 group/link"
                                    >
                                        View Live
                                        <svg
                                            className="w-4 h-4 group-hover/link:translate-x-1 transition-transform duration-200"
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
                                    </a>
                                </div>
                                <div
                                    className={`absolute inset-0 bg-gray-400 opacity-0 group-hover:opacity-5 transition-opacity duration-300 rounded-2xl pointer-events-none`}
                                ></div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
            <section
                id="contact"
                className="py-20 bg-gray-50"
                style={{ scrollMarginTop: "60px" }}
            >
                <div className="max-w-3xl mx-auto px-6 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900">
                        Let's Work Together
                    </h2>
                    <p className="text-xl text-gray-600 mb-12 leading-relaxed">
                        Ready to bring your ideas to life? I'm available for new
                        projects and collaborations.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <a
                            href="mailto:890dikymaulidan@gmail.com"
                            className="bg-gray-900 text-white px-8 py-3 rounded-lg font-medium hover:bg-gray-800 transition-all duration-200 flex items-center gap-2 justify-center hover:shadow-lg hover:-translate-y-0.5"
                        >
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
                                    d="M3 8l7.89 7.89a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                />
                            </svg>
                            Send Message
                        </a>
                        <a
                            href="https://linkedin.com/in/dikym"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="border border-gray-300 px-8 py-3 rounded-lg font-medium hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 flex items-center gap-2 justify-center hover:shadow-lg hover:-translate-y-0.5"
                        >
                            <svg
                                className="w-4 h-4"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                            </svg>
                            LinkedIn
                        </a>
                    </div>
                </div>
            </section>
            <footer className="py-8 border-t border-gray-200">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="flex flex-col md:flex-row items-center justify-between">
                        <p className="text-gray-500 text-sm mb-4 md:mb-0">
                            © 2025 Diky Maulidan. All rights reserved.
                        </p>
                        <div className="flex items-center gap-4">
                            <a
                                href="https://linkedin.com/in/dikym"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-400 hover:text-gray-600 transition-colors duration-200 hover:-translate-y-0.5"
                            >
                                <svg
                                    className="w-4 h-4"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                </svg>
                            </a>
                            <a
                                href="https://github.com/dikym"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-400 hover:text-gray-600 transition-colors duration-200 hover:-translate-y-0.5"
                            >
                                <svg
                                    className="w-5 h-5"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </a>
                            <a
                                href="mailto:890dikymaulidan@gmail.com"
                                className="text-gray-400 hover:text-gray-600 transition-colors duration-200 hover:-translate-y-0.5"
                            >
                                <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M3 8l7.89 7.89a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                    />
                                </svg>
                            </a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default App;
