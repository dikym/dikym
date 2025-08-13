const ContactSection: React.FC = () => {
    return (
        <section
            id="contact"
            className="bg-gray-50 py-20"
            style={{ scrollMarginTop: "60px" }}
        >
            <div className="mx-auto max-w-3xl px-6 text-center">
                <h2 className="mb-6 text-3xl font-bold text-gray-900 md:text-4xl">
                    Let's Work Together
                </h2>
                <p className="mb-12 text-xl leading-relaxed text-gray-600">
                    Ready to bring your ideas to life? I'm available for new
                    projects and collaborations.
                </p>
                <div className="flex flex-col justify-center gap-4 sm:flex-row">
                    <a
                        href="mailto:890dikymaulidan@gmail.com"
                        className="flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-8 py-3 font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-gray-800 hover:shadow-lg"
                    >
                        <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 8l7.89 7.89a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            />
                        </svg>
                        Send Message
                    </a>
                    <a
                        href="https://linkedin.com/in/dikym"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-8 py-3 font-medium transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-400 hover:bg-gray-50 hover:shadow-lg"
                    >
                        <svg
                            className="h-4 w-4"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                        </svg>
                        LinkedIn
                    </a>
                </div>
            </div>
        </section>
    );
};

export default ContactSection;
