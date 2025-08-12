import React, { useState } from "react";
import Navigation from "./components/Navigation";
import HeroSection from "./components/HeroSection";
import AboutSection from "./components/AboutSection";
import SkillsSection from "./components/SkillsSection";
import ProjectsSection from "./components/ProjectsSection";
import ContactSection from "./components/ContactSection";
import Footer from "./components/Footer";
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
        <div className="min-h-screen bg-white text-gray-900 font-sans">
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
