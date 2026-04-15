function formatMoney(value) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR" }).format(Number(value || 0));
}

export default function AlertsPanel({ alerts }) {
  const items = [
    { label: "Pending approvals", value: alerts?.pending_approvals ?? 0, tone: "warn", money: false },
    { label: "Overdue AR", value: alerts?.overdue_ar ?? 0, tone: "danger", money: true },
    { label: "Critical AP (<=3d)", value: alerts?.critical_ap ?? 0, tone: "danger", money: true }
  ];

  return (
    <section className="alerts-panel">
      <h3>Operational alerts</h3>
      <div className="alerts-panel__list">
        {items.map((item) => (
          <article key={item.label} className={`alert-item alert-item--${item.tone}`}>
            <span>{item.label}</span>
            <strong>{item.money ? formatMoney(item.value) : item.value}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}
