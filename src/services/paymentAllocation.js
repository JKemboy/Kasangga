// Legacy database columns retain their historical names; normalize their meaning here.
export function normalizeAllocation(record = {}, gross = 0) {
  const amount = (value) =>
    Number.isFinite(Number(value)) ? Number(value) : 0;
  const admin = amount(
    record.admin ??
      record.admin_amount ??
      record.oswe ??
      record.osas ??
      record.osas_amount,
  );
  const maintenance = amount(
    record.maintenance ??
      record.maintenance_amount ??
      record.platform_amount ??
      record.platform,
  );
  return {
    gross: amount(record.gross ?? gross),
    tutor: amount(record.tutor ?? record.tutor_amount),
    admin,
    maintenance,
    platform: amount(
      record.platformTotal ??
        record.platform_total_amount ??
        (record.maintenance != null
          ? (record.platform ?? admin + maintenance)
          : admin + maintenance),
    ),
  };
}
