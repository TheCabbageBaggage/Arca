import KPICard from "./KPICard.jsx";

export default function DashboardGrid({ kpis }) {
  return (
    <section className="dashboard-grid">
      {kpis.map((item) => (
        <KPICard key={item.key} label={item.label} value={item.value} trend={item.trend} color={item.color} />
      ))}
    </section>
  );
}
