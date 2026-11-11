import { money } from "../tutor/workspace/data.js";

export default function TransferAccountSummary({
  label,
  recipient,
  amount,
  account,
  loading,
}) {
  return (
    <dl className="ap-payout-account">
      <dt>{label}</dt>
      <dd>{recipient}</dd>
      <dt>Amount to transfer</dt>
      <dd className="font-semibold text-green-800">{money(amount)}</dd>
      <dt>GCash account name</dt>
      <dd>{loading ? "Loading..." : account?.name || "Not provided"}</dd>
      <dt>GCash number</dt>
      <dd>{loading ? "Loading..." : account?.number || "Not provided"}</dd>
    </dl>
  );
}
