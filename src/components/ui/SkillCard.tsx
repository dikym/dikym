import type { SkillCategory } from "../../types";
import { useScrollScrub } from "../../hooks/useScrollScrub";

interface SkillCardProps {
    category: SkillCategory;
}

const SkillCard: React.FC<SkillCardProps> = ({ category }) => {
    const gridRef = useScrollScrub<HTMLDivElement>();

    return (
        <div>
            <h3 className="border-line mb-6 flex items-center gap-3 border-b pb-3.5">
                <span className="text-ink text-[clamp(19px,1.7vw,24px)] font-medium tracking-[-0.015em]">
                    {category.category}
                </span>
                <span className="eyebrow text-ink-3 ml-auto">
                    {category.skills.length} tools
                </span>
            </h3>
            <div
                ref={gridRef}
                className="grid grid-cols-4 gap-x-[7px] gap-y-[26px] sm:grid-cols-5 sm:gap-2 md:grid-cols-6 lg:grid-cols-10 lg:gap-[clamp(8px,.9vw,14px)]"
            >
                {category.skills.map(skill => (
                    <div
                        key={skill.name}
                        className="group mx-auto w-full max-w-[132px] text-center"
                    >
                        <div className="border-line bg-tile group-hover:border-amber group-hover:bg-paper-2 @container grid aspect-square place-items-center border transition-[background,border-color] duration-250">
                            <img
                                src={`icons/${skill.logo}`}
                                alt={`${skill.name} logo`}
                                className={`h-[48cqw] w-auto max-w-[80cqw] object-contain scheme-light dark:scheme-dark ${
                                    [
                                        "nextjs.svg",
                                        "prisma.svg",
                                        "vercel.svg",
                                        "openai.svg",
                                    ].includes(skill.logo)
                                        ? "dark:hue-rotate-180 dark:invert"
                                        : ""
                                }`}
                            />
                        </div>
                        <span className="text-micro text-ink-2 mt-[7px] block tracking-[0.12em] uppercase sm:mt-3.5">
                            {skill.name}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SkillCard;
