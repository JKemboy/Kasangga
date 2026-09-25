function amountInCents(value) {
  if (typeof value !== "number" && typeof value !== "string") return 0;
  if (
    typeof value === "string" &&
    !/^[+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim())
  )
    return 0;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return 0;

  // Shift the decimal exponent before rounding, avoiding 1.005 * 100's
  // floating-point result of 100.49999999999999.
  const [coefficient, exponent = "0"] = String(amount).split("e");
  const cents = Math.round(Number(`${coefficient}e${Number(exponent) + 2}`));
  return Number.isSafeInteger(cents) ? cents : 0;
}

function isEarned(session) {
  return session?.status === "Completed" && session?.payment === "Paid";
}

function allocateCents(session) {
  const gross = amountInCents(session?.amount);
  if (!isEarned(session)) return { gross, tutor: 0, osas: 0, platform: 0 };

  // 90/5/5 is 18/1/1 twentieths. Split full twentieths first so even large
  // safe cent amounts never need an unsafe cents * 90 multiplication.
  const whole = Math.floor(gross / 20);
  const remainder = gross % 20;
  const weights = [18, 1, 1];
  const shares = weights.map(
    (weight) => whole * weight + Math.floor((remainder * weight) / 20),
  );
  const order = weights
    .map((weight, index) => ({ index, remainder: (remainder * weight) % 20 }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  const unallocated = gross - shares.reduce((sum, value) => sum + value, 0);
  for (let index = 0; index < unallocated; index++) {
    shares[order[index].index] += 1;
  }
  return { gross, tutor: shares[0], osas: shares[1], platform: shares[2] };
}

function pesos(cents) {
  return {
    gross: cents.gross / 100,
    tutor: cents.tutor / 100,
    osas: cents.osas / 100,
    platform: cents.platform / 100,
  };
}

export function sessionAllocation(session) {
  return pesos(allocateCents(session));
}

export function summarizeEarnings(sessions = []) {
  const totals = { gross: 0, tutor: 0, osas: 0, platform: 0 };
  let count = 0;
  for (const session of sessions) {
    if (!isEarned(session)) continue;
    count += 1;
    const cents = allocateCents(session);
    for (const key of Object.keys(totals)) totals[key] += cents[key];
  }
  return { count, ...pesos(totals) };
}
