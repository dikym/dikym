import SkillCard from "../ui/SkillCard.tsx";
import SectionHead from "../ui/SectionHead.tsx";
import type { SkillCategory } from "../../types";

interface SkillsSectionProps {
    skillsData: SkillCategory[];
}

const SkillsSection: React.FC<SkillsSectionProps> = ({ skillsData }) => {
    return (
        <section id="skills" className="sec" data-badge="Stack">
            <div className="wrap">
                <SectionHead
                    lead="The stack,"
                    dim="and what each is for."
                    sub="The tools I use to build modern, scalable web applications, from interface to database."
                />
                <div className="space-y-14">
                    {skillsData.map(category => (
                        <SkillCard
                            key={category.category}
                            category={category}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default SkillsSection;
