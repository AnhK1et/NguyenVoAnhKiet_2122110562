import React, { useEffect, useMemo, useState } from "react";
import { api, formatApiError, getFirst, normalizeListPayload } from "../api/client";

function formatMoney(v) {
  return Number(v || 0).toLocaleString("vi-VN") + " đ";
}

export default function MenuPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState({ msg: "", ok: true });
  const [q, setQ] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [editProduct, setEditProduct] = useState(null);

  // Form state
  const [form, setForm] = useState({ name: "", price: "", categoryId: "" });
  const [saving, setSaving] = useState(false);

  function showNotice(msg, ok = true) {
    setNotice({ msg, ok });
    setTimeout(() => setNotice({ msg: "", ok: true }), 4000);
  }

  const filtered = useMemo(() => {
    let list = products;
    if (filterCat) list = list.filter((p) => String(p.categoryId) === filterCat);
    const needle = q.trim().toLowerCase();
    if (needle) list = list.filter((p) => String(p.name ?? "").toLowerCase().includes(needle));
    return list;
  }, [products, filterCat, q]);

  async function fetchData() {
    setLoading(true);
    setError("");
    try {
      const [resProducts, resCategories] = await Promise.allSettled([
        getFirst(["/Product", "/product"]),
        getFirst(["/Category", "/category"]),
      ]);
      
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
    } catch (e) {
      setError("Không tải được dữ liệu: " + formatApiError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  function fillForm(p) {
    setEditProduct(p);
    setForm({
      name: p.name || "",
      price: p.price ?? "",
      categoryId: p.categoryId ?? "",
    });
  }

  function clearForm() {
    setEditProduct(null);
    const defaultCat = categories.length > 0 ? categories[0].categoryId : "";
    setForm({ name: "", price: "", categoryId: defaultCat });
  }

  async function saveProduct() {
    if (!form.name.trim()) return showNotice("Vui lòng nhập tên sản phẩm.", false);
    if (!form.categoryId) return showNotice("Vui lòng chọn danh mục!", false);
    if (!form.price || Number(form.price) <= 0) return showNotice("Vui lòng nhập giá hợp lệ!", false);
    
    setSaving(true);
    try {
      if (editProduct) {
        await api.put(`/Product/${editProduct.productId}`, {
          productId: Number(editProduct.productId),
          name: form.name.trim(),
          price: Number(form.price),
          categoryId: Number(form.categoryId)
        });
      } else {
        await api.post("/Product", {
          name: form.name.trim(),
          price: Number(form.price),
          categoryId: Number(form.categoryId)
        });
      }
      showNotice(editProduct ? "Đã cập nhật sản phẩm!" : "Đã thêm sản phẩm mới!");
      clearForm();
      await fetchData();
    } catch (e) {
      showNotice("Lỗi: " + formatApiError(e), false);
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(id) {
    if (!window.confirm("Xóa sản phẩm này?")) return;
    try {
      await api.delete(`/Product/${id}`);
      showNotice("Đã xóa sản phẩm.");
      if (editProduct?.productId === id) clearForm();
      await fetchData();
    } catch (e) {
      showNotice("Lỗi xóa: " + formatApiError(e), false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Sản phẩm</h1>
          <div className="page-subtitle">{products.length} món trong thực đơn</div>
        </div>
        <div className="page-actions">
          <div className="field" style={{ flex: "none" }}>
            <select
              className="input"
              style={{ width: "auto", minWidth: 150 }}
              value={filterCat}
              onChange={(e) => setFilterCat(e.target.value)}
            >
              <option value="">Tất cả danh mục</option>
              {categories.map((c) => (
                <option key={c.categoryId} value={c.categoryId}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="field" style={{ flex: "none" }}>
            <input
              className="input"
              style={{ minWidth: 200 }}
              placeholder="Tìm món..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
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
        {/* Table */}
        <div className="section-card">
          <div className="section-head">
            <div>
              <div className="section-title">Danh sách sản phẩm</div>
              <div className="section-sub">{filtered.length} món</div>
            </div>
            <button className="btn btn-main" onClick={clearForm}>+ Thêm món</button>
          </div>
          <div className="section-body">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 60 }}>ID</th>
                    <th>Tên</th>
                    <th style={{ width: 140, textAlign: "right" }}>Giá</th>
                    <th style={{ width: 140 }}>Danh mục</th>
                    <th style={{ width: 120 }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.productId}>
                      <td>#{p.productId}</td>
                      <td style={{ fontWeight: 700 }}>{p.name}</td>
                      <td style={{ textAlign: "right", fontWeight: 800 }}>{formatMoney(p.price)}</td>
                      <td><span className="badge">{p.category?.name || p.categoryId || "—"}</span></td>
                      <td className="actions">
                        <button className="btn btn-ghost" onClick={() => fillForm(p)}>Sửa</button>
                        <button className="btn btn-danger" style={{ padding: "7px 10px" }} onClick={() => deleteProduct(p.productId)}>Xóa</button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={5}><div className="empty">Không có sản phẩm phù hợp.</div></td></tr>
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
              <div className="section-title">{editProduct ? "Cập nhật sản phẩm" : "Thêm sản phẩm mới"}</div>
              <div className="section-sub">Điền thông tin và lưu</div>
            </div>
            {editProduct && (
              <button className="btn btn-ghost" onClick={clearForm}>Hủy</button>
            )}
          </div>
          <div className="section-body">
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="field">
                <label>Tên sản phẩm</label>
                <input
                  className="input"
                  placeholder="VD: Cà phê sữa"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="form-grid">
                <div className="field">
                  <label>Giá (VNĐ)</label>
                  <input
                    className="input"
                    type="number"
                    placeholder="38000"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Danh mục</label>
                  <select
                    className="input"
                    value={form.categoryId}
                    onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  >
                    <option value="">— Chọn danh mục —</option>
                    {categories.map((c) => (
                      <option key={c.categoryId} value={c.categoryId}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-actions">
                <button className="btn btn-main" onClick={saveProduct} disabled={saving}>
                  {saving ? "Đang lưu..." : editProduct ? "Cập nhật" : "Thêm mới"}
                </button>
                <button className="btn btn-ghost" onClick={clearForm}>Xóa form</button>
              </div>
              <div className="footer-note">
                API: <code>POST /Product</code> (thêm) · <code>PUT /Product/{`{id}`}</code> (sửa) · <code>DELETE /Product/{`{id}`}</code> (xóa)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
