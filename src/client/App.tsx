import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/Home";
import Profile from "./pages/Profile";
import Login from "./pages/Login";

export default function App() {
    return (
        <BrowserRouter>
            <div className="min-h-screen text-white relative">
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/login" element={<Login />} />
                </Routes>
            </div>
        </BrowserRouter>
    );
}
