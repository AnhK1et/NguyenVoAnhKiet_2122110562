import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("nom_user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem("nom_user");
      }
    }
    setLoading(false);
  }, []);

  async function login(username, password) {
    const res = await api.post("/Auth/login", { Username: username, Password: password });
    const { token, username: name, role } = res.data;
    const userData = { username: name, role, token };
    setUser(userData);
    localStorage.setItem("nom_user", JSON.stringify(userData));
    // Update api headers for all future requests
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    return userData;
  }

  function logout() {
    setUser(null);
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
  return useContext(AuthContext);
}
