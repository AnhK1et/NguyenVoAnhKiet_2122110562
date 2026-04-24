import React, { useEffect, useState } from "react";
import { api, formatApiError, getFirst, normalizeListPayload } from "../api/client";

function formatMoney(v) {
  return Number(v || 0).toLocaleString("vi-VN") + " đ";
}

export default function OrderDetailsPage() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [details, setDetails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState({ msg: "", ok: true });

  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [formProductId, setFormProductId] = useState("");
  const [formQuantity, setFormQuantity] = useState(1);
  const [saving, setSaving] = useState(false);

  function showNotice(msg, ok = true) {
    setNotice({ msg, ok });
    setTimeout(() => setNotice({ msg: "", ok: true }), 4000);
  }

  async function fetchData() {
    setLoading(true);
    setError("");
    try {
      const [resOrders, resProducts] = await Promise.allSettled([
        getFirst(["/Order", "/order"]),
        getFirst(["/Product", "/product"]),
      ]);
      setOrders(resOrders.status === "fulfilled" ? normalizeListPayload(resOrders.value.data) : []);
      setProducts(resProducts.status === "fulfilled" ? normalizeListPayload(resProducts.value.data) : []);
    } catch (e) {
      setError("Lỗi tải dữ liệu: " + formatApiError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  async function loadDetails() {
    if (!selectedOrderId) return showNotice("Vui lòng chọn Order ID.", false);
    try {
      const res = await api.get(`/OrderDetail/order/${selectedOrderId}`);
      setDetails(normalizeListPayload(res.data ?? res));
      showNotice(`Đã tải ${normalizeListPayload(res.data ?? res).length} chi tiết cho Order #${selectedOrderId}`);
    } catch (e) {
      setDetails([]);
      showNotice("Lỗi tải chi tiết: " + formatApiError(e), false);
    }
  }

  async function addDetail() {
    if (!selectedOrderId || !formProductId) return showNotice("Điền đầy đủ thông tin.", false);
    setSaving(true);
    try {
      await api.post("/OrderDetail", {
        orderId: Number(selectedOrderId),
        productId: Number(formProductId),
        quantity: Number(formQuantity) || 1,
      });
      showNotice("Đã thêm món vào đơn!");
      await loadDetails();
    } catch (e) {
      showNotice("Lỗi: " + formatApiError(e), false);
    } finally {
      setSaving(false);
    }
  }

  const total = details.reduce((sum, d) => sum + (Number(d.quantity) || 0), 0);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Chi tiết đơn hàng</h1>
          <div className="page-subtitle">
            Thêm món vào đơn · Order # {selectedOrderId || "—"}
          </div>
        </div>
        <div className="page-actions">
          <button className="btn btn-sub" onClick={fetchData} disabled={loading}>
            {loading ? "Đang tải..." : "Tải lại"}
          </button>
        </div>
      </div>

      {notice.msg && (
        <div className={`notice notice-${notice.ok ? "ok" : "err"}`}>{notice.msg}</div>
      )}
      {error && <div className="notice notice-err">{error}</div>}

      <div className="layout">
        {/* Details list */}
        <div className="section-card">
          <div className="section-head">
            <div>
              <div className="section-title">Danh sách món trong đơn</div>
              <div className="section-sub">{details.length} món · {total} phần</div>
            </div>
            <button className="btn btn-sub" onClick={loadDetails}>Tải chi tiết</button>
          </div>
          <div className="section-body">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 60 }}>ID</th>
                    <th>Tên món</th>
                    <th style={{ width: 80, textAlign: "right" }}>SL</th>
                  </tr>
                </thead>
                <tbody>
                  {details.map((d, i) => (
                    <tr key={d.detailId ?? i}>
                      <td>#{d.detailId ?? "—"}</td>
                      <td style={{ fontWeight: 700 }}>{d.product?.name || d.productId || "—"}</td>
                      <td style={{ textAlign: "right", fontWeight: 800 }}>{d.quantity ?? 1}</td>
                    </tr>
                  ))}
                  {details.length === 0 && (
                    <tr><td colSpan={3}><div className="empty">Chưa có món nào. Tạo đơn ở tab Đơn hàng trước.</div></td></tr>
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
              <div className="section-title">Thêm món vào đơn</div>
              <div className="section-sub">Chọn đơn và món</div>
            </div>
          </div>
          <div className="section-body">
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="field">
                <label>Chọn Order</label>
                <select
                  className="input"
                  value={selectedOrderId}
                  onChange={(e) => { setSelectedOrderId(e.target.value); setDetails([]); }}
                >
                  <option value="">— Chọn Order —</option>
                  {orders.map((o) => (
                    <option key={o.orderId} value={o.orderId}>
                      #{o.orderId} · {o.table?.name || "Bàn " + o.tableId} · {o.status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-grid">
                <div className="field">
                  <label>Sản phẩm</label>
                  <select
                    className="input"
                    value={formProductId}
                    onChange={(e) => setFormProductId(e.target.value)}
                  >
                    <option value="">— Chọn món —</option>
                    {products.map((p) => (
                      <option key={p.productId} value={p.productId}>
                        {p.name} · {formatMoney(p.price)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Số lượng</label>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(e.target.value)}
                  />
                </div>
              </div>

              <button className="btn btn-main" onClick={addDetail} disabled={saving}>
                {saving ? "Đang thêm..." : "Thêm món vào đơn"}
              </button>
              <div className="footer-note">
                Trình tự: <b>Tạo Order</b> → <b>Thêm món ở đây</b> → <b>Tạo Bill</b>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
