const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", path: "/" },
  { id: "contacts", label: "Contacts", path: "/contacts" },
  { id: "finance", label: "Finance", path: "/finance" },
  { id: "projects", label: "Projects", path: "/projects" },
  { id: "documents", label: "Documents", path: "/documents" },
  { id: "inventory", label: "Inventory", path: "/inventory" },
  { id: "reports", label: "Reports", path: "/reports" },
  { id: "settings", label: "Settings", path: "/settings" }
];

export default function Sidebar({ active, onSelect, user }) {
  return (
    <aside className="sidebar">
      <div>
        <div className="sidebar__brand"><p>Arca ERP v2</p><h1>Central Hub</h1></div>
        <nav className="sidebar__nav">
          {NAV_ITEMS.map((item) => (
            <button key={item.id} type="button" className={active === item.id ? "sidebar__item is-active" : "sidebar__item"} onClick={() => onSelect(item.id, item.path)}>{item.label}</button>
          ))}
        </nav>
      </div>
      <div className="sidebar__user"><strong>{user?.name || user?.email || "Operator"}</strong><span>{user?.role || "Authenticated"}</span></div>
    </aside>
  );
}
