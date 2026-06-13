import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/Home";
import Profile from "./pages/Profile";

export default function App() {
    return (
        <BrowserRouter>
            <div className="min-h-screen text-white relative">
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/profile" element={<Profile />} />
                </Routes>
            </div>
        </BrowserRouter>
    );
}
