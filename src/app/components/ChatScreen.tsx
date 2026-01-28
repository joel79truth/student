import { useEffect, useRef, useState } from "react";
import {
  listenToMessages,
  listenToUserChats,
  sendMessage,
  markAsRead,
  setTyping,
  listenToTyping
} from "../../lib/chatService";

import { auth } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";

import {
  ArrowLeft,
  Search,
  Send,
  MessageCircle,
  Check,
  CheckCheck
} from "lucide-react";

import type { Chat, Message } from "../../lib/chatService";

/* ================================================= */

export function ChatScreen() {

  /* ---------- AUTH ---------- */
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      setUid(user?.uid ?? null);
    });
    return unsub;
  }, []);

  /* ---------- STATE ---------- */

  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sending, setSending] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);
 const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
const filteredChats = chats.filter(chat =>
  chat.productTitle
    ?.toLowerCase()
    .includes(search.toLowerCase())
);


  /* ================================================= */
  /* LOAD USER CHATS                                  */
  /* ================================================= */

  useEffect(() => {
    if (!uid) return;

    return listenToUserChats(uid, setChats);
  }, [uid]);

  /* ================================================= */
  /* LOAD MESSAGES + TYPING                            */
  /* ================================================= */

  useEffect(() => {
    if (!selectedChat || !uid) return;

    const unsubMessages = listenToMessages(
      selectedChat.id,
      setMessages
    );

    const unsubTyping = listenToTyping(
      selectedChat.id,
      uid,
      setIsTyping
    );

    return () => {
      unsubMessages();
      unsubTyping();
    };
  }, [selectedChat, uid]);

  /* ================================================= */
  /* AUTO SCROLL                                      */
  /* ================================================= */

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ================================================= */
  /* READ RECEIPTS                                    */
  /* ================================================= */

  useEffect(() => {
    if (!uid || !selectedChat) return;

    messages.forEach(msg => {
      if (msg.senderId !== uid && !msg.readBy.includes(uid)) {
        markAsRead(selectedChat.id, msg.id, uid);
      }
    });
  }, [messages, uid, selectedChat]);

  /* ================================================= */
  /* SEND MESSAGE                                     */
  /* ================================================= */

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !selectedChat || !uid || sending) return;

    const text = input.trim();
    setInput("");
    setSending(true);

    try {
      await sendMessage(selectedChat.id, text, uid);
      await setTyping(selectedChat.id, uid, false);
    } finally {
      setSending(false);
    }
  }

  /* ================================================= */
  /* TYPING INDICATOR                                 */
  /* ================================================= */

  function handleTyping(value: string) {
    setInput(value);

    if (!selectedChat || !uid) return;

    if (typingTimer.current) {
      clearTimeout(typingTimer.current);
    }

    if (value.trim()) {
      setTyping(selectedChat.id, uid, true);

      typingTimer.current = setTimeout(() => {
        setTyping(selectedChat.id, uid, false);
      }, 1200);
    } else {
      setTyping(selectedChat.id, uid, false);
    }
  }

  /* ================================================= */
  /* HELPERS                                          */
  /* ================================================= */

 function timeAgo(value: any) {
  if (!value) return "";

  let date: Date;

  // Firestore Timestamp
  if (value?.seconds) {
    date = new Date(value.seconds * 1000);
  }
  // Already a Date
  else if (value instanceof Date) {
    date = value;
  }
  // ISO string
  else if (typeof value === "string") {
    date = new Date(value);
  }
  else {
    return "";
  }

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}


  /* ================================================= */
  /* NOT LOGGED IN                                    */
  /* ================================================= */

  if (!uid) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <MessageCircle className="w-16 h-16 opacity-40" />
      </div>
    );
  }

  /* ================================================= */
  /* CHAT LIST VIEW                                   */
  /* ================================================= */

  if (!selectedChat) {
    return (
      <div className="flex-1 flex flex-col">

        <div className="p-4 border-b">
          <h1 className="text-2xl font-semibold">Messages</h1>

          <div className="relative mt-3">
            <Search className="absolute left-3 top-3 w-4 h-4 opacity-50" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="pl-9 pr-3 py-2 w-full rounded-lg border"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredChats.map(chat => (
            <div
              key={chat.id}
              onClick={() => setSelectedChat(chat)}
              className="p-4 border-b cursor-pointer hover:bg-muted"
            >
              <div className="flex justify-between">
                <p className="font-medium">{chat.productTitle}</p>
                <span className="text-xs opacity-60">
                  {timeAgo(chat.lastMessageAt)}
                </span>
              </div>

              <p className="text-sm opacity-70 truncate">
                {chat.lastMessage || "No messages"}
              </p>
            </div>
          ))}
        </div>

      </div>
    );
  }

  /* ================================================= */
  /* CHAT VIEW                                        */
  /* ================================================= */

  return (
    <div className="flex-1 flex flex-col">

      {/* Header */}
      <div className="p-3 border-b flex items-center gap-2">
        <button onClick={() => setSelectedChat(null)}>
          <ArrowLeft />
        </button>

        <div>
          <p className="font-semibold">{selectedChat.productTitle}</p>
          {isTyping && (
            <p className="text-xs text-primary">typing...</p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map(msg => {
          const own = msg.senderId === uid;

          return (
            <div
              key={msg.id}
              className={`flex ${own ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`px-4 py-2 rounded-xl max-w-[70%]
                ${own ? "bg-primary text-white" : "bg-muted"}`}
              >
                <p>{msg.text || ""}</p>


                {own && (
                  <div className="flex justify-end mt-1">
                  {(msg.readBy?.length || 0) > 1
                ? <CheckCheck size={14} />
                : <Check size={14} />
                  }

                  </div>
                )}
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="p-3 border-t flex gap-2"
      >
        <input
          value={input}
          onChange={e => handleTyping(e.target.value)}
          placeholder="Type message..."
          className="flex-1 px-3 py-2 rounded-full border"
        />

        <button
          disabled={!input.trim() || sending}
          className="bg-primary text-white px-4 rounded-full"
        >
          <Send size={18} />
        </button>
      </form>

    </div>
  );
}
