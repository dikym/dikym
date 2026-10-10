import React, { useEffect, useState } from "react";
import ArcadeSection from "./components/sections/ArcadeSection.tsx";
import Navigation from "./components/layout/Navigation.tsx";
import HeroSection from "./components/sections/HeroSection.tsx";
import AboutSection from "./components/sections/AboutSection.tsx";
import SkillsSection from "./components/sections/SkillsSection.tsx";
import ProjectsSection from "./components/sections/ProjectsSection.tsx";
import ContactSection from "./components/sections/ContactSection.tsx";
import Footer from "./components/layout/Footer.tsx";
import Curtain from "./components/layout/Curtain.tsx";
import { useActiveSection } from "./hooks/useActiveSection";
import { useScrollToSection } from "./hooks/useScrollToSection";
import { usePreserveScrollPosition } from "./hooks/usePreserveScrollPosition";
import { skillsData } from "./data/skillsData";
import { projectsData } from "./data/projectsData";

const App: React.FC = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
    const activeSection = useActiveSection();
    const scrollToSection = useScrollToSection();
    usePreserveScrollPosition();

    // While the menu is open: Escape closes it and the page behind can't scroll.
    useEffect(() => {
        if (!isMobileMenuOpen) return;
        const onKey = (e: KeyboardEvent) =>
            e.key === "Escape" && setIsMobileMenuOpen(false);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener("keydown", onKey);
        };
    }, [isMobileMenuOpen]);

    const handleToggleMobileMenu = (): void => {
        setIsMobileMenuOpen(open => !open);
    };

    const handleScrollToSection = (sectionId: string): void => {
        scrollToSection(sectionId);
        setIsMobileMenuOpen(false);
    };

    return (
        <div className="min-h-screen">
            <Curtain />
            <Navigation
                activeSection={activeSection}
                isMobileMenuOpen={isMobileMenuOpen}
                onScrollToSection={handleScrollToSection}
                onToggleMobileMenu={handleToggleMobileMenu}
            />
            <main>
                <HeroSection onScrollToSection={handleScrollToSection} />
                <AboutSection />
                <SkillsSection skillsData={skillsData} />
                <ProjectsSection projects={projectsData} />
                <ContactSection />
                <ArcadeSection />
            </main>
            <Footer onScrollToSection={handleScrollToSection} />
        </div>
    );
};

export default App;
