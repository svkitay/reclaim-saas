import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Header() {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const retailerLinks = [
    { path: "/dashboard", label: "Dashboard" },
    { path: "/customers", label: "Customers" },
    { path: "/analytics", label: "Analytics" },
    { path: "/logs", label: "Campaign Log" },
    { path: "/settings", label: "Settings" },
  ];

  const adminLinks = [
    { path: "/admin", label: "Overview" },
    { path: "/admin/retailers", label: "Retailers" },
    { path: "/admin/customers", label: "Customers" },
    { path: "/admin/logs", label: "All Logs" },
  ];

  const links = isAdmin ? adminLinks : retailerLinks;

  return (
    <header style={{ background: "#0B1120" }} className="text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to={isAdmin ? "/admin" : "/dashboard"} className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-widest text-white">
              RECLAIM<span style={{ color: "#0EA5E9" }}>.</span>
            </span>
            {isAdmin && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "#0EA5E9", color: "white" }}>
                ADMIN
              </span>
            )}
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === link.path
                    ? "text-white"
                    : "text-slate-400 hover:text-white hover:bg-white/10"
                }`}
                style={location.pathname === link.path ? { background: "#0EA5E9" } : {}}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* User Menu */}
          <div className="flex items-center gap-3">
            <div className="hidden md:block text-right">
              <div className="text-sm font-medium text-white">{user?.store_name}</div>
              <div className="text-xs text-slate-400">{user?.email}</div>
            </div>
            <button
              onClick={handleLogout}
              className="text-sm px-3 py-1.5 rounded-lg border border-slate-600 text-slate-300 hover:text-white hover:border-slate-400 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        <div className="md:hidden pb-3 flex gap-2 overflow-x-auto">
          {links.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                location.pathname === link.path
                  ? "text-white"
                  : "text-slate-400"
              }`}
              style={location.pathname === link.path ? { background: "#0EA5E9" } : {}}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
