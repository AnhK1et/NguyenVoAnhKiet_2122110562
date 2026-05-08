import React, { useEffect, useState } from "react";
import { api, formatApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({ username: "", password: "", fullName: "", role: "Staff" });
  const [notice, setNotice] = useState({ msg: "", ok: true });

  // Kiểm tra quyền Admin
  const isAdmin = user?.role?.toLowerCase() === "admin";

  useEffect(() => {
    if (isAdmin) fetchUsers();
  }, [isAdmin]);

  async function fetchUsers() {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/User");
      setUsers(res.data);
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setLoading(false);
    }
  }

  function showNotice(msg, ok = true) {
    setNotice({ msg, ok });
    setTimeout(() => setNotice({ msg: "", ok: true }), 4000);
  }

  function openModal(userToEdit = null) {
    if (userToEdit) {
      setEditingUser(userToEdit);
      setForm({
        username: userToEdit.username || "",
        password: "",
        fullName: userToEdit.fullName || "",
        role: userToEdit.role || "Staff"
      });
    } else {
      setEditingUser(null);
      setForm({ username: "", password: "", fullName: "", role: "Staff" });
    }
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingUser(null);
    setForm({ username: "", password: "", fullName: "", role: "Staff" });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.username.trim() || !form.fullName.trim()) {
      showNotice("Vui lòng điền đầy đủ thông tin", false);
      return;
    }
    if (!editingUser && !form.password.trim()) {
      showNotice("Vui lòng nhập mật khẩu", false);
      return;
    }
    if (form.password && form.password.length < 4) {
      showNotice("Mật khẩu phải có ít nhất 4 ký tự", false);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        Username: form.username.trim(),
        FullName: form.fullName.trim(),
        Role: form.role
      };
      if (form.password) {
        payload.Password = form.password;
      }

      if (editingUser) {
        await api.put(`/User/${editingUser.userId}`, payload);
        showNotice("Cập nhật thành công");
      } else {
        await api.post("/Auth/register", payload);
        showNotice("Tạo tài khoản thành công");
      }
      closeModal();
      fetchUsers();
    } catch (e) {
      showNotice(formatApiError(e), false);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(userToDelete) {
    if (!window.confirm(`Xóa tài khoản "${userToDelete.username}"?`)) return;
    try {
      await api.delete(`/User/${userToDelete.userId}`);
      showNotice("Đã xóa tài khoản");
      fetchUsers();
    } catch (e) {
      showNotice(formatApiError(e), false);
    }
  }

  // Chỉ Admin mới thấy trang này
  if (!isAdmin) {
    return (
      <div style={{ padding: 20, textAlign: "center" }}>
        <h2>Không có quyền truy cập</h2>
        <p>Chỉ quản lý mới có quyền quản lý người dùng.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Quản lý người dùng</h1>
        <button className="btn btn-main" onClick={() => openModal()}>
          + Tạo tài khoản mới
        </button>
      </div>

      {notice.msg && (
        <div className={`notice notice-${notice.ok ? "ok" : "err"}`}>
          {notice.msg}
        </div>
      )}

      {error && <div className="notice notice-err">{error}</div>}

      {loading && users.length === 0 ? (
        <p>Đang tải...</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Tài khoản</th>
              <th>Họ tên</th>
              <th>Vai trò</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.userId}>
                <td>{u.userId}</td>
                <td><b>{u.username}</b></td>
                <td>{u.fullName || "—"}</td>
                <td>
                  <span className={`pill ${u.role?.toLowerCase() === "admin" ? "pill-ok" : "pill-busy"}`}>
                    {u.role === "Admin" ? "Quản lý" : "Nhân viên"}
                  </span>
                </td>
                <td>
                  <button className="btn btn-sm" onClick={() => openModal(u)}>Sửa</button>{" "}
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(u)}>Xóa</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Modal Tạo/Sửa User */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingUser ? "Sửa tài khoản" : "Tạo tài khoản mới"}</h3>
              <button className="btn-close" onClick={closeModal}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>Họ và tên *</label>
                <input
                  className="input"
                  type="text"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="Nhập họ và tên"
                />
              </div>
              <div className="field">
                <label>Tài khoản *</label>
                <input
                  className="input"
                  type="text"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="Tên đăng nhập"
                  disabled={!!editingUser}
                />
              </div>
              <div className="field">
                <label>Mật khẩu {editingUser ? "(bỏ trống nếu không đổi)" : "*"}</label>
                <input
                  className="input"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder={editingUser ? "Bỏ trống nếu giữ nguyên" : "Nhập mật khẩu"}
                />
              </div>
              <div className="field">
                <label>Vai trò</label>
                <select
                  className="input"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="Staff">Nhân viên</option>
                  <option value="Admin">Quản lý</option>
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn" onClick={closeModal}>Hủy</button>
                <button type="submit" className="btn btn-main" disabled={loading}>
                  {loading ? "Đang xử lý..." : editingUser ? "Cập nhật" : "Tạo mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
