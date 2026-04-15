import { useEffect, useMemo, useState } from "react";
import "./App.css";
import LoginForm from "./components/LoginForm.jsx";
import Sidebar from "./components/Sidebar.jsx";
import DashboardGrid from "./components/DashboardGrid.jsx";
import AlertsPanel from "./components/AlertsPanel.jsx";
import InventoryPage from "./pages/InventoryPage.jsx";
import ReportsPage from "./pages/ReportsPage.jsx";
import FxRatesPage from "./pages/FxRatesPage.jsx";
import ApprovalsPage from "./pages/ApprovalsPage.jsx";
import ContactsPage from "./pages/ContactsPage.jsx";
import FinancePage from "./pages/FinancePage.jsx";
import ProjectsPage from "./pages/ProjectsPage.jsx";
import DocumentsPage from "./pages/DocumentsPage.jsx";

function formatMoney(value) { return new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Number(value || 0)); }
function formatPercent(value) { return `${(Number(value || 0) * 100).toFixed(1)}%`; }
function formatMonths(value) { if (value === null || value === undefined || !Number.isFinite(Number(value))) return "n/a"; return `${Number(value).toFixed(1)} mo`; }

const ROUTE_MAP = {
  "/": "dashboard",
  "/contacts": "contacts",
  "/finance": "finance",
  "/projects": "projects",
  "/documents": "documents",
  "/inventory": "inventory",
  "/reports": "reports",
  "/fx": "fx",
  "/approvals": "approvals"
};

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("arca.token") || "");
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem("arca.user") || "null"); } catch { return null; } });
  const [active, setActive] = useState(() => ROUTE_MAP[window.location.pathname] || "dashboard");
  const [kpis, setKpis] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const setRoute = (id, path) => {
    setActive(id);
    if (window.location.pathname !== path) window.history.pushState({}, "", path);
  };

  useEffect(() => {
    const onPop = () => setActive(ROUTE_MAP[window.location.pathname] || "dashboard");
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const authedFetch = async (url) => {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  };

  const loadDashboard = async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const [kpiRes, alertRes] = await Promise.all([
        authedFetch("/api/v1/dashboard/kpis"),
        authedFetch("/api/v1/dashboard/alerts")
      ]);
      setKpis(kpiRes.kpis || {});
      setAlerts(alertRes.alerts || {});
    } catch (e) {
      setError(e.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDashboard(); }, [token]);

  const onLogin = async (manualToken, identifier, password) => {
    setLoading(true);
    setError("");
    try {
      if (manualToken) {
        localStorage.setItem("arca.token", manualToken);
        setToken(manualToken);
        return;
      }
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password })
      });
      const data = await res.json();
      if (!res.ok || !data.access_token) throw new Error(data.error || "Login failed");
      localStorage.setItem("arca.token", data.access_token);
      localStorage.setItem("arca.user", JSON.stringify(data.user || null));
      setToken(data.access_token);
      setUser(data.user || null);
    } catch (e) {
      setError(e.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const mappedKpis = useMemo(() => !kpis ? [] : [
    { key: "cash_balance", label: "Cash balance", value: formatMoney(kpis.cash_balance), color: "good" },
    { key: "burn_rate", label: "Burn rate (avg 3m)", value: formatMoney(kpis.burn_rate), color: "warn" },
    { key: "runway_months", label: "Runway", value: formatMonths(kpis.runway_months), color: "good" },
    { key: "ar_overdue", label: "AR overdue", value: formatMoney(kpis.ar_overdue), color: "danger" },
    { key: "ap_due_7d", label: "AP due 7d", value: formatMoney(kpis.ap_due_7d), color: "warn" },
    { key: "ap_due_30d", label: "AP due 30d", value: formatMoney(kpis.ap_due_30d), color: "warn" },
    { key: "gross_margin", label: "Gross margin", value: formatPercent(kpis.gross_margin), color: "good" },
    { key: "ebitda_proxy", label: "EBITDA proxy", value: formatMoney(kpis.ebitda_proxy), color: "default" },
    { key: "budget_consumption", label: "Budget consumption", value: formatPercent(kpis.budget_consumption), color: "default" }
  ], [kpis]);

  if (!token) return <main className="login-screen"><LoginForm onLogin={onLogin} loading={loading} error={error} /></main>;

  const renderModule = () => {
    switch (active) {
      case "dashboard":    return <><DashboardGrid kpis={mappedKpis} /><AlertsPanel alerts={alerts || {}} /></>;
      case "contacts":     return <ContactsPage token={token} />;
      case "finance":      return <FinancePage token={token} />;
      case "projects":     return <ProjectsPage token={token} />;
      case "documents":    return <DocumentsPage token={token} />;
      case "inventory":    return <InventoryPage token={token} />;
      case "reports":      return <ReportsPage token={token} />;
      case "fx":           return <FxRatesPage token={token} />;
      case "approvals":    return <ApprovalsPage token={token} />;
      default:             return <><DashboardGrid kpis={mappedKpis} /><AlertsPanel alerts={alerts || {}} /></>;
    }
  };

  return (
    <div className="layout">
      <Sidebar active={active} onSelect={setRoute} user={user} />
      <main className="content">
        <header className="content__header">
          <h2>{active === "dashboard" ? "Financial KPI Dashboard" : active[0].toUpperCase() + active.slice(1)}</h2>
          <button type="button" onClick={active === "dashboard" ? loadDashboard : () => {}} disabled={loading}>Refresh</button>
        </header>
        {error ? <p className="error-banner">{error}</p> : null}
        {renderModule()}
      </main>
    </div>
  );
}