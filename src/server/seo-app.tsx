import { Suspense } from "react";
import { Route, Routes } from "react-router-dom";

import BotPage from "@/client/pages/Bot";
import CompanionPage from "@/client/pages/Companion";
import HomePage from "@/client/pages/Home";
import LegalPage from "@/client/pages/LegalPage";
import MapAnalyzerPage from "@/client/pages/MapAnalyzer";
import NotFoundPage from "@/client/pages/NotFound";
import OsuGuessrPage from "@/client/pages/OsuGuessr";
import { routes } from "@/client/routes/paths";
import RouteLoadingFallback from "@/client/routes/route-loading-fallback";
import CookiePolicy from "@/components/legal/cookie-policy";
import DataDeletion from "@/components/legal/data-deletion";
import LegalIndex from "@/components/legal/legal-index";
import PrivacyPolicy from "@/components/legal/privacy-policy";
import TermsOfService from "@/components/legal/tos";
import SiteMeta from "@/components/site-meta";

export default function SeoApp() {
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
                        <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                </Suspense>
            </div>
        </>
    );
}
