import { getSupabaseClient } from "./supabaseClient.js";

export async function chatRequest(name, args, client = getSupabaseClient()) {
  const { data, error } = await client.rpc(name, args);
  if (error)
    throw new Error(
      error.code === "PGRST202"
        ? "Run supabase/manual/chat_access.sql in Supabase SQL Editor to enable chat."
        : error.message,
    );
  return data;
}
export const listChats = (role) =>
  chatRequest("list_my_pair_chats", { p_role: role });
export const readMessages = (bookingId) =>
  chatRequest("read_pair_chat_messages", { p_booking_id: bookingId });
export function sendMessage(bookingId, text) {
  const content = text.trim();
  if (!content || content.length > 3000)
    throw new Error("Enter a message of up to 3000 characters.");
  return chatRequest("send_pair_chat_message", {
    p_booking_id: bookingId,
    p_content: content,
  });
}
