import { Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import AuthenticatedRoute from "@/components/account/authenticated-route";
import ErrorBoundary from "@/components/error-boundary";
import SiteMeta from "@/components/site-meta";

import LegalPage from "./pages/LegalPage";
import { clientRouteComponents } from "./routes/client-components";
import { legacyRedirects, routes } from "./routes/paths";
import RouteLoadingFallback from "./routes/route-loading-fallback";

const {
    AccountPrivacyPage,
    BotPage,
    CompanionPage,
    CookiePolicy,
    DataDeletion,
    HomePage,
    LegalIndex,
    LinkErrorPage,
    LoginPage,
    MapAnalyzerPage,
    NotFoundPage,
    OsuGuessrPage,
    PrivacyPolicy,
    ProfilePage,
    TermsOfService,
} = clientRouteComponents;

export default function App() {
    return (
        <ErrorBoundary>
            <BrowserRouter>
                <AppContent />
            </BrowserRouter>
        </ErrorBoundary>
    );
}

export function AppContent() {
    return (
        <>
            <SiteMeta />
            <div className="min-h-screen">
                <Suspense fallback={<RouteLoadingFallback />}>
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
                        <Route path={routes.linkError} element={<LinkErrorPage />} />
                        <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                </Suspense>
            </div>
        </>
    );
}
