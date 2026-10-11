import { lazy, Suspense, useState } from "react";
import { Routes, Route, Navigate, NavLink, Outlet, useNavigate } from "react-router-dom";

const Login = lazy(() => import("./pages/Login.jsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const Predict = lazy(() => import("./pages/Predict.jsx"));
const History = lazy(() => import("./pages/History.jsx"));

const readUser = () => {
  try {
    return localStorage.getItem("hp_token") ? JSON.parse(localStorage.getItem("hp_user")) : null;
  } catch { return null; }
};

function Layout({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <div className="app">
      <aside className={"side" + (open ? " open" : "")}>
        <div className="brand"><span className="logo">⌂</span><b>House Price<br />Prediction</b></div>
        <nav onClick={close} aria-label="Main">
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/predict">Predict price</NavLink>
          <NavLink to="/history">History</NavLink>
        </nav>
        <button className="ghost" onClick={onLogout}>Log out</button>
      </aside>
      {open && <div className="scrim" onClick={close} />}
      <div className="main">
        <header className="top">
          <button className="burger" aria-label="Open menu" onClick={() => setOpen(true)}>☰</button>
          <div className="who"><span className="avatar">{user.name[0].toUpperCase()}</span>{user.name}</div>
        </header>
        <main><Outlet /></main>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(readUser);
  const navigate = useNavigate();

  const login = ({ token, user }) => {
    localStorage.setItem("hp_token", token);
    localStorage.setItem("hp_user", JSON.stringify(user));
    setUser(user);
    navigate("/");
  };
  const logout = () => {
    localStorage.removeItem("hp_token");
    localStorage.removeItem("hp_user");
    setUser(null);
    navigate("/login");
  };

  return (
    <Suspense fallback={<div className="splash">Loading…</div>}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login onLogin={login} />} />
        <Route element={user ? <Layout user={user} onLogout={logout} /> : <Navigate to="/login" />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/predict" element={<Predict />} />
          <Route path="/history" element={<History />} />
        </Route>
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Suspense>
  );
}