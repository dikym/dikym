import Arrow from "../ui/Arrow.tsx";
import { Reveal } from "../ui/Reveal.tsx";
import SectionHead from "../ui/SectionHead.tsx";

const ContactSection: React.FC = () => {
    return (
        <section id="contact" className="sec" data-badge="Contact">
            <div className="wrap">
                <SectionHead
                    lead="Let's work together."
                    dim="Tell me about your project."
                    sub="Ready to bring your ideas to life? I'm available for new projects and collaborations."
                />
                <Reveal className="flex flex-col gap-2.5 sm:flex-row sm:gap-3">
                    <a
                        href="mailto:hello@dikym.me"
                        className="btn btn-amber justify-center"
                    >
                        Send message
                        <Arrow />
                    </a>
                    <a
                        href="https://linkedin.com/in/dikym"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-ghost justify-center"
                    >
                        LinkedIn
                        <Arrow />
                    </a>
                </Reveal>
            </div>
        </section>
    );
};

export default ContactSection;
