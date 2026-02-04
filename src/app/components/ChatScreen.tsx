import { useEffect, useRef, useState } from "react";
import { auth } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";

import {
  ArrowLeft,
  Search,
  Send,
  MessageCircle,
  Check,
  CheckCheck,
} from "lucide-react";

import {
  listenToMessages,
  listenToUserChats,
  sendMessage,
  markAsRead,
  setTyping,
  listenToTyping,
  type Chat,
  type Message
} from "../../lib/chatService";

/* --- Helper: Time Formatter --- */
const formatTimeAgo = (value: any) => {
  if (!value) return "";
  const date = value?.seconds ? new Date(value.seconds * 1000) : new Date(value);
  if (isNaN(date.getTime())) return "";

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

export function ChatScreen() {
  /* ---------- STATE & REFS ---------- */
  const [uid, setUid] = useState<string | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [remoteIsTyping, setRemoteIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ---------- AUTH & INITIALIZATION ---------- */
  useEffect(() => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      setUid(user.uid);
      // Logic to bridge Firebase user to Supabase if needed, 
      // or simply use the Firebase UID as the reference string.
    } else {
      setUid(null);
    }
  });
}, []);
  /* ---------- SUBSCRIPTIONS ---------- */
  useEffect(() => {
    if (!uid) return;
    return listenToUserChats(uid, setChats);
  }, [uid]);

  useEffect(() => {
    if (!selectedChat || !uid) {
      setMessages([]);
      return;
    }

    const unsubMsgs = listenToMessages(selectedChat.id, setMessages);
    const unsubTyping = listenToTyping(selectedChat.id, uid, setRemoteIsTyping);

    return () => {
      unsubMsgs();
      unsubTyping();
    };
  }, [selectedChat, uid]);

  /* ---------- SIDE EFFECTS ---------- */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, remoteIsTyping]);

  useEffect(() => {
    if (!uid || !selectedChat) return;
    messages.forEach((msg) => {
      if (msg.senderId !== uid && !msg.readBy.includes(uid)) {
        markAsRead(selectedChat.id, msg.id, uid);
      }
    });
  }, [messages, uid, selectedChat]);

  /* ---------- HANDLERS ---------- */
  const handleTyping = (val: string) => {
    setInput(val);
    if (!selectedChat || !uid) return;

    if (typingTimer.current) clearTimeout(typingTimer.current);
    
    setTyping(selectedChat.id, uid, val.length > 0);
    typingTimer.current = setTimeout(() => {
      setTyping(selectedChat.id, uid, false);
    }, 1500);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selectedChat || !uid || isSending) return;

    setIsSending(true);
    try {
      // Assuming your chatService.sendMessage(chatId, senderId, text)
      await sendMessage(selectedChat.id, uid, input.trim());
      setInput("");
      setTyping(selectedChat.id, uid, false);
    } catch (err) {
      console.error("Failed to send:", err);
    } finally {
      setIsSending(false);
    }
  };

  /* ---------- RENDER LOGIC ---------- */
  const filteredChats = chats.filter((chat) =>
    chat.productTitle?.toLowerCase().includes(search.toLowerCase())
  );

  if (!uid) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center space-y-4">
        <MessageCircle className="w-16 h-16 opacity-20 animate-pulse" />
        <p className="text-muted-foreground">Please sign in to view messages</p>
      </div>
    );
  }

  // --- LIST VIEW ---
  if (!selectedChat) {
    return (
      <div className="flex-1 flex flex-col h-full">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2 bg-muted/50 border-none rounded-xl focus:ring-2 ring-primary"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredChats.length > 0 ? (
            filteredChats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => setSelectedChat(chat)}
                className="w-full p-4 border-b flex flex-col text-left hover:bg-muted/50 transition-colors"
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-semibold text-sm">{chat.productTitle}</span>
                  <span className="text-[10px] uppercase font-medium opacity-50">
                    {formatTimeAgo(chat.lastMessageAt)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {chat.lastMessage || "Start a conversation..."}
                </p>
              </button>
            ))
          ) : (
            <div className="p-10 text-center text-muted-foreground">
              No conversations found.
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- INDIVIDUAL CHAT VIEW ---
  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      {/* Header */}
      <header className="p-3 border-b flex items-center gap-3 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <button 
          onClick={() => setSelectedChat(null)}
          className="p-2 hover:bg-muted rounded-full transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="font-bold text-sm leading-tight">{selectedChat.productTitle}</h2>
          {remoteIsTyping && (
            <span className="text-[10px] text-primary font-medium animate-pulse">
              typing...
            </span>
          )}
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isOwn = msg.senderId === uid;
          return (
            <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
              <div className={`group relative max-w-[80%] px-4 py-2 rounded-2xl text-sm shadow-sm
                ${isOwn ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-muted rounded-tl-none"}`}
              >
                <p className="leading-relaxed">{msg.text}</p>
                {isOwn && (
                  <div className="flex justify-end mt-1 opacity-70">
                    {msg.readBy.length > 1 ? <CheckCheck size={12} /> : <Check size={12} />}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <footer className="p-4 border-t bg-background">
        <form onSubmit={handleSend} className="flex gap-2 items-center bg-muted/50 p-1 rounded-full border">
          <input
            value={input}
            onChange={(e) => handleTyping(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-transparent px-4 py-2 text-sm focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || isSending}
            className="bg-primary text-primary-foreground p-2 rounded-full disabled:opacity-50 transition-all active:scale-95"
          >
            <Send size={18} />
          </button>
        </form>
      </footer>
    </div>
  );
}