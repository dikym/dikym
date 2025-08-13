import React, { useState } from "react";
import Navigation from "./components/layout/Navigation.tsx";
import HeroSection from "./components/sections/HeroSection.tsx";
import AboutSection from "./components/sections/AboutSection.tsx";
import SkillsSection from "./components/sections/SkillsSection.tsx";
import ProjectsSection from "./components/sections/ProjectsSection.tsx";
import ContactSection from "./components/common/ContactSection.tsx";
import Footer from "./components/layout/Footer.tsx";
import { useActiveSection } from "./hooks/useActiveSection";
import { useScrollToSection } from "./hooks/useScrollToSection";
import { skillsData } from "./data/skillsData";
import { projectsData } from "./data/projectsData";

const App: React.FC = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
    const activeSection = useActiveSection();
    const scrollToSection = useScrollToSection();

    const handleToggleMobileMenu = (): void => {
        setIsMobileMenuOpen(true);
    };

    const handleCloseMobileMenu = (): void => {
        setIsMobileMenuOpen(false);
    };

    const handleScrollToSection = (sectionId: string): void => {
        scrollToSection(sectionId);
        setIsMobileMenuOpen(false);
    };

    return (
        <div className="min-h-screen bg-white font-sans text-gray-900">
            <Navigation
                activeSection={activeSection}
                isMobileMenuOpen={isMobileMenuOpen}
                onScrollToSection={handleScrollToSection}
                onToggleMobileMenu={handleToggleMobileMenu}
                onCloseMobileMenu={handleCloseMobileMenu}
            />

            <HeroSection onScrollToSection={handleScrollToSection} />
            <AboutSection />
            <SkillsSection skillsData={skillsData} />
            <ProjectsSection projects={projectsData} />
            <ContactSection />
            <Footer />
        </div>
    );
};

export default App;
