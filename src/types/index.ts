export interface Skill {
    name: string;
    logo: string;
}

export interface SkillCategory {
    category: string;
    skills: Skill[];
}

export interface Project {
    title: string;
    description: string;
    tech: string[];
    url?: string;
}

export interface NavigationItem {
    id: string;
    label: string;
}
