CREATE VIEW IF NOT EXISTS inventory_valuation AS
SELECT
  i.id AS item_id,
  i.sku,
  i.name,
  i.unit_of_measure,
  i.valuation_method,
  i.on_hand_qty AS quantity,
  i.avg_unit_cost AS avg_cost,
  ROUND(i.on_hand_qty * i.avg_unit_cost, 2) AS total_value,
  i.updated_at
FROM inventory_items i;
