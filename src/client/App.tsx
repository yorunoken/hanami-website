import { Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AuthenticatedRoute from "@/components/account/authenticated-route";
import SiteMeta from "@/components/site-meta";
import { RouteFallback } from "@/components/layout/route-fallback";
import HomePage from "./pages/Home";
import LegalPage from "./pages/LegalPage";
import LoginPage from "./pages/Login";
import ProfilePage from "./pages/Profile";
import { legacyRedirects, routes } from "./routes/paths";
import { routeModules } from "./routes/route-modules";

const {
    accountPrivacy,
    bot,
    companion,
    legalCookies,
    legalDataDeletion,
    legalIndex,
    legalPrivacy,
    legalTerms,
    mapAnalyzer,
    notFound,
    osuguessr,
} = routeModules;

export default function App() {
    return (
        <BrowserRouter>
            <SiteMeta />
            <div className="min-h-screen">
                <Suspense fallback={<RouteFallback />}>
                    <Routes>
                        <Route path={routes.home} element={<HomePage />} />
                        <Route path={routes.bot} element={<bot.Component />} />
                        <Route path={routes.osuguessr} element={<osuguessr.Component />} />
                        <Route path={routes.companion} element={<companion.Component />} />
                        <Route path={routes.mapAnalyzer} element={<mapAnalyzer.Component />} />
                        <Route
                            path={routes.legal}
                            element={
                                <LegalPage>
                                    <legalIndex.Component />
                                </LegalPage>
                            }
                        />
                        <Route
                            path={routes.legalPrivacy}
                            element={
                                <LegalPage>
                                    <legalPrivacy.Component />
                                </LegalPage>
                            }
                        />
                        <Route
                            path={routes.legalTerms}
                            element={
                                <LegalPage>
                                    <legalTerms.Component />
                                </LegalPage>
                            }
                        />
                        <Route
                            path={routes.legalCookies}
                            element={
                                <LegalPage>
                                    <legalCookies.Component />
                                </LegalPage>
                            }
                        />
                        <Route
                            path={routes.legalDataDeletion}
                            element={
                                <LegalPage>
                                    <legalDataDeletion.Component />
                                </LegalPage>
                            }
                        />
                        {Object.entries(legacyRedirects).map(([path, destination]) => (
                            <Route key={path} path={path} element={<Navigate to={destination} replace />} />
                        ))}
                        <Route element={<AuthenticatedRoute />}>
                            <Route path={routes.profile} element={<ProfilePage />} />
                            <Route path={routes.profilePrivacy} element={<accountPrivacy.Component />} />
                            <Route path={routes.profilePrivacyConfirm} element={<accountPrivacy.Component />} />
                        </Route>
                        <Route path={routes.login} element={<LoginPage />} />
                        <Route path="*" element={<notFound.Component />} />
                    </Routes>
                </Suspense>
            </div>
        </BrowserRouter>
    );
}
