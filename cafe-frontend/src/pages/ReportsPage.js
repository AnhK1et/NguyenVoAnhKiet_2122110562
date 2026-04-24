import React, { useEffect, useMemo, useState } from "react";
import { API_BASE, formatApiError, getFirst, normalizeListPayload } from "../api/client";

function formatMoney(v) {
  return Number(v || 0).toLocaleString("vi-VN") + " đ";
}

export default function ReportsPage() {
  const [tables, setTables] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function fetchAll() {
    setLoading(true);
    setError("");
    try {
      const [resTables, resProducts, resOrders, resBills] = await Promise.allSettled([
        getFirst(["/Table", "/table"]),
        getFirst(["/Product", "/product"]),
        getFirst(["/Order", "/order"]),
        getFirst(["/Bill", "/bill"]),
      ]);
      setTables(resTables.status === "fulfilled" ? normalizeListPayload(resTables.value.data) : []);
      setProducts(resProducts.status === "fulfilled" ? normalizeListPayload(resProducts.value.data) : []);
      setOrders(resOrders.status === "fulfilled" ? normalizeListPayload(resOrders.value.data) : []);
      setBills(resBills.status === "fulfilled" ? normalizeListPayload(resBills.value.data) : []);

      if (resTables.status === "rejected") {
        setError("Không kết nối được backend. " + formatApiError(resTables.reason));
      }
    } catch (e) {
      setError("Lỗi tải báo cáo: " + formatApiError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAll(); }, []);

  const stats = useMemo(() => {
    const totalTables = tables.length;
    const busyTables = tables.filter((t) => {
      const s = String(t.status || "").toLowerCase();
      return s !== "available" && s !== "trống";
    }).length;
    const pendingOrders = orders.filter((o) => String(o.status || "").toLowerCase() === "pending").length;
    const revenue = bills.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0);
    const discount = bills.reduce((sum, b) => sum + Number(b.discount || 0), 0);
    return { totalTables, busyTables, pendingOrders, revenue, discount, menuItems: products.length, orderCount: orders.length };
  }, [tables, products, orders, bills]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tổng quan</h1>
          <div className="page-subtitle">Báo cáo hoạt động quán cà phê</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-sub" onClick={fetchAll} disabled={loading}>
            {loading ? "Đang tải..." : "Làm mới"}
          </button>
        </div>
      </div>

      {error && <div className="notice notice-warn">{error}</div>}

      {/* Hero */}
      <div className="hero-card">
        <div>
          <div className="hero-badge">📊 Nom Coffee Dashboard</div>
          <h1 className="hero-title">Báo cáo tổng quan</h1>
          <p className="hero-desc">
            Theo dõi toàn bộ hoạt động kinh doanh: bàn, đơn hàng, doanh thu.
            Dữ liệu cập nhật trực tiếp từ backend ASP.NET của bạn.
          </p>
          <div className="grid-4" style={{ marginTop: 16 }}>
            <div className="stat">
              <div className="label">Sản phẩm</div>
              <div className="value">{stats.menuItems}</div>
            </div>
            <div className="stat">
              <div className="label">Đơn hàng</div>
              <div className="value">{stats.orderCount}</div>
            </div>
            <div className="stat">
              <div className="label">Bàn đang dùng</div>
              <div className="value">{stats.busyTables}</div>
            </div>
            <div className="stat">
              <div className="label">Đơn chờ</div>
              <div className="value" style={{ color: "#fff59d" }}>{stats.pendingOrders}</div>
            </div>
          </div>
        </div>
        <div className="hero-side">
          <div className="kpi">
            <div>
              <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 700 }}>Doanh thu</div>
              <div style={{ fontSize: 13, color: "var(--muted)" }}>Từ bảng Bill</div>
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#a5d6a7" }}>{formatMoney(stats.revenue)}</div>
          </div>
          <div className="kpi">
            <div>
              <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 700 }}>Giảm giá</div>
              <div style={{ fontSize: 13, color: "var(--muted)" }}>Tổng giảm</div>
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#ef9a9a" }}>{formatMoney(stats.discount)}</div>
          </div>
          <div className="kpi">
            <div>
              <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 700 }}>Thực thu</div>
              <div style={{ fontSize: 13, color: "var(--muted)" }}>Sau giảm giá</div>
            </div>
            <div style={{ fontSize: 22, fontWeight: 900 }}>{formatMoney(stats.revenue - stats.discount)}</div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-bar">
        <div className="stat-item">
          <div className="stat-label">Tổng bàn</div>
          <div className="stat-value">{stats.totalTables}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Bàn trống</div>
          <div className="stat-value" style={{ color: "var(--ok)" }}>{stats.totalTables - stats.busyTables}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Bàn có khách</div>
          <div className="stat-value" style={{ color: "var(--warn)" }}>{stats.busyTables}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Đơn Pending</div>
          <div className="stat-value" style={{ color: "#f57f17" }}>{stats.pendingOrders}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Tổng sản phẩm</div>
          <div className="stat-value">{stats.menuItems}</div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: 12 }}>Gợi ý thao tác</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn btn-main" onClick={() => window.location.href = "/menu"}>Quản lý sản phẩm</button>
          <button className="btn btn-sub" onClick={() => window.location.href = "/orders"}>Tạo đơn hàng</button>
          <button className="btn btn-sub" onClick={() => window.location.href = "/order-details"}>Thêm món vào đơn</button>
          <button className="btn btn-ok" onClick={() => window.location.href = "/bills"}>Lập hóa đơn</button>
        </div>
        <div className="footer-note" style={{ marginTop: 12 }}>
          Trình tự bán hàng: <b>Tạo Order</b> → <b>Thêm OrderDetail</b> → <b>Tạo Bill</b>.
          Backend API tại <code>{API_BASE}</code>.
        </div>
      </div>

      {/* Products preview */}
      {products.length > 0 && (
        <div className="card">
          <div className="card-title" style={{ marginBottom: 12 }}>Sản phẩm nổi bật</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {products.slice(0, 8).map((p) => (
              <span key={p.productId} className="badge" style={{ fontSize: 13, padding: "8px 14px" }}>
                {p.name} · {formatMoney(p.price)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
