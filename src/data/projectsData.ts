import type { Project } from "../types";

export const projectsData: Project[] = [
    {
        title: "SSPACE",
        description:
            "Built a responsive office-space landing page from a Figma design with Tailwind and GSAP-driven scroll animations.",
        tech: ["Tailwind CSS", "GSAP"],
        url: "sspace.id",
    },
    {
        title: "Biofarma CMS",
        description:
            "Built a scalable CMS interface in Next.js and TypeScript with modular UI components and complex form handling for a national pharmaceutical client.",
        tech: ["React.js", "Next.js", "TypeScript", "Tailwind CSS"],
        url: "biofarma.co.id",
    },
    {
        title: "BVR Appraisal",
        description:
            "Rewrote BVR Group Asia's property-appraisal platform from scratch — a Svelte frontend backed by a custom Laravel CMS for managing certified valuation services, content, and SEO for the Bali market.",
        tech: ["Laravel", "Svelte", "Tailwind CSS"],
        url: "appraisal.bvrgroupasia.com",
    },
    {
        title: "SDM Digital",
        description:
            "Built Laravel backend services with PostgreSQL query optimization, RESTful APIs, and automated job scheduling for a government competency-standards platform.",
        tech: ["PostgreSQL", "Laravel", "REST API"],
        url: "standar.sdmdigital.id",
    },
];
