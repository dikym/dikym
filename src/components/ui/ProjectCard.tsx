import type { Project } from "../../types";

interface ProjectCardProps {
    project: Project;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
    return (
        <div className="group relative rounded-2xl border border-gray-200 bg-white p-8 transition-all duration-300 hover:-translate-y-1 hover:border-gray-300 hover:shadow-xl">
            <div className="mb-6 flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div>
                        <h3 className="mb-1 text-xl font-bold text-gray-900">
                            {project.title}
                        </h3>
                    </div>
                </div>
                <a
                    href={`https://${project.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg p-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100 hover:bg-gray-100"
                >
                    <svg
                        className="h-5 w-5 text-gray-600"
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

            <p className="mb-6 leading-relaxed text-gray-600">
                {project.description}
            </p>

            <div className="mb-6 flex flex-wrap gap-2">
                {project.tech.map((tech, techIndex) => (
                    <span
                        key={techIndex}
                        className="rounded-full border bg-gray-100 px-3 py-2 text-xs font-medium text-gray-600 transition-colors duration-200"
                    >
                        {tech}
                    </span>
                ))}
            </div>

            <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                <span className="text-sm text-gray-500">{project.url}</span>
                <a
                    href={`https://${project.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/link inline-flex items-center gap-2 text-sm font-medium text-gray-900 transition-colors duration-200 hover:text-gray-600"
                >
                    View Live
                    <svg
                        className="h-4 w-4 transition-transform duration-200 group-hover/link:translate-x-1"
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

            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gray-400 opacity-0 transition-opacity duration-300 group-hover:opacity-5"></div>
        </div>
    );
};

export default ProjectCard;
