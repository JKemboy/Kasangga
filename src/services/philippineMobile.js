export function philippineMobileDigits(value = "") {
  let digits = String(value).replace(/\D/g, "");
  if (digits.startsWith("63") && digits.length > 10) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits;
}

export function normalizePhilippineMobile(value) {
  const digits = philippineMobileDigits(value);
  return digits ? `+63${digits}` : "";
}

export function validPhilippineMobile(value) {
  return /^\+639\d{9}$/.test(normalizePhilippineMobile(value));
}
