import { Routes, Route, Link, useLocation } from "react-router-dom";
import { Compass, Users, Sparkles, Wand2 } from "lucide-react";

import TripBuilderPage from "./pages/TripBuilderPage";
import HomePage from "./pages/HomePage";
import ExplorePage from "./pages/ExplorePage";
import CommunityPage from "./pages/CommunityPage";

function NavHeader() {
  const { pathname } = useLocation();

  function navLink(to: string, label: string) {
    const active = pathname === to;
    return (
      <Link
        to={to}
        className={[
          "text-sm font-medium transition-colors",
          active
            ? "text-gold-600 dark:text-gold-400"
            : "text-forest-500 dark:text-forest-400 hover:text-forest-900 dark:hover:text-cream-100",
        ].join(" ")}
      >
        {label}
      </Link>
    );
  }

  return (
    <header className="fixed inset-x-0 top-0 z-40 bg-cream-50/90 dark:bg-forest-950/90 backdrop-blur-md transition-colors">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Logo — always flush left */}
        <Link to="/" className="flex items-center gap-2.5 flex-none">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-forest-900 dark:bg-gold-500/15 ring-1 ring-forest-900/10 dark:ring-gold-500/30">
            <Compass className="h-4 w-4 text-cream-100 dark:text-gold-400" strokeWidth={2} />
          </div>
          <span className="font-serif text-lg font-semibold text-forest-900 dark:text-cream-100 whitespace-nowrap">
            Lopan
          </span>
        </Link>

        {/* Right side — nav + badge */}
        <div className="flex items-center gap-4">
          {/* Desktop nav links — md and up */}
          <nav className="hidden items-center gap-4 md:flex">
            {navLink("/", "Plan")}
            {navLink("/generate", "Generator")}
            {navLink("/explore", "Explore")}
            {navLink("/community", "Community")}
          </nav>

          {/* Mobile/tablet nav icons */}
          <div className="flex items-center gap-3 md:hidden">
            <Link to="/" aria-label="Plan">
              <Sparkles className="h-5 w-5 text-forest-500 dark:text-forest-400" />
            </Link>
            <Link to="/generate" aria-label="Generator">
              <Wand2 className="h-5 w-5 text-forest-500 dark:text-forest-400" />
            </Link>
            <Link to="/explore" aria-label="Explore">
              <Compass className="h-5 w-5 text-forest-500 dark:text-forest-400" />
            </Link>
            <Link to="/community" aria-label="Community">
              <Users className="h-5 w-5 text-forest-500 dark:text-forest-400" />
            </Link>
          </div>

          <span className="rounded-full border border-gold-600/40 dark:border-gold-500/40 px-2.5 py-0.5 text-xs font-medium uppercase tracking-widest text-gold-600 dark:text-gold-500 flex-none">
            Beta
          </span>
        </div>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <div className="min-h-dvh font-sans">
      <NavHeader />
      <Routes>
        <Route path="/" element={<TripBuilderPage />} />
        <Route path="/generate" element={<HomePage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/community" element={<CommunityPage />} />
      </Routes>
    </div>
  );
}
