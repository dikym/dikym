import { useState } from "react";
import type { Project } from "../../types";
import ProjectCard from "../ui/ProjectCard.tsx";
import { Reveal } from "../ui/Reveal.tsx";
import SectionHead from "../ui/SectionHead.tsx";

interface ProjectsSectionProps {
    projects: Project[];
}

const slug = (title: string): string =>
    title.toLowerCase().replace(/\s+/g, "-");

// Console-style viewer: project list on the left, dot-grid canvas on the right.
const ProjectsSection: React.FC<ProjectsSectionProps> = ({ projects }) => {
    const [selected, setSelected] = useState(0);
    const [opened, setOpened] = useState<Set<number>>(() => new Set([0]));
    const current = projects[selected];

    const select = (index: number): void => {
        setSelected(index);
        setOpened(prev => new Set(prev).add(index));
    };

    return (
        <section id="projects" className="sec" data-badge="Work">
            <div className="wrap">
                <SectionHead
                    lead="Built for clients,"
                    dim="and running."
                    sub="A selection of my recent work and contributions."
                />

                <Reveal className="border-line bg-paper-2 border">
                    <div className="border-amber-2 bg-amber flex h-10 items-center gap-4 border-b px-3.5 text-[#16140e]">
                        <span className="flex gap-[3px]" aria-hidden="true">
                            <i className="size-2 bg-[#16140e]" />
                            <i className="size-2 bg-[#16140e61]" />
                            <i className="size-2 bg-[#16140e61]" />
                        </span>
                        <span className="eyebrow truncate font-medium">
                            portfolio / work / {slug(current.title)}
                        </span>
                        <span className="eyebrow ml-auto flex items-center gap-2 font-medium">
                            <i className="size-[7px] bg-[#16140ebd]" />
                            Ready
                        </span>
                    </div>

                    <div className="grid min-[961px]:grid-cols-[minmax(180px,210px)_1fr]">
                        <aside className="border-line bg-paper flex overflow-x-auto border-b max-[961px]:[scrollbar-width:none] min-[961px]:flex-col min-[961px]:border-r min-[961px]:border-b-0 max-[961px]:[&::-webkit-scrollbar]:hidden">
                            <div className="eyebrow border-line-2 text-ink-3 hidden border-b px-4 pt-4 pb-3 tracking-[0.18em] min-[961px]:block">
                                Projects
                            </div>
                            {projects.map((project, i) => (
                                <button
                                    key={project.title}
                                    onClick={() => select(i)}
                                    aria-pressed={i === selected}
                                    className={`border-line-2 hover:bg-tile grid cursor-pointer grid-cols-[auto_1fr] items-center gap-x-2.5 border-r px-4 py-[11px] text-left whitespace-nowrap transition-colors duration-200 min-[961px]:border-r-0 min-[961px]:border-b ${
                                        i === selected
                                            ? "bg-tile shadow-[inset_2px_0_0_var(--ink)]"
                                            : ""
                                    }`}
                                >
                                    <i
                                        className={`size-1.5 ${opened.has(i) ? "bg-ink-2" : "bg-line"}`}
                                    />
                                    <span className="text-[15px] font-medium">
                                        {project.title}
                                    </span>
                                    <span className="eyebrow text-ink-3 col-start-2 mt-0.5">
                                        {project.url ? "Live" : "Private"} ·{" "}
                                        {project.tech[0]}
                                    </span>
                                </button>
                            ))}
                            <div className="eyebrow border-line-2 text-ink-3 mt-auto hidden border-t p-4 tracking-[0.14em] min-[961px]:block">
                                {opened.size} / {projects.length} opened
                                <span className="bg-line mt-2.5 block h-0.5">
                                    <i
                                        className="bg-ink-2 ease-sv block h-full transition-[width] duration-500"
                                        style={{
                                            width: `${(opened.size / projects.length) * 100}%`,
                                        }}
                                    />
                                </span>
                            </div>
                        </aside>

                        <div className="dot-grid bg-page relative flex min-h-[430px] flex-col px-[22px] pt-[18px] pb-4">
                            <ProjectCard
                                key={selected}
                                project={current}
                                index={selected}
                            />
                        </div>
                    </div>

                    <div className="eyebrow border-line bg-tile text-ink-3 flex flex-wrap justify-between gap-[18px] border-t px-4 py-3 tracking-[0.14em]">
                        <span>{projects.length} client projects</span>
                        <span>Select a project to see the details</span>
                    </div>
                </Reveal>
            </div>
        </section>
    );
};

export default ProjectsSection;
