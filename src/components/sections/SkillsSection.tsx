import SkillCard from "../ui/SkillCard.tsx";
import type { SkillCategory } from "../../types";

interface SkillsSectionProps {
    skillsData: SkillCategory[];
}

const SkillsSection: React.FC<SkillsSectionProps> = ({ skillsData }) => {
    return (
        <section className="bg-white py-20">
            <div className="mx-auto max-w-5xl px-6">
                <div className="mb-16 text-center">
                    <h2 className="mb-4 text-3xl font-bold text-gray-900 md:text-4xl">
                        Skills & Technologies
                    </h2>
                    <p className="mx-auto max-w-2xl text-lg text-gray-600">
                        A comprehensive toolkit I've mastered to build modern,
                        scalable web applications
                    </p>
                </div>

                <div className="grid gap-8 md:grid-cols-3">
                    {skillsData.map((category, categoryIndex) => (
                        <SkillCard key={categoryIndex} category={category} />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default SkillsSection;
