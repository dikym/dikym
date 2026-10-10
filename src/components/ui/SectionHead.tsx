import { Reveal, RevealLines } from "./Reveal.tsx";

interface SectionHeadProps {
    lead: string;
    dim: string;
    sub?: string;
}

const SectionHead: React.FC<SectionHeadProps> = ({ lead, dim, sub }) => (
    <div className="mb-(--sp-head)">
        <RevealLines lead={lead} dim={dim} />
        {sub && (
            <Reveal className="text-ink-2 mt-[22px] max-w-[54ch] text-lg md:max-w-none lg:max-w-[54ch]">
                <p>{sub}</p>
            </Reveal>
        )}
    </div>
);

export default SectionHead;
