import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "./client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // { username, role }
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("nom_user");
    if (saved) {
      try { setUser(JSON.parse(saved)); } catch { localStorage.removeItem("nom_user"); }
    }
    const savedToken = localStorage.getItem("nom_token");
    if (savedToken) {
      api.defaults.headers.common["Authorization"] = `Bearer ${savedToken}`;
    }
    setLoading(false);
  }, []);

  async function login(username, password) {
    const res = await api.post("/Auth/login", { username, password });
    const { token, username: uname, role } = res.data;
    const userData = { username: uname, role };
    setUser(userData);
    localStorage.setItem("nom_token", token);
    localStorage.setItem("nom_user", JSON.stringify(userData));
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    return role;
  }

  function logout() {
    setUser(null);
    localStorage.removeItem("nom_token");
    localStorage.removeItem("nom_user");
    delete api.defaults.headers.common["Authorization"];
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
