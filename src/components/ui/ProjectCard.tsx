import type { Project } from "../../types";
import Arrow from "./Arrow.tsx";

interface ProjectCardProps {
    project: Project;
    index: number;
}

// Canvas body of the project console; re-keyed per project so it pops in.
const ProjectCard: React.FC<ProjectCardProps> = ({ project, index }) => {
    const href = project.url ? `https://${project.url}` : undefined;

    return (
        <div className="animate-pop relative flex flex-1 flex-col">
            <div className="eyebrow text-ink-3 flex justify-between">
                <span>
                    {String(index + 1).padStart(2, "0")} · {project.title}
                </span>
                <span>{href ? "Live" : "Private"}</span>
            </div>

            <div className="mt-[clamp(28px,5vh,48px)] grid gap-8 min-[961px]:px-[clamp(0px,2vw,18px)] lg:grid-cols-[1.4fr_1fr] lg:gap-16">
                <div>
                    <span className="eyebrow text-ink-3">Purpose</span>
                    <p className="mt-2.5 max-w-[46ch] text-[clamp(17px,1.4vw,21px)] leading-[1.45] tracking-[-0.01em] md:max-w-none lg:max-w-[46ch]">
                        {project.description}
                    </p>
                </div>
                <div>
                    <span className="eyebrow text-ink-3">Stack</span>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {project.tech.map(tech => (
                            <span
                                key={tech}
                                className="border-line bg-paper text-ink-2 border px-2.5 py-1.5 text-[11.5px] tracking-[0.04em]"
                            >
                                {tech}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            <div className="border-line mt-auto flex flex-wrap items-center justify-between gap-3 border-t pt-4 min-[961px]:mx-[clamp(0px,2vw,18px)]">
                {href ? (
                    <>
                        <span className="eyebrow text-ink-3">
                            {project.url}
                        </span>
                        <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-ghost bg-paper px-4 py-2"
                        >
                            View live
                            <Arrow />
                        </a>
                    </>
                ) : (
                    <span className="eyebrow text-ink-3">
                        Client project · site no longer public
                    </span>
                )}
            </div>
        </div>
    );
};

export default ProjectCard;
