export default function KPICard({ label, value, trend, color = "default" }) {
  return (
    <article className={`kpi-card kpi-card--${color}`}>
      <p className="kpi-card__label">{label}</p>
      <strong className="kpi-card__value">{value}</strong>
      {trend ? <span className="kpi-card__trend">{trend}</span> : null}
    </article>
  );
}
