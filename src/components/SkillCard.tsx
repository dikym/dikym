import type { SkillCategory } from "../types";

interface SkillCardProps {
    category: SkillCategory;
}

const SkillCard: React.FC<SkillCardProps> = ({ category }) => {
    return (
        <div className="bg-gray-50 rounded-2xl p-8 h-full border border-gray-100 transition-shadow duration-300">
            <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center mb-6 transition-transform duration-300">
                {category.icon}
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-4">
                {category.category}
            </h3>

            <div className="space-y-3">
                {category.skills.map((skill, skillIndex) => (
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
                        </div>
                        <span className="text-gray-700 font-medium transition-colors">
                            {skill.name}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SkillCard;
