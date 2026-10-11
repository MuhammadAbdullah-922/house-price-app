import { useEffect, useState } from "react";
import api, { errMsg } from "../api.js";

export default function Login({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { document.title = "Log in | House Price Predictor"; }, []);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (mode === "signup" && form.name.trim().length < 2) return setError("Enter your name.");
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setError("Enter a valid email address.");
    if (form.password.length < 6) return setError("Password must be at least 6 characters.");
    setError(""); setBusy(true);
    try {
      const body = mode === "signup" ? form : { email: form.email, password: form.password };
      const { data } = await api.post(`/auth/${mode}`, body);
      onLogin(data);
    } catch (err) { setError(errMsg(err)); }
    finally { setBusy(false); }
  };

  return (
    <div className="login">
      <section className="login-hero">
        <h1>Know what a house is worth in seconds.</h1>
        <p>A neural network trained on real house sales estimates the price from six simple details, and your dashboard learns from every estimate you make.</p>
        <ul>
          <li>Private account with saved history</li>
          <li>Live model accuracy and feature insights</li>
          <li>Built with Keras, FastAPI and React</li>
        </ul>
      </section>
      <form className="card login-card" onSubmit={submit} noValidate>
        <div className="tabs" role="tablist">
          <button type="button" className={mode === "login" ? "on" : ""} onClick={() => setMode("login")}>Log in</button>
          <button type="button" className={mode === "signup" ? "on" : ""} onClick={() => setMode("signup")}>Sign up</button>
        </div>
        {mode === "signup" && (
          <label>Name<input value={form.name} onChange={set("name")} placeholder="Your name" autoComplete="name" /></label>
        )}
        <label>Email<input type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" autoComplete="email" /></label>
        <label>Password<input type="password" value={form.password} onChange={set("password")} placeholder="At least 6 characters" autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>
        {error && <p className="err" role="alert">{error}</p>}
        <button className="btn" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}</button>
      </form>
    </div>
  );
}