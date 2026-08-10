import { NavLink } from "react-router-dom";

export default function Sidebar() {
  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg transition ${
      isActive
        ? "bg-blue-600 text-white"
        : "text-slate-300 hover:bg-slate-800 hover:text-white"
    }`;

  return (
    <div className="w-64 bg-slate-900 border-r border-slate-800 min-h-screen p-6">
      <h2 className="text-white text-2xl font-bold mb-8">
        DevSecOps
      </h2>

      <nav className="flex flex-col gap-2">
        <NavLink to="/" className={linkClass}>
          <span>📦</span>
          <span>Repositories</span>
        </NavLink>

        <NavLink to="/security-scans" className={linkClass}>
          <span>🔍</span>
          <span>Security Scans</span>
        </NavLink>

        <NavLink to="/vulnerabilities" className={linkClass}>
          <span>🛡️</span>
          <span>Vulnerabilities</span>
        </NavLink>

        <NavLink to="/deployments" className={linkClass}>
          <span>🚀</span>
          <span>Deployments</span>
        </NavLink>

        <NavLink to="/pipelines" className={linkClass}>
          <span>⚙️</span>
          <span>CI/CD Pipelines</span>
        </NavLink>
      </nav>
    </div>
  );
}