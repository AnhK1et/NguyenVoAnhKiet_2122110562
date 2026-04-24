import React, { useEffect, useState } from "react";
import { api, formatApiError, getFirst, normalizeListPayload } from "../api/client";

function formatMoney(v) {
  return Number(v || 0).toLocaleString("vi-VN") + " đ";
}

export default function BillsPage() {
  const [bills, setBills] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState({ msg: "", ok: true });

  const [formOrderId, setFormOrderId] = useState("");
  const [formDiscount, setFormDiscount] = useState("0");
  const [formPaymentMethod, setFormPaymentMethod] = useState("Tiền mặt");
  const [saving, setSaving] = useState(false);

  function showNotice(msg, ok = true) {
    setNotice({ msg, ok });
    setTimeout(() => setNotice({ msg: "", ok: true }), 4000);
  }

  async function fetchBills() {
    setLoading(true);
    setError("");
    try {
      const [resBills, resOrders] = await Promise.allSettled([
        getFirst(["/Bill", "/bill"]),
        getFirst(["/Order", "/order"]),
      ]);
      setBills(resBills.status === "fulfilled" ? normalizeListPayload(resBills.value.data) : []);
      setOrders(resOrders.status === "fulfilled" ? normalizeListPayload(resOrders.value.data) : []);
    } catch (e) {
      setError("Lỗi tải: " + formatApiError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchBills(); }, []);

  async function createBill() {
    if (!formOrderId) return showNotice("Chọn Order.", false);
    setSaving(true);
    try {
      // Chỉ gửi OrderId + Discount, backend tự tính tổng
      await api.post("/Bill", {
        orderId: Number(formOrderId),
        discount: Number(formDiscount) || 0,
      });
      showNotice("Tạm thu thành công!");
      setFormOrderId("");
      setFormDiscount("0");
      await fetchBills();
    } catch (e) {
      showNotice("Lỗi tạo hóa đơn: " + formatApiError(e), false);
    } finally {
      setSaving(false);
    }
  }

  // Tính tổng tạm khi chọn order để preview
  const selectedOrder = orders.find(o => o.orderId == formOrderId);
  const previewTotal = selectedOrder?.orderDetails?.reduce((sum, od) => {
    return sum + (od.quantity || 0) * (od.product?.price || 0);
  }, 0) || 0;
  const previewFinal = previewTotal - (Number(formDiscount) || 0);

  function formatDate(d) {
    if (!d) return "—";
    try { return new Date(d).toLocaleString("vi-VN"); }
    catch { return d; }
  }

  const totalRevenue = bills.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0);
  const totalDiscount = bills.reduce((sum, b) => sum + Number(b.discount || 0), 0);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Hóa đơn</h1>
          <div className="page-subtitle">
            {bills.length} hóa đơn · Tổng {formatMoney(totalRevenue)}
          </div>
        </div>
        <div className="page-actions">
          <button className="btn btn-sub" onClick={fetchBills} disabled={loading}>
            {loading ? "Đang tải..." : "Tải lại"}
          </button>
        </div>
      </div>

      {notice.msg && (
        <div className={`notice notice-${notice.ok ? "ok" : "err"}`}>{notice.msg}</div>
      )}
      {error && <div className="notice notice-err">{error}</div>}

      {/* Summary */}
      <div className="grid-4">
        <div className="card">
          <div style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700 }}>Tổng hóa đơn</div>
          <div style={{ fontSize: 28, fontWeight: 900, marginTop: 6 }}>{bills.length}</div>
        </div>
        <div className="card">
          <div style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700 }}>Doanh thu</div>
          <div style={{ fontSize: 28, fontWeight: 900, marginTop: 6, color: "var(--ok)" }}>{formatMoney(totalRevenue)}</div>
        </div>
        <div className="card">
          <div style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700 }}>Giảm giá</div>
          <div style={{ fontSize: 28, fontWeight: 900, marginTop: 6, color: "var(--warn)" }}>{formatMoney(totalDiscount)}</div>
        </div>
        <div className="card">
          <div style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700 }}>Thực thu</div>
          <div style={{ fontSize: 28, fontWeight: 900, marginTop: 6 }}>{formatMoney(totalRevenue - totalDiscount)}</div>
        </div>
      </div>

      <div className="layout">
        {/* Table */}
        <div className="section-card">
          <div className="section-head">
            <div>
              <div className="section-title">Danh sách hóa đơn</div>
              <div className="section-sub">{bills.length} hóa đơn</div>
            </div>
          </div>
          <div className="section-body">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 60 }}>Bill ID</th>
                    <th style={{ width: 80 }}>Order ID</th>
                    <th style={{ textAlign: "right" }}>Tổng tiền</th>
                    <th style={{ textAlign: "right" }}>Giảm giá</th>
                    <th style={{ width: 160 }}>Ngày thanh toán</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map((b) => (
                    <tr key={b.billId}>
                      <td style={{ fontWeight: 800 }}>#{b.billId ?? "—"}</td>
                      <td>#{b.orderId ?? "—"}</td>
                      <td style={{ textAlign: "right", fontWeight: 800 }}>{formatMoney(b.totalAmount)}</td>
                      <td style={{ textAlign: "right", color: "var(--warn)" }}>{formatMoney(b.discount)}</td>
                      <td style={{ fontSize: 12, color: "var(--muted)" }}>{formatDate(b.paymentDate)}</td>
                    </tr>
                  ))}
                  {bills.length === 0 && (
                    <tr><td colSpan={5}><div className="empty">Chưa có hóa đơn nào.</div></td></tr>
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
              <div className="section-title">Tạo hóa đơn</div>
              <div className="section-sub">Lập hóa đơn cho đơn hàng</div>
            </div>
          </div>
          <div className="section-body">
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="field">
                <label>Chọn Order</label>
                <select
                  className="input"
                  value={formOrderId}
                  onChange={(e) => setFormOrderId(e.target.value)}
                >
                  <option value="">— Chọn Order —</option>
                  {orders.map((o) => (
                    <option key={o.orderId} value={o.orderId}>
                      #{o.orderId} · {o.table?.name || "Bàn " + o.tableId}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Giảm giá (VNĐ)</label>
                <input
                  className="input"
                  type="number"
                  placeholder="0"
                  value={formDiscount}
                  onChange={(e) => setFormDiscount(e.target.value)}
                />
              </div>
              <button className="btn btn-ok" onClick={createBill} disabled={saving}>
                {saving ? "Đang tạo..." : "Lập hóa đơn"}
              </button>
              <div className="footer-note">
                Tổng tạm: <b>{formatMoney(previewTotal)}</b> · Thực thu: <b style={{ color: "var(--ok)" }}>{formatMoney(previewFinal)}</b>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
