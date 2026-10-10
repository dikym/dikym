export const useScrollToSection = () => {
    return (sectionId: string) => {
        const element = document.getElementById(sectionId);
        if (element) {
            const navbarBottom =
                document.querySelector("header > nav")?.getBoundingClientRect()
                    .bottom ?? 0;
            const sectionTop =
                window.scrollY + element.getBoundingClientRect().top;
            const roundedTop = Math.round(sectionTop);
            // Align the rule itself so fractional section heights do not change its pixels.
            element.style.setProperty(
                "--section-rule-offset",
                `${roundedTop - sectionTop}px`
            );
            window.scrollTo({
                top: roundedTop - Math.round(navbarBottom),
                behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
                    .matches
                    ? "instant"
                    : "smooth",
            });
        }
    };
};
