import { getSupabaseClient } from "./supabaseClient.js";
import {
  normalizePhilippineMobile,
  validPhilippineMobile,
} from "./philippineMobile.js";

export async function saveMyGcashAccount(
  account,
  client = getSupabaseClient(),
) {
  const name = account.name.trim();
  if (!name || name.length > 150)
    throw new Error("Enter your GCash account name (up to 150 characters).");
  if (!validPhilippineMobile(account.number))
    throw new Error("Enter a valid GCash number starting with 09, 9 or +639.");
  const { data, error } = await client.rpc("save_my_gcash_account", {
    p_name: name,
    p_number: normalizePhilippineMobile(account.number),
  });
  if (error)
    throw new Error("Could not save your GCash account: " + error.message);
  return data;
}
