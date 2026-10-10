import React, { useCallback, useEffect, useRef, useState } from "react";
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
    const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
    const activeSection = useActiveSection();
    const scrollToSection = useScrollToSection();
    usePreserveScrollPosition();

    const closeMobileMenu = useCallback((): void => {
        if (
            document
                .getElementById("mobile-menu")
                ?.contains(document.activeElement)
        ) {
            const button = mobileMenuButtonRef.current;
            const focusTarget = button?.getClientRects().length
                ? button
                : button
                      ?.closest("nav")
                      ?.querySelector<HTMLButtonElement>("button");
            focusTarget?.focus({ preventScroll: true });
        }
        setIsMobileMenuOpen(false);
    }, []);

    // While the menu is open, the page behind can't scroll.
    useEffect(() => {
        if (!isMobileMenuOpen) return;
        const onKey = (e: KeyboardEvent) =>
            e.key === "Escape" && closeMobileMenu();
        const desktop = window.matchMedia("(min-width: 961px)");
        const onDesktop = (): void => {
            if (!desktop.matches) return;
            closeMobileMenu();
            if (document.activeElement === document.body) {
                mobileMenuButtonRef.current
                    ?.closest("nav")
                    ?.querySelector<HTMLButtonElement>("button")
                    ?.focus({ preventScroll: true });
            }
        };
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", onKey);
        desktop.addEventListener("change", onDesktop);
        onDesktop();
        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener("keydown", onKey);
            desktop.removeEventListener("change", onDesktop);
        };
    }, [isMobileMenuOpen, closeMobileMenu]);

    const handleToggleMobileMenu = (): void => {
        if (isMobileMenuOpen) closeMobileMenu();
        else setIsMobileMenuOpen(true);
    };

    const handleScrollToSection = (sectionId: string): void => {
        scrollToSection(sectionId);
        closeMobileMenu();
    };

    return (
        <div className="min-h-screen">
            <Curtain />
            <Navigation
                activeSection={activeSection}
                isMobileMenuOpen={isMobileMenuOpen}
                mobileMenuButtonRef={mobileMenuButtonRef}
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
