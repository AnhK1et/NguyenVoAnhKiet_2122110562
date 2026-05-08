import React, { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { API_BASE, api, formatApiError, getFirst, normalizeListPayload } from "../api/client";
import { useAuth } from "../context/AuthContext";

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
  const { user } = useAuth();
  const [tables, setTables] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
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
      // Dọn dẹp đơn rỗng và bàn trống
      try {
        await api.post("/Order/cleanup");
      } catch { /* ignore cleanup errors */ }

      const [resTables, resProducts, resCategories, resOrders] = await Promise.allSettled([
        getFirst(["/Table", "/table"]),
        getFirst(["/Product", "/product"]),
        getFirst(["/Category", "/category"]),
        getFirst(["/Order", "/order"]),
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

      // Load orders để hiển thị món và giá trên mỗi bàn
      if (resOrders.status === "fulfilled" && resOrders.value?.data) {
        const allOrders = normalizeListPayload(resOrders.value.data);
        // Backend đã trả OrderDetails và Bill đầy đủ, không cần enrich thêm
        setAllOrders(allOrders);
      }
      
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
        // Chuyển sang chế độ xem để có thể thêm món
        setViewMode("view");
        await fetchData();
        await viewOrderDetails(selectedTable);
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
    console.log("=== viewOrderDetails called ===");
    console.log("Table:", table);
    console.log("allOrders:", allOrders);
    try {
      // Ưu tiên lấy từ state allOrders đã được enrich
      const stateOrder = allOrders.find(o => {
        const orderStatus = o.status || o.Status || "";
        const tableIdMatch = String(o.tableId || o.TableId) === String(table.tableId || table.TableId);
        console.log(`Checking order: tableId=${o.tableId || o.TableId}, status=${orderStatus}`);
        return tableIdMatch && orderStatus === "Đang phục vụ";
      });

      console.log("Found stateOrder:", stateOrder);

      let order;
      let details = [];

      if (stateOrder && (stateOrder.OrderDetails || stateOrder.orderDetails)) {
        console.log("Using stateOrder details");
        order = stateOrder;
        details = stateOrder.OrderDetails || stateOrder.orderDetails;
      } else {
        console.log("Fetching from API...");
        // Gọi API lấy đơn hàng
        let ordersData = [];
        try {
          const resOrders = await api.get("/Order");
          console.log("/Order response:", resOrders.data);
          ordersData = normalizeListPayload(resOrders.data);
        } catch (e1) {
          console.log("Get /Order failed:", e1.message);
          ordersData = [];
        }

        console.log("All orders from API:", ordersData);

        const myOrders = ordersData.filter((o) => {
          const orderStatus = o.status || o.Status || "";
          return String(o.tableId || o.TableId) === String(table.tableId || table.TableId) && orderStatus === "Đang phục vụ";
        });

        console.log("Filtered orders for table:", myOrders);

        if (myOrders.length === 0) {
          setTableOrders([]);
          setOrderDetails([]);
          setCurrentOrder(null);
          setCurrentBill(null);
          return;
        }

        order = myOrders[0];
        console.log("Selected order:", order);
        
        // Lấy chi tiết đơn hàng
        const orderId = order.orderId || order.OrderId;
        console.log("Fetching details for orderId:", orderId);
        try {
          const resDetails = await api.get(`/OrderDetail/order/${orderId}`);
          console.log("/OrderDetail/order/ full response:", resDetails);
          console.log("/OrderDetail/order/ data:", resDetails.data);
          details = normalizeListPayload(resDetails.data);
        } catch (e3) {
          console.log("Get details failed:", e3.message);
          details = order.OrderDetails || order.orderDetails || [];
        }
      }
      
      console.log("Final details:", details);
      setCurrentOrder(order);
      setTableOrders([order]);

      // Xử lý details
      const validDetails = (details || []).filter(d => {
        const detailStatus = d.status || d.Status || "";
        return detailStatus !== "Đã hủy";
      });
      
      console.log("Valid details:", validDetails);
      
      setOrderDetails(validDetails.map(d => ({
        ...d,
        detailId: d.detailId || d.DetailId,
        productName: d.product?.name || d.Product?.Name || d.productName || "?",
        productPrice: d.product?.price || d.Product?.Price || d.productPrice || 0
      })));

      // Lấy Bill
      if (order.bill || order.Bill) {
        setCurrentBill(order.bill || order.Bill);
      } else {
        setCurrentBill(null);
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
    const orderId = currentOrder.orderId || currentOrder.OrderId;
    if (!orderId) {
      showNotice("Không tìm thấy ID đơn hàng", false);
      return;
    }
    setLoading(true);
    try {
      await api.post(`/Order/${orderId}/details`, {
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
  // 4. XÓA MÓN
  // =============================================
  async function removeItem(detailId) {
    if (!currentOrder) return;
    const orderId = currentOrder.orderId || currentOrder.OrderId;
    if (!orderId) return;
    if (!window.confirm("Xóa món này khỏi đơn?")) return;
    
    try {
      await api.delete(`/Order/${orderId}/details/${detailId}`);
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
      setViewMode("order");
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
      setViewMode("order");
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
      setViewMode("order");
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
    const orderId = currentOrder.orderId || currentOrder.OrderId;
    if (!orderId) return;
    try {
      // Tạo bill trước nếu chưa có
      let bill = currentOrder.bill || currentOrder.Bill;
      if (!bill) {
        const billRes = await api.post("/Bill", { 
          OrderId: orderId, 
          Discount: 0,
          UserId: user?.userId || null,
          UserName: user?.fullName || user?.username || null
        });
        bill = billRes.data;
      }
      await api.post(`/Order/${orderId}/request-payment`);
      showNotice("Đã chuyển sang chờ thanh toán");
      setShowPaymentModal(true);
      setCurrentBill(bill);
      // Reload bill để lấy thông tin mới nhất
      const billRefresh = await api.get(`/Bill/${bill.billId || bill.BillId}`);
      setCurrentBill(billRefresh.data);
      setDiscount(billRefresh.data.discount || 0);
      await fetchData();
    } catch (e) {
      showNotice("Lỗi: " + formatApiError(e), false);
    }
  }

  // =============================================
  // 9. ÁP DỤNG GIẢM GIÁ
  // =============================================
  async function applyDiscount() {
    if (!currentBill) {
      showNotice("Chưa có hóa đơn. Nhấn 'Tính tiền' trước.", false);
      return;
    }
    const billId = currentBill.billId || currentBill.BillId;
    if (!billId) {
      showNotice("Không tìm thấy ID hóa đơn", false);
      return;
    }
    if (discount < 0) {
      showNotice("Giảm giá không được âm", false);
      return;
    }
    try {
      const res = await api.put(`/Bill/${billId}/discount`, { Discount: discount });
      showNotice("Đã áp dụng giảm giá");
      // Reload bill
      const billRes = await api.get(`/Bill/${billId}`);
      setCurrentBill(billRes.data);
    } catch (e) {
      showNotice("Lỗi: " + formatApiError(e), false);
    }
  }

  // =============================================
  // 10. THANH TOÁN
  // =============================================
  async function handlePayment(amountPaid) {
    if (!currentBill) return;
    const billId = currentBill.billId || currentBill.BillId;
    if (!billId) return;
    
    const finalAmount = (currentBill.totalAmount || currentBill.TotalAmount || 0) - discount;
    
    if (amountPaid < finalAmount) {
      showNotice(`Số tiền không đủ. Cần: ${formatMoney(finalAmount)}`, false);
      return;
    }

    try {
      const res = await api.post(`/Bill/${billId}/pay`, {
        AmountPaid: amountPaid,
        PaymentMethod: paymentMethod
      });
      showNotice(`Thanh toán thành công! Tiền thối: ${formatMoney(res.data.changeAmount)}`);
      setShowPaymentModal(false);
      setSelectedTable(null);
      setCurrentOrder(null);
      setCurrentBill(null);
      setOrderDetails([]);
      setViewMode("order");
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
    const orderId = currentOrder.orderId || currentOrder.OrderId;
    if (!orderId) return;
    const reason = window.prompt("Lý do hủy đơn:");
    if (!reason) return;
    
    try {
      await api.post(`/Order/${orderId}/cancel`, { Reason: reason });
      showNotice("Đã hủy đơn");
      setSelectedTable(null);
      setCurrentOrder(null);
      setOrderDetails([]);
      setViewMode("order");
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

  const totalAmount = orderDetails.reduce((sum, d) => {
    const price = d.productPrice || d.Product?.Price || d.product?.price || 0;
    return sum + (d.quantity || d.Quantity || 1) * price;
  }, 0);
  const finalAmount = totalAmount - discount;

  const availableTables = tables.filter(t => {
    const tableStatus = t.status || t.Status || "";
    return tableStatus === "Trống" && t.tableId !== selectedTable?.tableId;
  });
      const occupiedTables = tables.filter(t => {
        const tableStatus = t.status || t.Status || "";
        return tableStatus === "Đang phục vụ";
      });

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
            const tableStatus = t.status || t.Status || "";
            const isAvailable = tableStatus === "Trống";
            const tableOrder = allOrders.find(o => {
              const orderStatus = o.status || o.Status || "";
              return String(o.tableId || o.TableId) === String(t.tableId || t.TableId) && (orderStatus === "Đang phục vụ" || orderStatus === "pending");
            });
            const orderItems = tableOrder ? (tableOrder.OrderDetails || tableOrder.orderDetails || []) : [];
            const totalAmount = orderItems.reduce((sum, item) => {
              const price = item.productPrice || item.Product?.Price || item.product?.price || 0;
              return sum + (item.quantity || item.Quantity || 1) * price;
            }, 0);
            
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
                
                {/* Hiển thị món và giá tiền */}
                {!isAvailable && orderItems.length > 0 && (
                  <div style={{ marginTop: 8, fontSize: 12 }}>
                    {orderItems.slice(0, 2).map((item, idx) => (
                      <div key={idx} style={{ color: "#ccc", marginBottom: 2 }}>
                        • {item.Product?.Name || item.Product?.name || item.productName || "Món"} x{item.quantity || item.Quantity || 1}
                      </div>
                    ))}
                    {orderItems.length > 2 && (
                      <div style={{ color: "#888" }}>+{orderItems.length - 2} món khác</div>
                    )}
                    {totalAmount > 0 && (
                      <div style={{ marginTop: 6, fontWeight: 700, color: "#4caf50", fontSize: 14 }}>
                        {formatMoney(totalAmount)}
                      </div>
                    )}
                  </div>
                )}
                
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

              {/* QR Code cho chuyển khoản */}
              {paymentMethod === "Chuyển khoản" && (
                <div style={{ marginBottom: 16, padding: 16, background: "#fff", borderRadius: 8, textAlign: "center", border: "1px solid #ddd" }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>Quét mã QR để thanh toán</div>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
                    <QRCodeSVG value={`vietqr://9703/9302092004/${finalAmount}/Thanh toan ban`} size={220} />
                  </div>
                  <div style={{ fontSize: 13, color: "#333", marginTop: 12 }}>
                    <strong>Ngân hàng:</strong> Techcombank<br />
                    <strong>STK:</strong> 9302092004<br />
                    <strong>Tên:</strong> Nguyen Vo Anh Kiet<br />
                    <strong>Số tiền:</strong> {formatMoney(finalAmount)}
                  </div>
                </div>
              )}

              {/* QR Code cho ví điện tử */}
              {paymentMethod === "Ví điện tử" && (
                <div style={{ marginBottom: 16, padding: 16, background: "#fff", borderRadius: 8, textAlign: "center", border: "1px solid #ddd" }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>Quét mã QR MoMo để thanh toán</div>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
                    <QRCodeSVG value={`vietqr://9703/9302092004/${finalAmount}/Thanh toan ban`} size={220} />
                  </div>
                  <div style={{ fontSize: 13, color: "#333", marginTop: 12 }}>
                    <strong>Ví MoMo:</strong> 9302092004<br />
                    <strong>Tên:</strong> Nguyen Vo Anh Kiet<br />
                    <strong>Số tiền:</strong> {formatMoney(finalAmount)}
                  </div>
                </div>
              )}

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
