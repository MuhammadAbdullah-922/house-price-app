import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { errMsg, usd } from "../api.js";

const FIELDS = [
  { k: "OverallQual", label: "Overall quality (1 to 10)", min: 1, max: 10, step: 1 },
  { k: "GrLivArea", label: "Living area (sq ft)", min: 300, max: 6000, step: 10 },
  { k: "GarageCars", label: "Garage capacity (cars)", min: 0, max: 4, step: 1 },
  { k: "TotalBsmtSF", label: "Basement area (sq ft)", min: 0, max: 4000, step: 10 },
  { k: "FullBath", label: "Full bathrooms", min: 0, max: 4, step: 1 },
  { k: "YearBuilt", label: "Year built", min: 1870, max: 2030, step: 1 },
];
const DEFAULTS = { OverallQual: 7, GrLivArea: 1800, GarageCars: 2, TotalBsmtSF: 1000, FullBath: 2, YearBuilt: 2000 };

export default function Predict() {
  const [form, setForm] = useState(DEFAULTS);
  const [res, setRes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { document.title = "Predict price | House Price Predictor"; }, []);

  const submit = async (e) => {
    e.preventDefault();
    for (const f of FIELDS) {
      const v = Number(form[f.k]);
      if (form[f.k] === "" || v < f.min || v > f.max)
        return setError(`${f.label} must be between ${f.min} and ${f.max}.`);
    }
    setError(""); setLoading(true); setRes(null);
    try {
      const body = Object.fromEntries(FIELDS.map((f) => [f.k, Number(form[f.k])]));
      const { data } = await api.post("/predict", body);
      setRes(data);
    } catch (err) { setError(errMsg(err)); }
    finally { setLoading(false); }
  };

  return (
    <>
      <h1>Predict price</h1>
      <p className="muted">Enter the house details. Every estimate is saved to your history.</p>
      <div className="grid two">
        <form className="card" onSubmit={submit} noValidate>
          <div className="fields">
            {FIELDS.map((f) => (
              <label key={f.k}>{f.label}
                <input type="number" inputMode="numeric" min={f.min} max={f.max} step={f.step}
                  value={form[f.k]} onChange={(e) => setForm({ ...form, [f.k]: e.target.value })} />
              </label>
            ))}
          </div>
          {error && <p className="err" role="alert">{error}</p>}
          <button className="btn" disabled={loading}>{loading ? "Estimating…" : "Estimate price"}</button>
        </form>

        <section className="card result" aria-live="polite">
          {!res ? <p className="muted">Your estimate will appear here.</p> : (
            <>
              <span className="muted">Estimated price</span>
              <div className="big">{usd(res.predicted_price)}</div>
              {res.mae && <p>Likely range: <b>{usd(res.predicted_price - res.mae)}</b> to <b>{usd(res.predicted_price + res.mae)}</b></p>}
              <p className="muted small">The range is the model's average error on houses it had not seen. This is an estimate, not an appraisal.</p>
              <Link to="/history">View in history</Link>
            </>
          )}
        </section>
      </div>
    </>
  );
}