import Arrow from "./Arrow.tsx";

const links = [
    { label: "LinkedIn", href: "https://linkedin.com/in/dikym" },
    { label: "GitHub", href: "https://github.com/dikym" },
];

const SocialLinks: React.FC = () => (
    <>
        {links.map(link => (
            <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ink-2 hover:text-ink flex items-center gap-1 py-1 text-[15px] transition-colors duration-250 [&>.ar]:size-3.5"
            >
                {link.label}
                <Arrow />
            </a>
        ))}
    </>
);

export default SocialLinks;
