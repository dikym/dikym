import type { SkillCategory } from "../types";

interface SkillCardProps {
    category: SkillCategory;
}

const SkillCard: React.FC<SkillCardProps> = ({ category }) => {
    return (
        <div className="h-full rounded-2xl border border-gray-100 bg-gray-50 p-8 transition-shadow duration-300">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-900 transition-transform duration-300">
                {category.icon}
            </div>

            <h3 className="mb-4 text-xl font-bold text-gray-900">
                {category.category}
            </h3>

            <div className="space-y-3">
                {category.skills.map((skill, skillIndex) => (
                    <div
                        key={skillIndex}
                        className="flex items-center gap-3 rounded-lg p-2 transition-all duration-200"
                    >
                        <div className="h-6 w-6 flex-shrink-0">
                            <img
                                src={skill.logo}
                                alt={`${skill.name} logo`}
                                className="h-full w-full object-contain"
                            />
                        </div>
                        <span className="font-medium text-gray-700 transition-colors">
                            {skill.name}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SkillCard;
