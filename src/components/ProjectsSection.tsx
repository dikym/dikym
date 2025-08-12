import type { Project } from "../types";
import ProjectCard from "../components/ProjectCard";

interface ProjectsSectionProps {
    projects: Project[];
}

const ProjectsSection: React.FC<ProjectsSectionProps> = ({ projects }) => {
    return (
        <section
            id="projects"
            className="py-20"
            style={{ scrollMarginTop: "60px" }}
        >
            <div className="mx-auto max-w-5xl px-6">
                <div className="mb-16">
                    <h2 className="mb-4 text-3xl font-bold text-gray-900 md:text-4xl">
                        Projects
                    </h2>
                    <p className="text-lg text-gray-600">
                        A selection of my recent work and contributions
                    </p>
                </div>
                <div className="grid gap-8 md:grid-cols-2">
                    {projects.map((project, index) => (
                        <ProjectCard key={index} project={project} />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default ProjectsSection;
