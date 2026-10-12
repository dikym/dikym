import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import SpaceInvaders from "./components/arcade/SpaceInvaders.tsx";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <main className="arcade-page">
            <SpaceInvaders />
        </main>
    </StrictMode>
);
