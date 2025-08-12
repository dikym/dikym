import type { Project } from "../types";

interface ProjectCardProps {
    project: Project;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
    return (
        <div className="group relative bg-white border border-gray-200 rounded-2xl p-8 hover:border-gray-300 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
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
                <span className="text-sm text-gray-500">{project.url}</span>
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

            <div className="absolute inset-0 bg-gray-400 opacity-0 group-hover:opacity-5 transition-opacity duration-300 rounded-2xl pointer-events-none"></div>
        </div>
    );
};

export default ProjectCard;
