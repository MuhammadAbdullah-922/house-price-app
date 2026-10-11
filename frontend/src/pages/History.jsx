import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { errMsg, usd } from "../api.js";

export default function History() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "History | House Price Predictor";
    api.get("/predictions").then((r) => setRows(r.data)).catch((e) => setError(errMsg(e)));
  }, []);

  const remove = async (id) => {
    try {
      await api.delete(`/predictions/${id}`);
      setRows(rows.filter((r) => r.id !== id));
    } catch (e) { setError(errMsg(e)); }
  };

  return (
    <>
      <h1>History</h1>
      <p className="muted">Your last 100 estimates.</p>
      {error && <p className="err" role="alert">{error}</p>}
      <section className="card">
        {rows === null ? <p className="muted">Loading…</p> : rows.length === 0 ? (
          <p className="muted">No estimates yet. <Link to="/predict">Make your first one.</Link></p>
        ) : (
          <div className="scroll">
            <table>
              <thead><tr><th>Quality</th><th>Area</th><th>Garage</th><th>Basement</th><th>Baths</th><th>Year</th><th>Estimate</th><th>Time</th><th></th></tr></thead>
              <tbody>
                {rows.map((h) => (
                  <tr key={h.id}>
                    <td>{h.OverallQual}</td><td>{h.GrLivArea}</td><td>{h.GarageCars}</td>
                    <td>{h.TotalBsmtSF}</td><td>{h.FullBath}</td><td>{h.YearBuilt}</td>
                    <td><b>{usd(h.price)}</b></td><td>{new Date(h.created).toLocaleString()}</td>
                    <td><button className="linkbtn" onClick={() => remove(h.id)}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}