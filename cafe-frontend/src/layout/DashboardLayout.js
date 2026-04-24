import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function SidebarLink({ to, icon, children }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        "nav-item" + (isActive ? " is-active" : "")
      }
    >
      <span className="nav-icon" aria-hidden="true">{icon}</span>
      <span>{children}</span>
    </NavLink>
  );
}

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const isAdmin = user?.role?.toLowerCase() === "admin";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">☕</div>
          <div>
            <div className="brand-name">Nom Coffee</div>
            <div className="brand-sub">
              {isAdmin ? "Quản lý" : "Nhân viên"}
            </div>
          </div>
        </div>

        <nav className="nav">
          <SidebarLink to="/" icon="🪑">Sơ đồ bàn (POS)</SidebarLink>

          {/* Admin-only pages */}
          {isAdmin && (
            <>
              <SidebarLink to="/menu" icon="📜">Sản phẩm</SidebarLink>
              <SidebarLink to="/order-details" icon="🍽">Chi tiết đơn</SidebarLink>
              <SidebarLink to="/reports" icon="📊">Tổng quan</SidebarLink>
            </>
          )}

          {/* Có thể dùng cho cả 2 role */}
          <SidebarLink to="/orders" icon="🧾">Đơn hàng</SidebarLink>
          <SidebarLink to="/bills" icon="💰">Hóa đơn</SidebarLink>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <span className="user-name">{user?.username}</span>
            <span className={`role-badge role-${user?.role?.toLowerCase()}`}>{user?.role}</span>
          </div>
          <button className="btn btn-logout" onClick={handleLogout}>
            Đăng xuất
          </button>
          <div className="footer-note">
            Backend: <code>http://localhost:5021</code>
          </div>
        </div>
      </aside>

      <main className="main">
        <div className="content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
