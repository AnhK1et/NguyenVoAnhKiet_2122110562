import React, { useEffect, useMemo, useState } from "react";
import { API_BASE, api, formatApiError, getFirst, normalizeListPayload } from "../api/client";

function formatMoney(v) {
  return Number(v || 0).toLocaleString("vi-VN") + " đ";
}

function StatusBadge({ status }) {
  if (!status) return <span className="pill">—</span>;
  const s = String(status).toLowerCase();
  if (s === "trống") return <span className="pill pill-ok">Trống</span>;
  if (s === "đang phục vụ") return <span className="pill pill-busy">Đang phục vụ</span>;
  if (s === "chờ thanh toán") return <span className="pill pill-pending">Chờ thanh toán</span>;
  if (s === "đã đặt trước") return <span className="pill pill-pending">Đã đặt trước</span>;
  if (s === "bảo trì") return <span className="pill pill-neutral">Bảo trì</span>;
  return <span className="pill pill-neutral">{status}</span>;
}

export default function TablesPage() {
  const [tables, setTables] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [viewMode, setViewMode] = useState("order");
  const [orderDetails, setOrderDetails] = useState([]);
  const [tableOrders, setTableOrders] = useState([]);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [currentBill, setCurrentBill] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState({ msg: "", ok: true });
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Modal states
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [transferTable, setTransferTable] = useState(null);
  const [mergeTable, setMergeTable] = useState(null);
  const [splitItems, setSplitItems] = useState([]);
  const [selectedSplitItems, setSelectedSplitItems] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("Tiền mặt");
  const [discount, setDiscount] = useState(0);

  const counts = useMemo(() => {
    const total = tables.length;
    const available = tables.filter((t) => String(t.status || "").toLowerCase() === "trống").length;
    return { total, available, busy: total - available };
  }, [tables]);

  function showNotice(msg, ok = true) {
    setNotice({ msg, ok });
    setTimeout(() => setNotice({ msg: "", ok: true }), 4000);
  }

  async function fetchData() {
    setLoading(true);
    setError("");
    try {
      const [resTables, resProducts, resCategories] = await Promise.allSettled([
        getFirst(["/Table", "/table"]),
        getFirst(["/Product", "/product"]),
        getFirst(["/Category", "/category"]),
      ]);
      
      let tableList = [];
      if (resTables.status === "fulfilled" && resTables.value?.data) {
        tableList = normalizeListPayload(resTables.value.data);
      }
      setTables(tableList);
      
      let prodList = [];
      if (resProducts.status === "fulfilled" && resProducts.value?.data) {
        prodList = normalizeListPayload(resProducts.value.data);
      }
      setProducts(prodList);
      
      let catList = [];
      if (resCategories.status === "fulfilled" && resCategories.value?.data) {
        catList = normalizeListPayload(resCategories.value.data);
      }
      setCategories(catList);
      
      if (resTables.status === "rejected") {
        setError("Không tải được danh sách bàn. " + formatApiError(resTables.reason));
      }
    } catch (e) {
      setError("Lỗi kết nối: " + formatApiError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  // =============================================
  // 1. TẠO ORDER VÀ THÊM MÓN
  // =============================================
  async function handleOrder(product) {
    if (!selectedTable) {
      showNotice("Vui lòng chọn bàn trước!", false);
      return;
    }
    setLoading(true);
    try {
      // Tạo order mới cho bàn
      const res = await api.post("/Order", { TableId: selectedTable.tableId });
      if (res.data.orderId) {
        // Thêm món vào order
        await api.post(`/Order/${res.data.orderId}/details`, {
          ProductId: product.productId,
          Quantity: 1
        });
        showNotice(`Đã thêm "${product.name}" cho ${selectedTable.name}`);
        await fetchData();
      } else {
        showNotice(res.data.message || "Lỗi tạo đơn", false);
      }
    } catch (e) {
      showNotice("Lỗi: " + formatApiError(e), false);
    } finally {
      setLoading(false);
    }
  }

  // =============================================
  // 2. XEM CHI TIẾT ĐƠN
  // =============================================
  async function viewOrderDetails(table) {
    try {
      const res = await getFirst(["/Order", "/order"]);
      const allOrders = normalizeListPayload(res.value.data);
      
      const myOrders = allOrders.filter((o) => String(o.tableId) === String(table.tableId) && o.status === "Đang phục vụ");
      
      if (myOrders.length === 0) {
        setTableOrders([]);
        setOrderDetails([]);
        setCurrentOrder(null);
        setCurrentBill(null);
        return;
      }

      const order = myOrders[0];
      setCurrentOrder(order);
      setTableOrders(myOrders);

      // Lấy chi tiết từ OrderDetails
      const details = order.OrderDetails || order.orderDetails || [];
      const validDetails = details.filter(d => d.status !== "Đã hủy");
      
      setOrderDetails(validDetails.map(d => ({
        ...d,
        productName: d.product?.name || "?",
        productPrice: d.product?.price || 0
      })));

      // Lấy Bill
      if (order.bill) {
        setCurrentBill(order.bill);
      } else if (order.Bill) {
        setCurrentBill(order.Bill);
      }
    } catch (e) {
      console.error("Lỗi viewOrderDetails:", e);
      setOrderDetails([]);
      setTableOrders([]);
      setCurrentOrder(null);
      setCurrentBill(null);
    }
  }

  // =============================================
  // 3. THÊM MÓN VÀO ĐƠN HIỆN TẠI
  // =============================================
  async function addMoreItems(product) {
    if (!currentOrder) {
      showNotice("Không có đơn hàng đang mở", false);
      return;
    }
    setLoading(true);
    try {
      await api.post(`/Order/${currentOrder.orderId}/details`, {
        ProductId: product.productId,
        Quantity: 1
      });
      showNotice(`Đã thêm "${product.name}" vào đơn`);
      await viewOrderDetails(selectedTable);
    } catch (e) {
      showNotice("Lỗi thêm món: " + formatApiError(e), false);
    } finally {
      setLoading(false);
    }
  }

  // =============================================
  // 4. XÓA MÓN
  // =============================================
  async function removeItem(detailId) {
    if (!currentOrder) return;
    if (!window.confirm("Xóa món này khỏi đơn?")) return;
    
    try {
      await api.delete(`/Order/${currentOrder.orderId}/details/${detailId}`);
      showNotice("Đã xóa món");
      await viewOrderDetails(selectedTable);
    } catch (e) {
      showNotice("Lỗi xóa món: " + formatApiError(e), false);
    }
  }

  // =============================================
  // 5. CHUYỂN BÀN
  // =============================================
  async function handleTransfer(targetTableId) {
    try {
      const res = await api.post("/Table/transfer", {
        SourceTableId: selectedTable.tableId,
        TargetTableId: targetTableId
      });
      showNotice(res.data.message || "Đã chuyển bàn thành công");
      setShowTransferModal(false);
      setSelectedTable(null);
      await fetchData();
    } catch (e) {
      showNotice("Lỗi chuyển bàn: " + formatApiError(e), false);
    }
  }

  // =============================================
  // 6. GỘP BÀN
  // =============================================
  async function handleMerge(mainTableId) {
    try {
      const res = await api.post("/Table/merge", {
        MainTableId: mainTableId,
        SubTableId: selectedTable.tableId
      });
      showNotice(res.data.message || "Đã gộp bàn thành công");
      setShowMergeModal(false);
      setSelectedTable(null);
      await fetchData();
    } catch (e) {
      showNotice("Lỗi gộp bàn: " + formatApiError(e), false);
    }
  }

  // =============================================
  // 7. TÁCH BÀN
  // =============================================
  async function handleSplit(targetTableId) {
    if (selectedSplitItems.length === 0) {
      showNotice("Vui lòng chọn món để tách", false);
      return;
    }
    try {
      const res = await api.post("/Table/split", {
        SourceTableId: selectedTable.tableId,
        TargetTableId: targetTableId,
        DetailIds: selectedSplitItems
      });
      showNotice(res.data.message || "Đã tách món thành công");
      setShowSplitModal(false);
      setSelectedSplitItems([]);
      setSelectedTable(null);
      await fetchData();
    } catch (e) {
      showNotice("Lỗi tách bàn: " + formatApiError(e), false);
    }
  }

  // =============================================
  // 8. YÊU CẦU THANH TOÁN
  // =============================================
  async function handleRequestPayment() {
    if (!currentOrder) return;
    try {
      await api.post(`/Order/${currentOrder.orderId}/request-payment`);
      showNotice("Đã chuyển sang chờ thanh toán");
      setShowPaymentModal(true);
      await fetchData();
    } catch (e) {
      showNotice("Lỗi: " + formatApiError(e), false);
    }
  }

  // =============================================
  // 9. ÁP DỤNG GIẢM GIÁ
  // =============================================
  async function applyDiscount() {
    if (!currentBill) return;
    try {
      await api.put(`/Bill/${currentBill.billId}/discount`, { Discount: discount });
      showNotice("Đã áp dụng giảm giá");
      await viewOrderDetails(selectedTable);
    } catch (e) {
      showNotice("Lỗi: " + formatApiError(e), false);
    }
  }

  // =============================================
  // 10. THANH TOÁN
  // =============================================
  async function handlePayment(amountPaid) {
    if (!currentBill) return;
    
    const finalAmount = (currentBill.totalAmount || currentBill.TotalAmount || 0) - discount;
    
    if (amountPaid < finalAmount) {
      showNotice(`Số tiền không đủ. Cần: ${formatMoney(finalAmount)}`, false);
      return;
    }

    try {
      const res = await api.post(`/Bill/${currentBill.billId}/pay`, {
        AmountPaid: amountPaid,
        PaymentMethod: paymentMethod
      });
      showNotice(`Thanh toán thành công! Tiền thối: ${formatMoney(res.data.changeAmount)}`);
      setShowPaymentModal(false);
      setSelectedTable(null);
      setCurrentOrder(null);
      setCurrentBill(null);
      setOrderDetails([]);
      await fetchData();
    } catch (e) {
      showNotice("Lỗi thanh toán: " + formatApiError(e), false);
    }
  }

  // =============================================
  // 11. HỦY ĐƠN
  // =============================================
  async function handleCancelOrder() {
    if (!currentOrder) return;
    const reason = window.prompt("Lý do hủy đơn:");
    if (!reason) return;
    
    try {
      await api.post(`/Order/${currentOrder.orderId}/cancel`, { Reason: reason });
      showNotice("Đã hủy đơn");
      setSelectedTable(null);
      setCurrentOrder(null);
      setOrderDetails([]);
      await fetchData();
    } catch (e) {
      showNotice("Lỗi hủy đơn: " + formatApiError(e), false);
    }
  }

  function openTableModal(table, mode) {
    setSelectedTable(table);
    setViewMode(mode);
    setOrderDetails([]);
    setTableOrders([]);
    setCurrentOrder(null);
    setCurrentBill(null);
    if (mode === "view") viewOrderDetails(table);
  }

  const totalAmount = orderDetails.reduce((sum, d) => sum + (d.quantity || 1) * d.productPrice, 0);
  const finalAmount = totalAmount - discount;

  const availableTables = tables.filter(t => String(t.status || "").toLowerCase() === "trống" && t.tableId !== selectedTable?.tableId);
  const occupiedTables = tables.filter(t => String(t.status || "").toLowerCase() === "đang phục vụ");

  return (
    <div className="page">
      {/* Hero */}
      <div className="hero-card">
        <div>
          <div className="hero-badge">☕ Nom Coffee Management</div>
          <h1 className="hero-title">Sơ đồ bàn (POS)</h1>
          <p className="hero-desc">Quản lý bàn - Gọi món - Chuyển/Gộp/Tách bàn - Thanh toán</p>
          <div className="grid-4" style={{ marginTop: 16 }}>
            <div className="stat">
              <div className="label">Tổng bàn</div>
              <div className="value">{counts.total}</div>
            </div>
            <div className="stat">
              <div className="label">Bàn trống</div>
              <div className="value" style={{ color: "#a5d6a7" }}>{counts.available}</div>
            </div>
            <div className="stat">
              <div className="label">Đang phục vụ</div>
              <div className="value" style={{ color: "#ef9a9a" }}>{counts.busy}</div>
            </div>
            <div className="stat">
              <div className="label">Sản phẩm</div>
              <div className="value">{products.length}</div>
            </div>
          </div>
        </div>
        <div className="hero-side">
          <button className="btn btn-sub" onClick={fetchData} disabled={loading}>
            {loading ? "Đang tải..." : "Làm mới"}
          </button>
        </div>
      </div>

      {/* Notice */}
      {notice.msg && (
        <div className={`notice notice-${notice.ok ? "ok" : "err"}`}>
          {notice.msg}
        </div>
      )}
      {error && <div className="notice notice-err">{error}</div>}

      {/* Table Grid */}
      {tables.length === 0 && !loading ? (
        <div className="card">
          <div className="empty">Chưa có bàn nào. Hãy kiểm tra kết nối API.</div>
        </div>
      ) : (
        <div className="tables-grid">
          {tables.map((t) => {
            const s = String(t.status || "").toLowerCase();
            const isAvailable = s === "trống";
            return (
              <div
                key={t.tableId}
                className={`table-card ${isAvailable ? "available" : "occupied"} ${
                  selectedTable?.tableId === t.tableId ? "selected" : ""
                }`}
                onClick={() => setSelectedTable(isAvailable ? t : null)}
              >
                <div className="table-card-name">{t.name}</div>
                <StatusBadge status={t.status} />
                <div className="table-card-meta" style={{ marginTop: 6 }}>
                  ID: #{t.tableId}
                </div>
                <div className="table-card-footer">
                  {isAvailable ? (
                    <button
                      className="btn btn-main"
                      style={{ width: "100%", justifyContent: "center" }}
                      onClick={(e) => { e.stopPropagation(); openTableModal(t, "order"); }}
                    >
                      Gọi món
                    </button>
                  ) : (
                    <button
                      className="btn btn-sub"
                      style={{ width: "100%", justifyContent: "center" }}
                      onClick={(e) => { e.stopPropagation(); openTableModal(t, "view"); }}
                    >
                      Xem đơn
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table Modal */}
      {selectedTable && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal" style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <div>
                <div className="modal-title">
                  {viewMode === "view" ? "Chi tiết đơn" : "Gọi món"}
                </div>
                <div className="modal-sub">{selectedTable.name}</div>
              </div>
              <button className="icon-btn" onClick={() => { setSelectedTable(null); setViewMode("order"); fetchData(); }}>
                ×
              </button>
            </div>
            <div className="modal-body">
              {viewMode === "view" ? (
                // === CHẾ ĐỘ XEM/SỬA ĐƠN ===
                <>
                  {/* Action buttons */}
                  <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                    <button className="btn btn-main" onClick={() => { setViewMode("add"); setSelectedCategory("all"); }}>
                      + Thêm món
                    </button>
                    <button className="btn btn-sub" onClick={() => setShowTransferModal(true)}>
                      Chuyển bàn
                    </button>
                    <button className="btn btn-sub" onClick={() => setShowMergeModal(true)}>
                      Gộp bàn
                    </button>
                    <button className="btn btn-sub" onClick={() => setShowSplitModal(true)}>
                      Tách bàn
                    </button>
                    <button className="btn btn-ok" onClick={handleRequestPayment}>
                      Tính tiền
                    </button>
                    <button className="btn btn-danger" onClick={handleCancelOrder}>
                      Hủy đơn
                    </button>
                  </div>

                  {/* Order Details Table */}
                  {orderDetails.length === 0 ? (
                    <div className="empty" style={{ textAlign: "center", padding: "40px 0" }}>
                      Chưa có món nào trong đơn.
                    </div>
                  ) : (
                    <>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid #333" }}>
                            <th style={{ textAlign: "left", padding: "8px 4px" }}>Món</th>
                            <th style={{ textAlign: "center", padding: "8px 4px", width: 50 }}>SL</th>
                            <th style={{ textAlign: "right", padding: "8px 4px" }}>Đơn giá</th>
                            <th style={{ textAlign: "right", padding: "8px 4px" }}>Tổng</th>
                            <th style={{ textAlign: "center", padding: "8px 4px", width: 50 }}>Xóa</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orderDetails.map((d, i) => (
                            <tr key={d.detailId || d.DetailId || i} style={{ borderBottom: "1px solid #2a2a2a" }}>
                              <td style={{ padding: "8px 4px" }}>{d.productName}</td>
                              <td style={{ textAlign: "center", padding: "8px 4px" }}>{d.quantity || 1}</td>
                              <td style={{ textAlign: "right", padding: "8px 4px" }}>{formatMoney(d.productPrice)}</td>
                              <td style={{ textAlign: "right", padding: "8px 4px", fontWeight: 600 }}>
                                {formatMoney((d.quantity || 1) * d.productPrice)}
                              </td>
                              <td style={{ textAlign: "center", padding: "8px 4px" }}>
                                <button className="btn-icon" onClick={() => removeItem(d.detailId || d.DetailId)}>×</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Discount */}
                      <div style={{ display: "flex", gap: 8, marginTop: 16, alignItems: "center" }}>
                        <span>Giảm giá:</span>
                        <input
                          type="number"
                          className="input"
                          style={{ width: 120 }}
                          value={discount}
                          onChange={(e) => setDiscount(Number(e.target.value))}
                          min="0"
                        />
                        <button className="btn btn-sub" onClick={applyDiscount}>Áp dụng</button>
                      </div>

                      {/* Summary */}
                      <div style={{ marginTop: 16, padding: 12, background: "#1a1a1a", borderRadius: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                          <span>Tổng tiền:</span>
                          <span style={{ fontWeight: 600 }}>{formatMoney(totalAmount)}</span>
                        </div>
                        {discount > 0 && (
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, color: "#81c784" }}>
                            <span>Giảm giá:</span>
                            <span>-{formatMoney(discount)}</span>
                          </div>
                        )}
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: 700, borderTop: "1px solid #333", paddingTop: 8 }}>
                          <span>Thành tiền:</span>
                          <span style={{ color: "#81c784" }}>{formatMoney(finalAmount)}</span>
                        </div>
                      </div>
                    </>
                  )}
                </>
              ) : (
                // === CHẾ ĐỘ GỌI MÓN / THÊM MÓN ===
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        className={`btn ${selectedCategory === "all" ? "btn-main" : "btn-sub"}`}
                        onClick={() => setSelectedCategory("all")}
                      >
                        Tất cả
                      </button>
                      {categories.map((cat) => (
                        <button
                          key={cat.categoryId}
                          className={`btn ${selectedCategory === cat.categoryId ? "btn-main" : "btn-sub"}`}
                          onClick={() => setSelectedCategory(cat.categoryId)}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                    {viewMode === "add" && (
                      <button className="btn btn-ghost" onClick={() => setViewMode("view")}>
                        ← Quay lại
                      </button>
                    )}
                  </div>
                  
                  {/* Products Grid */}
                  <div className="menu-grid">
                    {products
                      .filter((p) => selectedCategory === "all" || p.categoryId === selectedCategory)
                      .map((p) => (
                        <button
                          key={p.productId}
                          className="menu-item"
                          onClick={() => viewMode === "add" ? addMoreItems(p) : handleOrder(p)}
                          type="button"
                        >
                          <span className="menu-name">{p.name}</span>
                          <span className="menu-price">{formatMoney(p.price)}</span>
                        </button>
                      ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="modal-overlay" onClick={() => setShowTransferModal(false)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Chuyển bàn</div>
              <button className="icon-btn" onClick={() => setShowTransferModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>Chọn bàn đích (bàn trống):</p>
              {availableTables.length === 0 ? (
                <div className="empty">Không có bàn trống nào.</div>
              ) : (
                <div className="menu-grid">
                  {availableTables.map((t) => (
                    <button
                      key={t.tableId}
                      className="menu-item"
                      onClick={() => handleTransfer(t.tableId)}
                    >
                      <span className="menu-name">{t.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Merge Modal */}
      {showMergeModal && (
        <div className="modal-overlay" onClick={() => setShowMergeModal(false)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Gộp bàn</div>
              <button className="icon-btn" onClick={() => setShowMergeModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>Chọn bàn chính (bàn đang phục vụ):</p>
              {occupiedTables.length === 0 ? (
                <div className="empty">Không có bàn nào đang phục vụ.</div>
              ) : (
                <div className="menu-grid">
                  {occupiedTables.filter(t => t.tableId !== selectedTable?.tableId).map((t) => (
                    <button
                      key={t.tableId}
                      className="menu-item"
                      onClick={() => handleMerge(t.tableId)}
                    >
                      <span className="menu-name">{t.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Split Modal */}
      {showSplitModal && selectedTable && (
        <div className="modal-overlay" onClick={() => { setShowSplitModal(false); setSelectedSplitItems([]); }}>
          <div className="modal" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Tách bàn</div>
              <button className="icon-btn" onClick={() => { setShowSplitModal(false); setSelectedSplitItems([]); }}>×</button>
            </div>
            <div className="modal-body">
              <p>Chọn món để tách sang bàn mới:</p>
              <div style={{ maxHeight: 200, overflowY: "auto", marginBottom: 16 }}>
                {orderDetails.map((d) => (
                  <label key={d.detailId || d.DetailId} style={{ display: "flex", alignItems: "center", gap: 8, padding: 8, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={selectedSplitItems.includes(d.detailId || d.DetailId)}
                      onChange={(e) => {
                        const id = d.detailId || d.DetailId;
                        if (e.target.checked) {
                          setSelectedSplitItems([...selectedSplitItems, id]);
                        } else {
                          setSelectedSplitItems(selectedSplitItems.filter(i => i !== id));
                        }
                      }}
                    />
                    <span>{d.productName} x{d.quantity || 1}</span>
                  </label>
                ))}
              </div>
              <p>Chọn bàn đích (bàn trống):</p>
              {availableTables.length === 0 ? (
                <div className="empty">Không có bàn trống nào.</div>
              ) : (
                <div className="menu-grid">
                  {availableTables.map((t) => (
                    <button
                      key={t.tableId}
                      className="menu-item"
                      onClick={() => handleSplit(t.tableId)}
                    >
                      <span className="menu-name">{t.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Thanh toán</div>
              <button className="icon-btn" onClick={() => setShowPaymentModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: 16, padding: 16, background: "#1a1a1a", borderRadius: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span>Tổng tiền:</span>
                  <span style={{ fontWeight: 600 }}>{formatMoney(totalAmount)}</span>
                </div>
                {discount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, color: "#81c784" }}>
                    <span>Giảm giá:</span>
                    <span>-{formatMoney(discount)}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, fontWeight: 700 }}>
                  <span>Thành tiền:</span>
                  <span style={{ color: "#81c784" }}>{formatMoney(finalAmount)}</span>
                </div>
              </div>

              <div className="field" style={{ marginBottom: 16 }}>
                <label>Phương thức thanh toán</label>
                <select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  <option value="Tiền mặt">Tiền mặt</option>
                  <option value="Chuyển khoản">Chuyển khoản</option>
                  <option value="Ví điện tử">Ví điện tử</option>
                </select>
              </div>

              <button
                className="btn btn-ok"
                style={{ width: "100%", justifyContent: "center", padding: 16, fontSize: 16 }}
                onClick={() => handlePayment(finalAmount)}
              >
                Thanh toán {formatMoney(finalAmount)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
