import { supabase } from "./supabase";

/* ================= TYPES ================= */
export interface Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: Date;
  readBy: string[];
}

export interface Chat {
  id: string;
  users: string[];
  productId: string;
  productTitle: string;
  lastMessage: string;
  lastMessageAt: Date;
}

/* ================= GET OR CREATE CHAT ================= */
export async function getOrCreateChat(
  buyerId: string,
  sellerId: string,
  productId: string,
  productTitle: string
): Promise<string> {
  const users = [buyerId, sellerId].sort();

  const { data, error } = await supabase
    .from("chats")
    .select("id")
    .contains("users", users)
    .eq("product_id", productId)
    .maybeSingle();

  if (error) console.error("Error fetching chat:", error.message);
  if (data) return data.id;

  const { data: newChat, error: createError } = await supabase
    .from("chats")
    .insert([{ 
        users, 
        product_id: productId, 
        product_title: productTitle,
        last_message_at: new Date().toISOString() 
    }])
    .select()
    .single();

  if (createError) {
    console.error("Error creating chat:", createError.message);
    throw createError;
  }
  return newChat.id;
}

/* ================= SEND MESSAGE ================= */
export async function sendMessage(chatId: string, senderId: string, text: string) {
  // 1. Fetch the chat to find out who the participants are
  const { data: chat, error: chatError } = await supabase
    .from("chats")
    .select("users")
    .eq("id", chatId)
    .single();

  if (chatError || !chat) {
    console.error("Could not find chat participants:", chatError?.message);
    return;
  }

  // 2. Find the receiver (the ID in the array that isn't the sender)
  const receiverId = chat.users.find((id: string) => id !== senderId);

  // 3. Insert the message with BOTH sender and receiver IDs
  const { error: msgError } = await supabase
    .from("chat_messages")
    .insert([{ 
        chat_id: chatId, 
        sender_id: senderId, 
        receiver_id: receiverId, // This is now populated
        text, 
        read_by: [senderId] 
    }]);

  if (msgError) {
    console.error("Error sending message:", msgError.message);
    throw msgError;
  }

  // 4. Update the main chat list entry
  const { error: updateError } = await supabase
    .from("chats")
    .update({ 
        last_message: text, 
        last_message_at: new Date().toISOString() 
    })
    .eq("id", chatId);

  if (updateError) console.error("Error updating chat header:", updateError.message);
}

/* ================= LISTEN MESSAGES ================= */
export function listenToMessages(chatId: string | null, callback: (msgs: Message[]) => void) {
  if (!chatId) return () => {};

  let currentMessages: Message[] = [];

  // 1. Initial Fetch of existing history
  supabase
    .from("chat_messages")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true })
    .then(({ data, error }) => {
      if (error) {
        console.error("Initial fetch error:", error.message);
        return;
      }
      if (data) {
        currentMessages = data.map(m => ({
          id: m.id,
          text: m.text,
          senderId: m.sender_id,
          createdAt: new Date(m.created_at),
          readBy: m.read_by || []
        }));
        callback(currentMessages);
      }
    });

  // 2. Realtime Listener for new incoming messages
  const channel = supabase
    .channel(`chat_messages:${chatId}`)
    .on(
      'postgres_changes',
      { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'chat_messages', 
        filter: `chat_id=eq.${chatId}` 
      },
      (payload) => {
        const newMessage = payload.new;
        
        const formattedMsg: Message = {
          id: newMessage.id,
          text: newMessage.text,
          senderId: newMessage.sender_id,
          createdAt: new Date(newMessage.created_at),
          readBy: newMessage.read_by || []
        };

        // Append only the new message to the local list and trigger the UI update
        currentMessages = [...currentMessages, formattedMsg];
        callback(currentMessages);
      }
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}
/* ================= USER CHAT LIST ================= */
export function listenToUserChats(uid: string, callback: (chats: Chat[]) => void) {
  const fetchChats = () => {
    supabase
      .from("chats")
      .select("*")
      .contains("users", [uid])
      .order("last_message_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error("Fetch chats error:", error.message);
        if (data) {
          callback(data.map(d => ({
            id: d.id,
            users: d.users,
            productId: d.product_id,
            productTitle: d.product_title,
            lastMessage: d.last_message,
            lastMessageAt: new Date(d.last_message_at)
          })));
        }
      });
  };

  fetchChats();

  const channel = supabase
    .channel('user_chats')
    .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'chats' 
    }, () => {
        fetchChats(); // Re-fetch list when any chat updates
    })
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

/* ================= TYPING STATUS (Broadcast) ================= */
export function setTyping(chatId: string, uid: string, typing: boolean) {
  const channel = supabase.channel(`typing:${chatId}`);
  channel.subscribe(status => {
    if (status === 'SUBSCRIBED') {
      channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { uid, typing }
      });
    }
  });
}

export function listenToTyping(chatId: string, currentUserId: string, callback: (isTyping: boolean) => void) {
  const channel = supabase.channel(`typing:${chatId}`)
    .on('broadcast', { event: 'typing' }, ({ payload }) => {
      if (payload.uid !== currentUserId) {
        callback(payload.typing);
      }
    })
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

/* ================= READ RECEIPT ================== */
export async function markAsRead(
  _chatId: string, // Prefixed with underscore to ignore unused warning
  messageId: string,
  uid: string
) {
  const { data, error: fetchError } = await supabase
    .from("chat_messages")
    .select("read_by")
    .eq("id", messageId)
    .single();

  if (fetchError || !data) return;

  if (!data.read_by.includes(uid)) {
    const updatedReadBy = [...data.read_by, uid];
    const { error: updateError } = await supabase
      .from("chat_messages")
      .update({ read_by: updatedReadBy })
      .eq("id", messageId);

    if (updateError) console.error("Read receipt error:", updateError.message);
  }
}