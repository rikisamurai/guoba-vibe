import { Link, Outlet } from "@tanstack/react-router";
import { Database, Folder, Import, Plus, QrCode } from "lucide-react";

export function AppShell() {
  return (
    <div className="app-shell">
      <aside className="rail">
        <Link to="/" className="brand">
          <QrCode aria-hidden="true" />
          <span>QR Vault</span>
        </Link>
        <nav className="nav-list" aria-label="Primary">
          <Link to="/" activeProps={{ className: "active" }}>
            <Database aria-hidden="true" /> Vault
          </Link>
          <Link to="/collections" activeProps={{ className: "active" }}>
            <Folder aria-hidden="true" /> Collections
          </Link>
          <Link to="/new" search={{ url: "" }} activeProps={{ className: "active" }}>
            <Plus aria-hidden="true" /> New QR
          </Link>
          <Link to="/import" activeProps={{ className: "active" }}>
            <Import aria-hidden="true" /> Import
          </Link>
        </nav>
      </aside>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
