import React, { useEffect, useMemo, useState } from "react";
import { api, formatApiError, getFirst, normalizeListPayload } from "../api/client";

function formatMoney(v) {
  return Number(v || 0).toLocaleString("vi-VN") + " đ";
}

function StatusBadge({ status }) {
  if (!status) return <span className="pill">—</span>;
  const s = String(status).toLowerCase();
  if (s === "pending") return <span className="pill pill-pending">Đang chờ</span>;
  if (s === "paid") return <span className="pill pill-paid">Đã thanh toán</span>;
  if (s === "done" || s === "completed") return <span className="pill pill-ok">Hoàn thành</span>;
  if (s === "cancelled") return <span className="pill pill-busy">Đã hủy</span>;
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
  const [formStatus, setFormStatus] = useState("Đang chờ");
  const [saving, setSaving] = useState(false);

  function showNotice(msg, ok = true) {
    setNotice({ msg, ok });
    setTimeout(() => setNotice({ msg: "", ok: true }), 4000);
  }

  const metrics = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter((o) => String(o.status || o.Status || "").toLowerCase() === "đang phục vụ").length;
    const done = orders.filter((o) => ["đã thanh toán", "đã hủy", "paid", "done", "cancelled"].includes(String(o.status || o.Status || "").toLowerCase())).length;
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
      setFormStatus("Đang chờ");
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
            Tổng {metrics.total} đơn · {metrics.pending} Đang chờ · {metrics.done} Hoàn thành
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
                    <th style={{ width: 90 }}>Bàn</th>
                    <th style={{ textAlign: "right" }}>Tổng tiền</th>
                    <th style={{ width: 100 }}>Bill</th>
                    <th style={{ width: 130 }}>Thời gian</th>
                    <th style={{ width: 100 }}>Trạng thái</th>
                    <th style={{ width: 70 }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => {
                    const tableName = o.tableName || o.TableName || o.table?.name || "";
                    const displayTable = tableName || (o.tableId || o.TableId ? "Bàn " + (o.tableId || o.TableId) : "—");
                    const orderDetails = o.orderDetails || o.OrderDetails || [];
                    const total = orderDetails.reduce((sum, d) => {
                      const price = d.productPrice || d.ProductPrice || d.product?.price || 0;
                      return sum + (d.quantity || d.Quantity || 1) * price;
                    }, 0);
                    const isPaid = String(o.status || o.Status || "").toLowerCase() === "đã thanh toán";
                    const bill = o.bill || o.Bill;
                    const hasBill = bill && (bill.billId || bill.BillId);
                    return (
                    <tr key={o.orderId || o.OrderId}>
                      <td style={{ fontWeight: 800 }}>#{o.orderId || o.OrderId || "—"}</td>
                      <td>{displayTable}</td>
                      <td style={{ textAlign: "right", fontWeight: 800, color: isPaid ? "var(--ok)" : "var(--warn)" }}>
                        {total > 0 ? formatMoney(total) : "—"}
                      </td>
                      <td>
                        {hasBill
                          ? <span style={{ color: "var(--ok)", fontWeight: 600 }}>✓ #{bill.billId || bill.BillId}</span>
                          : <span style={{ color: "#999", fontStyle: "italic" }}>Chưa có</span>
                        }
                      </td>
                      <td style={{ fontSize: 12, color: "var(--muted)" }}>{formatDate(o.createdAt)}</td>
                      <td><StatusBadge status={o.status || o.Status} /></td>
                      <td className="actions">
                        <button className="btn btn-danger" style={{ padding: "7px 10px" }} onClick={() => deleteOrder(o.orderId || o.OrderId)}>Xóa</button>
                      </td>
                    </tr>
                  );
                  })}
                  {orders.length === 0 && (
                    <tr><td colSpan={7}><div className="empty">Chưa có đơn hàng nào.</div></td></tr>
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
                    {tables
                      .filter(t => {
                        const s = String(t.status || t.Status || "").toLowerCase();
                        return s === "trống" || s === "available";
                      })
                      .map((t) => (
                        <option key={t.tableId || t.TableId} value={t.tableId || t.TableId}>
                          {t.name || t.Name} ({t.status || t.Status})
                        </option>
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
                    <option value="Đang phục vụ">Đang phục vụ</option>
                    <option value="Đang chờ">Đang chờ</option>
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
