import React, { useEffect, useMemo, useState } from "react";
import { api, formatApiError, getFirst, normalizeListPayload } from "../api/client";

function StatusBadge({ status }) {
  if (!status) return <span className="pill">—</span>;
  const s = String(status).toLowerCase();
  if (s === "pending") return <span className="pill pill-pending">Pending</span>;
  if (s === "paid") return <span className="pill pill-paid">Paid</span>;
  if (s === "done" || s === "completed") return <span className="pill pill-ok">Done</span>;
  if (s === "cancelled") return <span className="pill pill-busy">Cancelled</span>;
  return <span className="pill pill-neutral">{status}</span>;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState({ msg: "", ok: true });

  // Form
  const [formTableId, setFormTableId] = useState("");
  const [formStatus, setFormStatus] = useState("Pending");
  const [saving, setSaving] = useState(false);

  function showNotice(msg, ok = true) {
    setNotice({ msg, ok });
    setTimeout(() => setNotice({ msg: "", ok: true }), 4000);
  }

  const metrics = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter((o) => String(o.status || "").toLowerCase() === "pending").length;
    const done = orders.filter((o) => ["done", "paid", "completed"].includes(String(o.status || "").toLowerCase())).length;
    return { total, pending, done };
  }, [orders]);

  async function fetchOrders() {
    setLoading(true);
    setError("");
    try {
      const [resOrders, resTables] = await Promise.allSettled([
        getFirst(["/Order", "/order"]),
        getFirst(["/Table", "/table"]),
      ]);
      setOrders(resOrders.status === "fulfilled" ? normalizeListPayload(resOrders.value.data) : []);
      setTables(resTables.status === "fulfilled" ? normalizeListPayload(resTables.value.data) : []);
    } catch (e) {
      setError("Không tải được đơn hàng: " + formatApiError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchOrders(); }, []);

  async function createOrder() {
    if (!formTableId) return showNotice("Vui lòng chọn bàn.", false);
    setSaving(true);
    try {
      await api.post("/Order", {
        tableId: Number(formTableId),
        status: formStatus,
      });
      showNotice("Tạo đơn hàng thành công!");
      setFormTableId("");
      setFormStatus("Pending");
      await fetchOrders();
    } catch (e) {
      showNotice("Lỗi tạo đơn: " + formatApiError(e), false);
    } finally {
      setSaving(false);
    }
  }

  async function deleteOrder(id) {
    if (!window.confirm("Xóa đơn hàng này?")) return;
    try {
      await api.delete(`/Order/${id}`);
      showNotice("Đã xóa đơn.");
      await fetchOrders();
    } catch (e) {
      showNotice("Lỗi xóa: " + formatApiError(e), false);
    }
  }

  function formatDate(d) {
    if (!d) return "—";
    try { return new Date(d).toLocaleString("vi-VN"); }
    catch { return d; }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Đơn hàng</h1>
          <div className="page-subtitle">
            Tổng {metrics.total} đơn · {metrics.pending} Pending · {metrics.done} Done
          </div>
        </div>
        <div className="page-actions">
          <button className="btn btn-sub" onClick={fetchOrders} disabled={loading}>
            {loading ? "Đang tải..." : "Tải lại"}
          </button>
        </div>
      </div>

      {notice.msg && (
        <div className={`notice notice-${notice.ok ? "ok" : "err"}`}>{notice.msg}</div>
      )}
      {error && <div className="notice notice-err">{error}</div>}

      <div className="layout">
        {/* Table */}
        <div className="section-card">
          <div className="section-head">
            <div>
              <div className="section-title">Danh sách đơn hàng</div>
              <div className="section-sub">{orders.length} đơn</div>
            </div>
          </div>
          <div className="section-body">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 60 }}>ID</th>
                    <th style={{ width: 120 }}>Bàn</th>
                    <th style={{ width: 160 }}>Thời gian</th>
                    <th style={{ width: 120 }}>Trạng thái</th>
                    <th style={{ width: 100 }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.orderId}>
                      <td style={{ fontWeight: 800 }}>#{o.orderId ?? "—"}</td>
                      <td>{o.table ? o.table.name : (o.tableId ?? "—")}</td>
                      <td style={{ fontSize: 12, color: "var(--muted)" }}>{formatDate(o.createdAt)}</td>
                      <td><StatusBadge status={o.status} /></td>
                      <td className="actions">
                        <button className="btn btn-danger" style={{ padding: "7px 10px" }} onClick={() => deleteOrder(o.orderId)}>Xóa</button>
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr><td colSpan={5}><div className="empty">Chưa có đơn hàng nào.</div></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="section-card">
          <div className="section-head">
            <div>
              <div className="section-title">Tạo đơn hàng mới</div>
              <div className="section-sub">Chọn bàn và trạng thái</div>
            </div>
          </div>
          <div className="section-body">
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="form-grid">
                <div className="field">
                  <label>Bàn</label>
                  <select
                    className="input"
                    value={formTableId}
                    onChange={(e) => setFormTableId(e.target.value)}
                  >
                    <option value="">— Chọn bàn —</option>
                    {tables.map((t) => (
                      <option key={t.tableId} value={t.tableId}>{t.name} ({t.status})</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Trạng thái</label>
                  <select
                    className="input"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                  >
                    <option>Pending</option>
                    <option>Paid</option>
                    <option>Done</option>
                    <option>Cancelled</option>
                  </select>
                </div>
              </div>
              <button className="btn btn-main" onClick={createOrder} disabled={saving}>
                {saving ? "Đang tạo..." : "Tạo đơn hàng"}
              </button>
              <div className="footer-note">
                Sau khi tạo đơn, sang tab <b>Chi tiết đơn</b> để thêm món.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
