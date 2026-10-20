import {
  CalendarCheck,
  ChartNoAxesCombined,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  Eye,
  History,
  Info,
  Wallet,
} from "lucide-react";
const transactions = [
  [
    "May 13, 2025",
    "Maria Angela R.",
    "MA",
    "Calculus 1",
    "#BKG-2025-0512-001",
    400,
    "Paid",
  ],
  [
    "May 12, 2025",
    "Mark Joseph P.",
    "MJ",
    "Physics 1",
    "#BKG-2025-0512-002",
    400,
    "Paid",
  ],
  [
    "May 11, 2025",
    "Rianne Kate L.",
    "RK",
    "Programming (Python)",
    "#BKG-2025-0511-001",
    675,
    "Paid",
  ],
  [
    "May 10, 2025",
    "Allen Ezra M.",
    "AE",
    "Statistics",
    "#BKG-2025-0510-001",
    400,
    "Pending",
  ],
  [
    "May 9, 2025",
    "Lyla Shane B.",
    "LS",
    "Linear Algebra",
    "#BKG-2025-0509-002",
    675,
    "Processing",
  ],
];
const months = [
  "Dec 2024",
  "Jan 2025",
  "Feb 2025",
  "Mar 2025",
  "Apr 2025",
  "May 2025",
];
const values = [2000, 3000, 2300, 4000, 3400, 4350];
const money = (value) =>
  `₱${value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const panel = "rounded-lg border border-[#e4e8ef] bg-white p-3";
const control =
  "h-7 rounded-md border border-[#e4e8ef] bg-white px-3 text-[10px] font-semibold";
function EarningsChart() {
  return (
    <div className="mt-1 overflow-x-auto">
      <svg
        viewBox="0 0 760 200"
        role="img"
        aria-labelledby="earnings-chart-title"
        className="h-[clamp(120px,22dvh,175px)] w-full min-w-[420px]"
      >
        <title id="earnings-chart-title">
          Monthly earnings: December 2024 2000 pesos, January 2025 3000,
          February 2300, March 4000, April 3400, May 4350.
        </title>
        <defs>
          <linearGradient id="tutor-earnings-bar">
            <stop stopColor="#08752e" />
            <stop offset="1" stopColor="#00451c" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4, 5, 6].map((tick) => (
          <g key={tick}>
            <text x="0" y={175 - tick * 25} fontSize="8" fill="#45516e">
              {tick === 0 ? "₱0" : `₱${tick}K`}
            </text>
            <text
              x="748"
              y={175 - tick * 25}
              textAnchor="end"
              fontSize="8"
              fill="#45516e"
            >
              {tick * 10}
            </text>
          </g>
        ))}
        <line x1="30" y1="172" x2="729" y2="172" stroke="#edf0f4" />
        {values.map((value, i) => (
          <g key={months[i]}>
            <rect
              x={61 + i * 115}
              y={172 - (value / 6000) * 150}
              width="34"
              height={(value / 6000) * 150}
              rx="1"
              fill="url(#tutor-earnings-bar)"
            />
            <text
              x={78 + i * 115}
              y="190"
              textAnchor="middle"
              fontSize="8"
              fill="#253455"
            >
              {months[i]}
            </text>
          </g>
        ))}
        <polyline
          points={values
            .map((value, i) => `${78 + i * 115},${172 - (value / 6000) * 150}`)
            .join(" ")}
          fill="none"
          stroke="#167b2c"
          strokeWidth="1.5"
        />
        {values.map((value, i) => (
          <circle
            key={i}
            cx={78 + i * 115}
            cy={172 - (value / 6000) * 150}
            r="3"
            fill="#087522"
            stroke="#6eac6d"
          />
        ))}
      </svg>
    </div>
  );
}
export default function TutorEarnings() {
  return (
    <section className="mx-auto max-w-[1550px] px-4 py-3 lg:px-5">
      <h1 className="text-2xl font-bold tracking-tight text-[#101828]">
        Earnings &amp; Payouts
      </h1>
      <p className="mt-1 text-xs font-medium text-[#45516e]">
        Track your earnings, transactions, and payout history.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {[
          [Wallet, "₱18,450", "Total Earnings", "All time"],
          [CreditCard, "₱12,250", "Paid Earnings", "All time"],
          [Clock3, "₱6,200", "Pending Payout", "Will be released soon"],
          [
            ChartNoAxesCombined,
            "₱4,350",
            "Earnings This Month",
            "May 1 - May 31, 2025",
          ],
          [CalendarCheck, "156", "Completed Paid Sessions", "All time"],
        ].map(([Icon, value, label, detail], index) => (
          <article key={label} className={`${panel} flex items-center gap-2`}>
            <span
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-white ${index % 2 ? "bg-amber-400" : "bg-[#00651e]"}`}
            >
              <Icon className="h-4 w-4" />
            </span>
            <div>
              <p className="text-base font-bold">{value}</p>
              <h2 className="mt-1 text-[10px] font-semibold text-[#45516e]">
                {label}
              </h2>
              <p className="mt-1 text-[9px] text-[#727c99]">{detail}</p>
            </div>
          </article>
        ))}
      </div>
      <div className="mt-3 grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_210px] xl:grid-cols-[minmax(0,1fr)_230px]">
        <div className="min-w-0 space-y-2">
          <section className={panel}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold">Earnings Overview</h2>
              <div className="flex gap-2">
                <select aria-label="Earnings period" className={control}>
                  <option>This Year</option>
                </select>
                <select aria-label="Earnings grouping" className={control}>
                  <option>Monthly</option>
                </select>
              </div>
            </div>
            <div className="mt-1 flex items-center gap-1 text-[8px] text-[#727c99]">
              <span className="h-1 w-3 rounded bg-green-800" />
              Earnings (₱)
            </div>
            <EarningsChart />
          </section>
          <section className={panel}>
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-sm font-bold">Transactions</h2>
              <div className="flex gap-2">
                <select aria-label="Filter transactions" className={control}>
                  <option>Filter</option>
                </select>
                <button type="button" className={control}>
                  View All
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[540px] table-fixed text-left text-[9px]">
                <caption className="sr-only">
                  Sample tutoring transactions
                </caption>
                <thead>
                  <tr>
                    {[
                      "Date",
                      "Student",
                      "Service / Subject",
                      "Booking ID",
                      "Gross Amount",
                      "Platform Fee (10%)",
                      "Status",
                      "Action",
                    ].map((label) => (
                      <th
                        key={label}
                        scope="col"
                        className="px-1 py-1.5 font-semibold first:pl-0"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(
                    ([date, name, initials, service, id, amount, status]) => (
                      <tr key={id}>
                        <td className="py-1.5 pr-1">{date}</td>
                        <td className="break-words px-1 py-1.5">
                          <span className="flex items-center gap-2">
                            <span
                              aria-hidden="true"
                              className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#e2ece5] text-[8px] font-semibold text-green-800"
                            >
                              {initials}
                            </span>
                            {name}
                          </span>
                        </td>
                        <td className="px-1 py-1.5">{service}</td>
                        <td className="break-words px-1 py-1.5">{id}</td>
                        <td className="px-1 py-1.5 font-semibold">
                          {money(amount)}
                        </td>
                        <td className="px-1 py-1.5 font-semibold">
                          -{money(amount * 0.1)}
                        </td>
                        <td className="px-1 py-1.5">
                          <span
                            className={`rounded px-1.5 py-0.5 font-semibold ${status === "Paid" ? "bg-green-50 text-green-800" : status === "Pending" ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"}`}
                          >
                            {status}
                          </span>
                        </td>
                        <td className="px-1 py-1.5">
                          <button
                            type="button"
                            aria-label={`View transaction ${id}`}
                            className="p-1 text-[#253455]"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </section>
          <footer className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <p className="text-[11px] font-medium text-[#45516e]">
              Showing 1 to 5 of 25 transactions
            </p>
            <nav aria-label="Transaction pages" className="flex gap-1.5">
              <button
                type="button"
                disabled
                aria-label="Previous page"
                className="grid h-7 w-7 place-items-center rounded border border-slate-100 bg-white text-slate-400"
              >
                <ChevronLeft className="h-3 w-3" />
              </button>
              {[1, 2, 3, "…", 5].map((page) =>
                page === "…" ? (
                  <span key={page} className="px-1">
                    {page}
                  </span>
                ) : (
                  <button
                    type="button"
                    key={page}
                    aria-current={page === 1 ? "page" : undefined}
                    className={`h-7 w-7 rounded border text-[10px] font-semibold ${page === 1 ? "border-green-800 bg-green-800 text-white" : "border-slate-100 bg-white"}`}
                  >
                    {page}
                  </button>
                ),
              )}
              <button
                type="button"
                aria-label="Next page"
                className="grid h-7 w-7 place-items-center rounded border border-slate-100 bg-white"
              >
                <ChevronRight className="h-3 w-3" />
              </button>
            </nav>
          </footer>
        </div>
        <aside className="space-y-2">
          <section className={panel}>
            <h2 className="text-sm font-bold">Available Balance</h2>
            <p className="mt-2 text-2xl font-bold tracking-tight text-[#07571b]">
              ₱6,200.00
            </p>
            <p className="mt-2 text-[10px] text-[#727c99]">Pending payout</p>
            <button
              type="button"
              className="mt-3 flex h-8 w-full items-center justify-center gap-2 rounded-md bg-amber-400 text-[11px] font-semibold"
            >
              <Wallet className="h-4 w-4" />
              Request Payout
            </button>
            <button
              type="button"
              className={`${control} mt-2 flex w-full items-center justify-center gap-2 border-green-100`}
            >
              <History className="h-3.5 w-3.5" />
              Payout History
            </button>
          </section>
          <section className={panel}>
            <h2 className="text-sm font-bold">Payout Summary</h2>
            <dl className="mt-3 space-y-3">
              {[
                ["Minimum Payout", "₱500.00"],
                ["Payout Method", "GCash"],
                ["Account", "09xx xxx xxxx"],
                ["Last Payout", "May 5, 2025"],
                ["Total Payouts", "₱12,250.00"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex justify-between gap-2 text-[10px]"
                >
                  <dt className="text-[#727c99]">{label}</dt>
                  <dd className="font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section className={panel}>
            <p className="flex items-center gap-2 rounded-md bg-[#eff8f2] p-3 text-[10px] font-semibold leading-4 text-[#164b24]">
              <Info className="h-4 w-4 shrink-0" />
              <span>
                Payouts are processed every Monday.
                <br />
                Cut-off is every Sunday, 11:59 PM.
              </span>
            </p>
          </section>
        </aside>
      </div>
    </section>
  );
}
