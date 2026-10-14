import SocialLinks from "../ui/SocialLinks.tsx";

interface FooterProps {
    onScrollToSection: (sectionId: string) => void;
}

const sitemap = [
    { id: "home", label: "Home" },
    { id: "about", label: "About" },
    { id: "skills", label: "Skills" },
    { id: "projects", label: "Projects" },
    { id: "contact", label: "Contact" },
];

const heading = "eyebrow mb-4 tracking-[0.18em] text-ink-3";

const Footer: React.FC<FooterProps> = ({ onScrollToSection }) => {
    return (
        <footer className="bg-page relative isolate pt-[70px] pb-11">
            {/* Inverse of the page: plain outside the sheet, ruled inside it.
                Starts 1px up so its top border shares a row with the last outside line. */}
            <div className="border-line bg-sheet pointer-events-none absolute -top-px right-(--rule-x) bottom-0 left-(--rule-x) -z-10 border-x border-t bg-(image:--ruling-down) bg-size-[100%_5px] bg-origin-border [image-rendering:pixelated]" />
            <div className="wrap">
                <div className="grid grid-cols-2 gap-[30px] lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:gap-10">
                    <div className="col-span-2 lg:col-span-1">
                        <h4 className={heading}>Contact</h4>
                        <a
                            href="mailto:hello@dikym.me"
                            className="text-ink text-[26px] font-medium tracking-[-0.02em]"
                        >
                            hello@dikym.me
                        </a>
                        <p className="text-ink-2 mt-3 text-[15px]">
                            Let's get in touch!
                        </p>
                    </div>
                    <div>
                        <h4 className={heading}>Sitemap</h4>
                        {sitemap.map(item => (
                            <button
                                key={item.id}
                                onClick={() => onScrollToSection(item.id)}
                                className="text-ink-2 hover:text-ink block cursor-pointer py-1 text-[15px] transition-colors duration-250"
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                    <div>
                        <h4 className={heading}>Elsewhere</h4>
                        <SocialLinks />
                    </div>
                    <div>
                        <h4 className={heading}>Based in</h4>
                        <p className="text-ink-2 py-1 text-[15px]">
                            Bali, Indonesia
                        </p>
                        <p className="text-ink-2 py-1 text-[15px]">
                            UTC+8 (WITA)
                        </p>
                    </div>
                </div>
                <div className="text-ink-3 mt-20 flex flex-wrap justify-between gap-3 text-[11px] tracking-[0.14em] uppercase">
                    <span>© 2026 Diky Maulidan — All rights reserved</span>
                </div>
            </div>
            {/* Amber corner marks closing the sheet */}
            <div className="pointer-events-none absolute right-(--rule-x) bottom-0 left-(--rule-x) h-5">
                <span className="border-amber absolute bottom-0 left-0 size-5 border-b-2 border-l-2" />
                <span className="border-amber absolute right-0 bottom-0 size-5 border-r-2 border-b-2" />
            </div>
        </footer>
    );
};

export default Footer;
