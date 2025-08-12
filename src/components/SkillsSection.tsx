import SkillCard from "../components/SkillCard";
import type { SkillCategory } from "../types";

interface SkillsSectionProps {
    skillsData: SkillCategory[];
}

const SkillsSection: React.FC<SkillsSectionProps> = ({ skillsData }) => {
    return (
        <section className="py-20 bg-white">
            <div className="max-w-5xl mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
                        Skills & Technologies
                    </h2>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        A comprehensive toolkit I've mastered to build modern,
                        scalable web applications
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {skillsData.map((category, categoryIndex) => (
                        <SkillCard key={categoryIndex} category={category} />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default SkillsSection;
