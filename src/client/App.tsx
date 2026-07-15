import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AuthenticatedRoute from "@/components/account/authenticated-route";
import CookiePolicy from "@/components/legal/cookie-policy";
import DataDeletion from "@/components/legal/data-deletion";
import LegalIndex from "@/components/legal/legal-index";
import PrivacyPolicy from "@/components/legal/privacy-policy";
import TermsOfService from "@/components/legal/tos";
import SiteMeta from "@/components/site-meta";
import AccountPrivacyPage from "./pages/AccountPrivacy";
import BotPage from "./pages/Bot";
import CompanionPage from "./pages/Companion";
import HomePage from "./pages/Home";
import LegalPage from "./pages/LegalPage";
import LoginPage from "./pages/Login";
import MapAnalyzerPage from "./pages/MapAnalyzer";
import NotFoundPage from "./pages/NotFound";
import OsuGuessrPage from "./pages/OsuGuessr";
import ProfilePage from "./pages/Profile";
import { legacyRedirects, routes } from "./routes/paths";

export default function App() {
    return (
        <BrowserRouter>
            <SiteMeta />
            <div className="min-h-screen">
                <Routes>
                    <Route path={routes.home} element={<HomePage />} />
                    <Route path={routes.bot} element={<BotPage />} />
                    <Route path={routes.osuguessr} element={<OsuGuessrPage />} />
                    <Route path={routes.companion} element={<CompanionPage />} />
                    <Route path={routes.mapAnalyzer} element={<MapAnalyzerPage />} />
                    <Route
                        path={routes.legal}
                        element={
                            <LegalPage>
                                <LegalIndex />
                            </LegalPage>
                        }
                    />
                    <Route
                        path={routes.legalPrivacy}
                        element={
                            <LegalPage>
                                <PrivacyPolicy />
                            </LegalPage>
                        }
                    />
                    <Route
                        path={routes.legalTerms}
                        element={
                            <LegalPage>
                                <TermsOfService />
                            </LegalPage>
                        }
                    />
                    <Route
                        path={routes.legalCookies}
                        element={
                            <LegalPage>
                                <CookiePolicy />
                            </LegalPage>
                        }
                    />
                    <Route
                        path={routes.legalDataDeletion}
                        element={
                            <LegalPage>
                                <DataDeletion />
                            </LegalPage>
                        }
                    />
                    {Object.entries(legacyRedirects).map(([path, destination]) => (
                        <Route key={path} path={path} element={<Navigate to={destination} replace />} />
                    ))}
                    <Route element={<AuthenticatedRoute />}>
                        <Route path={routes.profile} element={<ProfilePage />} />
                        <Route path={routes.profilePrivacy} element={<AccountPrivacyPage />} />
                        <Route path={routes.profilePrivacyConfirm} element={<AccountPrivacyPage />} />
                    </Route>
                    <Route path={routes.login} element={<LoginPage />} />
                    <Route path="*" element={<NotFoundPage />} />
                </Routes>
            </div>
        </BrowserRouter>
    );
}
