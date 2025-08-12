const ContactSection: React.FC = () => {
    return (
        <section
            id="contact"
            className="py-20 bg-gray-50"
            style={{ scrollMarginTop: "60px" }}
        >
            <div className="max-w-3xl mx-auto px-6 text-center">
                <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900">
                    Let's Work Together
                </h2>
                <p className="text-xl text-gray-600 mb-12 leading-relaxed">
                    Ready to bring your ideas to life? I'm available for new
                    projects and collaborations.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <a
                        href="mailto:890dikymaulidan@gmail.com"
                        className="bg-gray-900 text-white px-8 py-3 rounded-lg font-medium hover:bg-gray-800 transition-all duration-200 flex items-center gap-2 justify-center hover:shadow-lg hover:-translate-y-0.5"
                    >
                        <svg
                            className="w-4 h-4"
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
                        className="border border-gray-300 px-8 py-3 rounded-lg font-medium hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 flex items-center gap-2 justify-center hover:shadow-lg hover:-translate-y-0.5"
                    >
                        <svg
                            className="w-4 h-4"
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
