import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell,
  AreaChart, Area, ScatterChart, Scatter, CartesianGrid,
} from "recharts";
import api, { errMsg, usd } from "../api.js";

const tip = { contentStyle: { background: "#14123a", border: "1px solid #2a2766", borderRadius: 8, color: "#e8e6ff" } };
const ax = { stroke: "#9a97c9", fontSize: 12 };
const k = (v) => Math.round(v / 1000) + "k";

function Chart({ title, note, children }) {
  return (
    <section className="card">
      <h2>{title}</h2>
      <div className="chart">{children}</div>
      {note && <p className="muted small">{note}</p>}
    </section>
  );
}

export default function Dashboard() {
  const [d, setD] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Dashboard | House Price Predictor";
    api.get("/dashboard").then((r) => setD(r.data)).catch((e) => setError(errMsg(e)));
  }, []);

  if (error) return <p className="err" role="alert">{error}</p>;
  if (!d) return <p className="muted">Loading dashboard…</p>;

  const { user, model: m } = d;
  const hasModel = m && m.models;
  const nn = hasModel ? m.models["Neural Network"] : null;

  const models = hasModel ? Object.entries(m.models).map(([name, v]) => ({ name, mae: Math.round(v.mae) })) : [];
  const imp = hasModel ? Object.entries(m.importance).map(([name, v]) => ({ name, v: +v.toFixed(1) })).sort((a, b) => b.v - a.v) : [];
  const hist = hasModel ? m.price_hist.counts.map((c, i) => ({ range: k(m.price_hist.edges[i]), count: c })) : [];
  const series = user.series.map((s, i) => ({ n: i + 1, price: Math.round(s.price) }));

  const stats = [
    { l: "Your estimates", v: user.count },
    { l: "Average estimate", v: user.count ? usd(user.avg) : "-" },
    { l: "Highest estimate", v: user.count ? usd(user.max) : "-" },
    { l: "Model R² (validation)", v: nn ? nn.r2.toFixed(3) : "-" },
  ];

  return (
    <>
      <div className="row">
        <div><h1>Dashboard</h1><p className="muted">Your activity and how the model performs.</p></div>
        <Link className="btn" to="/predict">New prediction</Link>
      </div>

      <div className="grid four">
        {stats.map((s) => <div className="card stat" key={s.l}><span className="muted">{s.l}</span><b>{s.v}</b></div>)}
      </div>

      <div className="grid three">
        <Chart title="Your estimates over time" note={user.count ? "Your last 20 estimates." : "Make an estimate to see this chart."}>
          <ResponsiveContainer>
            <AreaChart data={series}>
              <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ec4899" stopOpacity={0.6} /><stop offset="100%" stopColor="#ec4899" stopOpacity={0} /></linearGradient></defs>
              <XAxis dataKey="n" {...ax} /><YAxis {...ax} tickFormatter={k} width={40} />
              <Tooltip {...tip} formatter={(v) => usd(v)} labelFormatter={(n) => `Estimate ${n}`} />
              <Area dataKey="price" stroke="#ec4899" fill="url(#g)" />
            </AreaChart>
          </ResponsiveContainer>
        </Chart>

        {hasModel ? (
          <>
            <Chart title="Model accuracy (R²)" note={`Test set R²: ${m.test.r2.toFixed(3)}`}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={[{ v: nn.r2 }, { v: 1 - nn.r2 }]} dataKey="v" innerRadius="65%" outerRadius="85%" startAngle={90} endAngle={-270} stroke="none">
                    <Cell fill="#ec4899" /><Cell fill="#2a2766" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-label"><b>{(nn.r2 * 100).toFixed(1)}%</b><span className="muted small">of price variation explained</span></div>
            </Chart>

            <Chart title="Average error by model" note="Lower is better (validation set).">
              <ResponsiveContainer>
                <BarChart data={models}>
                  <XAxis dataKey="name" {...ax} /><YAxis {...ax} tickFormatter={k} width={40} />
                  <Tooltip {...tip} formatter={(v) => usd(v)} />
                  <Bar dataKey="mae" fill="#a855f7" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Chart>

            <Chart title="What drives the price" note="Share of the model's accuracy each feature carries (permutation importance).">
              <ResponsiveContainer>
                <BarChart data={imp} layout="vertical" margin={{ left: 20 }}>
                  <XAxis type="number" {...ax} unit="%" /><YAxis type="category" dataKey="name" {...ax} width={90} />
                  <Tooltip {...tip} formatter={(v) => v + "%"} />
                  <Bar dataKey="v" fill="#7c3aed" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Chart>

            <Chart title="Price distribution" note="Sale prices in the training data.">
              <ResponsiveContainer>
                <BarChart data={hist}>
                  <XAxis dataKey="range" {...ax} /><YAxis {...ax} width={30} />
                  <Tooltip {...tip} />
                  <Bar dataKey="count" fill="#c026d3" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Chart>

            <Chart title="Actual vs predicted" note="Each dot is a house the model had not seen. Closer to the diagonal is better.">
              <ResponsiveContainer>
                <ScatterChart>
                  <CartesianGrid stroke="#2a2766" />
                  <XAxis type="number" dataKey="actual" name="Actual" {...ax} tickFormatter={k} />
                  <YAxis type="number" dataKey="pred" name="Predicted" {...ax} tickFormatter={k} width={40} />
                  <Tooltip {...tip} formatter={(v) => usd(v)} />
                  <Scatter data={m.scatter} fill="#ec4899" />
                </ScatterChart>
              </ResponsiveContainer>
            </Chart>
          </>
        ) : (
          <section className="card" style={{ gridColumn: "span 2" }}>
            <h2>Model insights not loaded</h2>
            <p className="muted">Run the metrics export cell in your notebook, then restart the backend. This fills in the accuracy, importance and distribution charts.</p>
          </section>
        )}
      </div>
    </>
  );
}