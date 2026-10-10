import { Reveal } from "../ui/Reveal.tsx";
import SectionHead from "../ui/SectionHead.tsx";

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

const Strong: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <span className="text-ink font-medium">{children}</span>
);

const AboutSection: React.FC = () => {
    return (
        <section id="about" className="sec" data-badge="About">
            <div className="wrap">
                <SectionHead lead="Across the stack," dim="end to end." />

                <div className="grid gap-12 lg:grid-cols-[1.25fr_1fr] lg:gap-[clamp(40px,6vw,90px)]">
                    <Reveal className="text-ink-2 space-y-5 leading-[1.62] lg:max-w-[62ch]">
                        <p>
                            I'm a fullstack web developer with{" "}
                            <Strong>3 years</Strong> of experience, currently
                            building internal products at{" "}
                            <Strong>BVR Group Asia</Strong> in{" "}
                            <Strong>Bali</Strong>. I'm comfortable across the
                            whole stack: responsive, performance-minded
                            interfaces in <Strong>Next.js</Strong> and{" "}
                            <Strong>Svelte</Strong> with Tailwind (and GSAP when
                            a design calls for motion), backed by APIs and
                            database schemas in <Strong>Laravel</Strong>,{" "}
                            <Strong>Go</Strong>, and <Strong>PostgreSQL</Strong>
                            .
                        </p>
                        <p>
                            I've shipped for a range of clients — government
                            platforms like <Strong>Biofarma</Strong> and{" "}
                            <Strong>Kominfo</Strong>, a property management
                            system, landing pages, and an e-commerce app where I
                            wired up <Strong>Xendit</Strong> payments and{" "}
                            <Strong>Biteship</Strong> shipping end to end.
                        </p>
                        <p>
                            Performance isn't an afterthought for me: lazy
                            loading, smaller bundles, and high PageSpeed scores
                            are part of how I build. I pick up new codebases and
                            tools quickly, and I like turning a Figma file into
                            something that loads fast and holds up on every
                            screen.
                        </p>
                    </Reveal>

                    <Reveal variant="stagger" className="self-start">
                        {stats.map((stat, i) => (
                            <div
                                key={stat.label}
                                style={{ "--i": i } as React.CSSProperties}
                                className="border-line-2 grid grid-cols-[88px_1fr] items-center gap-4 py-[clamp(20px,2.6vh,30px)] not-last:border-b"
                            >
                                <span className="text-[clamp(32px,3vw,44px)] leading-none font-medium tracking-[-0.03em]">
                                    {stat.number}
                                </span>
                                <div>
                                    <h3 className="eyebrow text-ink-3">
                                        {stat.label}
                                    </h3>
                                    <p className="text-ink-2 mt-1.5 text-[15px]">
                                        {stat.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </Reveal>
                </div>
            </div>
        </section>
    );
};

export default AboutSection;
