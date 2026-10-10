import type { SkillCategory } from "../types";

export const skillsData: SkillCategory[] = [
    {
        category: "Frontend Development",
        skills: [
            { name: "React", logo: "react.svg" },
            { name: "Next.js", logo: "nextjs.svg" },
            { name: "Svelte", logo: "svelte.svg" },
            { name: "Node.js", logo: "nodejs.svg" },
            { name: "Angular", logo: "angular.svg" },
            { name: "TypeScript", logo: "typescript.svg" },
            { name: "Tailwind CSS", logo: "tailwindcss.svg" },
            { name: "GSAP", logo: "gsap.svg" },
            { name: "Alpine.js", logo: "alpinejs.svg" },
        ],
    },
    {
        category: "Backend Development",
        skills: [
            { name: "Go", logo: "go.svg" },
            { name: "Go Fiber", logo: "go-fiber.svg" },
            { name: "GORM", logo: "gorm.svg" },
            { name: "PHP", logo: "php.svg" },
            { name: "Laravel", logo: "laravel.svg" },
            { name: "Prisma", logo: "prisma.svg" },
            { name: "MySQL", logo: "mysql.svg" },
            { name: "PostgreSQL", logo: "postgressql.svg" },
            { name: "Supabase", logo: "supabase.svg" },
        ],
    },
    {
        category: "Tools & Integration",
        skills: [
            { name: "Git", logo: "git.svg" },
            { name: "Apidog", logo: "apidog.svg" },
            { name: "Postman", logo: "postman.svg" },
            { name: "OpenAPI", logo: "openapi.svg" },
            { name: "Xendit", logo: "xendit.svg" },
            { name: "Biteship", logo: "biteship.svg" },
            { name: "Linux", logo: "linux.svg" },
            { name: "Vercel", logo: "vercel.svg" },
            { name: "Claude", logo: "claude.svg" },
            { name: "OpenAI", logo: "openai.svg" },
        ],
    },
];
