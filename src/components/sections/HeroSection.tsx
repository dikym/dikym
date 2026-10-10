import Arrow from "../ui/Arrow.tsx";
import { Reveal, RevealLines } from "../ui/Reveal.tsx";

interface HeroSectionProps {
    onScrollToSection: (sectionId: string) => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onScrollToSection }) => {
    return (
        <section
            id="home"
            className="pt-[calc(var(--nav-h)+56px)] pb-(--sp) min-[961px]:pt-[calc(var(--nav-h)+120px)]"
        >
            <div className="wrap grid items-start gap-[30px] min-[961px]:grid-cols-[1.15fr_.85fr] min-[961px]:gap-[60px]">
                <RevealLines
                    as="h1"
                    lead="Fullstack web developer"
                    dim="based in Bali."
                    className="max-[961px]:text-[clamp(35px,9.5vw,45px)] max-[961px]:leading-[1.14] max-[961px]:tracking-[-0.032em]"
                />
                <Reveal className="flex w-full flex-col min-[961px]:ml-auto min-[961px]:pt-[18px] lg:max-w-[44ch]">
                    <p className="text-lead text-ink-2">
                        I build fast, accessible web apps end to end — frontends
                        in Next.js and Svelte, backed by APIs and databases in
                        Laravel and Go.
                    </p>
                    <div className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-3">
                        <button
                            onClick={() => onScrollToSection("projects")}
                            className="btn btn-amber justify-center"
                        >
                            View projects
                            <Arrow direction="sw" />
                        </button>
                        <button
                            onClick={() => onScrollToSection("contact")}
                            className="btn btn-ghost justify-center"
                        >
                            Get in touch
                            <Arrow direction="sw" />
                        </button>
                    </div>
                </Reveal>
            </div>
        </section>
    );
};

export default HeroSection;
