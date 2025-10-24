import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "dc/dist/style/dc.css";

createRoot(document.getElementById("root")!).render(<App />);
