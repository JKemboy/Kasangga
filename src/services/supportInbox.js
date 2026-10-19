import { getSupabaseClient } from "./supabaseClient.js";

const client = () => getSupabaseClient();

export async function listSupportConversations() {
  const { data, error } = await client()
    .from("support_conversations")
    .select("id,user_id,subject,category,status,created_at,updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(`Could not load support conversations: ${error.message}`);
  const ids = [...new Set((data || []).map((row) => row.user_id))];
  if (!ids.length) return [];
  const { data: users, error: usersError } = await client()
    .from("users")
    .select("user_id,first_name,last_name,csu_email")
    .in("user_id", ids);
  if (usersError) throw new Error(`Could not load support user details: ${usersError.message}`);
  const byId = new Map((users || []).map((user) => [user.user_id, user]));
  return (data || []).map((row) => ({ ...row, user: byId.get(row.user_id) }));
}

export async function listMySupportConversations() {
  const { data, error } = await client()
    .from("support_conversations")
    .select("id,user_id,subject,category,status,created_at,updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(`Could not load your support messages: ${error.message}`);
  return data || [];
}

export async function listSupportMessages(conversationId) {
  const { data, error } = await client()
    .from("support_messages")
    .select("id,conversation_id,sender_id,message,created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Could not load support messages: ${error.message}`);
  return data || [];
}

export async function createSupportConversation({ userId, subject, category, message }) {
  const { data, error } = await client()
    .from("support_conversations")
    .insert({ user_id: userId, subject: subject.trim(), category, status: "open" })
    .select("id,user_id,subject,category,status,created_at,updated_at")
    .single();
  if (error) throw new Error(`Could not create support conversation: ${error.message}`);
  try {
    await sendSupportMessage(data.id, userId, message);
  } catch (cause) {
    throw cause;
  }
  return data;
}

export async function sendSupportMessage(conversationId, senderId, message) {
  const content = String(message || "").trim();
  if (!content || content.length > 5000) throw new Error("Enter a message up to 5,000 characters.");
  const { error } = await client().from("support_messages").insert({
    conversation_id: conversationId,
    sender_id: senderId,
    message: content,
  });
  if (error) throw new Error(`Could not send support message: ${error.message}`);
}

export async function setSupportConversationStatus(conversationId, status) {
  const { error } = await client()
    .from("support_conversations")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", conversationId);
  if (error) throw new Error(`Could not update support status: ${error.message}`);
}
