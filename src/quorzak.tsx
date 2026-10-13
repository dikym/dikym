import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Quorzak from "./components/arcade/Quorzak.tsx";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <main className="arcade-page">
            <Quorzak />
        </main>
    </StrictMode>
);
