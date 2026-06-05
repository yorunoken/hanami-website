import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/Home";
import VerifyPage from "./pages/VerifyPage";

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/verify" element={<VerifyPage />} />
            </Routes>
        </BrowserRouter>
    );
}
