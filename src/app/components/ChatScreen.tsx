import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Search, Send, Loader2 } from 'lucide-react';
import { auth } from '../../lib/firebase';
import { getCurrentUserData } from '../../lib/userService';
import {
  Chat,
  Message,
  subscribeToChats,
  subscribeToMessages,
  sendMessage,
  markMessagesAsRead,
  formatMessageTime,
  formatMessageTimestamp
} from '../../lib/chatService';

interface ChatScreenProps {
  onBack: () => void;
}

export function ChatScreen({ onBack }: ChatScreenProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserName, setCurrentUserName] = useState('Student User');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const currentUser = auth.currentUser;
  const currentUserId = currentUser?.email || 'anonymous';

  // Load current user data
  useEffect(() => {
    const loadUserData = async () => {
      if (currentUser) {
        const userData = await getCurrentUserData(currentUser);
        if (userData) {
          setCurrentUserName(userData.name);
        }
      }
    };
    loadUserData();
  }, [currentUser]);

  // Subscribe to user's chats
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToChats(currentUserId, (updatedChats) => {
      setChats(updatedChats);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUserId]);

  // Subscribe to messages when a chat is selected
  useEffect(() => {
    if (!selectedChat) {
      setMessages([]);
      return;
    }

    const unsubscribe = subscribeToMessages(selectedChat.id, (updatedMessages) => {
      setMessages(updatedMessages);
      
      // Mark messages as read when viewing chat
      markMessagesAsRead(selectedChat.id, currentUserId);
      
      // Scroll to bottom when new messages arrive
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    return () => unsubscribe();
  }, [selectedChat, currentUserId]);

  // Scroll to bottom on initial load
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [selectedChat]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedChat || sending) return;
    
    setSending(true);
    try {
      await sendMessage(
        selectedChat.id,
        currentUserId,
        currentUserName,
        messageInput.trim()
      );
      setMessageInput('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const filteredChats = chats.filter(chat => {
    const otherUserId = chat.participants.find(id => id !== currentUserId);
    const otherUserName = otherUserId ? chat.participantNames[otherUserId] : '';
    
    return (
      otherUserName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.productTitle.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleChatSelect = (chat: Chat) => {
    setSelectedChat(chat);
    // Mark as read when opening
    markMessagesAsRead(chat.id, currentUserId);
  };

  // Chat List View
  if (!selectedChat) {
    return (
      <div className="flex-1 flex flex-col bg-background overflow-hidden">
        {/* Header */}
        <div className="bg-card border-b border-border p-4">
          <h1 className="text-2xl mb-3">Messages</h1>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-3 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
              <p className="text-muted-foreground">Loading chats...</p>
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="text-6xl mb-4">💬</div>
              <p className="text-muted-foreground">No messages yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery ? 'No chats match your search' : 'Start chatting with sellers!'}
              </p>
            </div>
          ) : (
            filteredChats.map(chat => {
              const otherUserId = chat.participants.find(id => id !== currentUserId);
              const otherUserName = otherUserId ? chat.participantNames[otherUserId] : 'Unknown';
              const avatar = otherUserId ? chat.participantAvatars[otherUserId] : '?';
              const unreadCount = chat.unreadCount[currentUserId] || 0;
              
              return (
                <div
                  key={chat.id}
                  onClick={() => handleChatSelect(chat)}
                  className="flex items-start gap-3 p-4 border-b border-border hover:bg-accent cursor-pointer transition-colors"
                >
                  <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center text-2xl flex-shrink-0">
                    {avatar}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between mb-1">
                      <h3 className="truncate">{otherUserName}</h3>
                      <span className="text-xs text-muted-foreground ml-2">
                        {formatMessageTime(chat.lastMessageTime)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {chat.lastMessage || 'Start chatting...'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">About: {chat.productTitle}</p>
                  </div>

                  {unreadCount > 0 && (
                    <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs flex-shrink-0">
                      {unreadCount}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // Individual Chat View
  const otherUserId = selectedChat.participants.find(id => id !== currentUserId);
  const otherUserName = otherUserId ? selectedChat.participantNames[otherUserId] : 'Unknown';
  const avatar = otherUserId ? selectedChat.participantAvatars[otherUserId] : '?';

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="bg-card border-b border-border p-4 flex items-center gap-3">
        <button
          onClick={() => setSelectedChat(null)}
          className="p-2 hover:bg-accent rounded-lg -ml-2"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        
        <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center text-xl">
          {avatar}
        </div>
        
        <div className="flex-1 min-w-0">
          <h2 className="truncate">{otherUserName}</h2>
          <p className="text-sm text-muted-foreground truncate">{selectedChat.productTitle}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <p>No messages yet</p>
            <p className="text-sm mt-1">Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.senderId === currentUserId ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                  message.senderId === currentUserId
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground'
                }`}
              >
                <p className="break-words">{message.text}</p>
                <p
                  className={`text-xs mt-1 ${
                    message.senderId === currentUserId
                      ? 'text-primary-foreground/70'
                      : 'text-muted-foreground'
                  }`}
                >
                  {formatMessageTimestamp(message.timestamp)}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="bg-card border-t border-border p-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder="Type a message..."
            disabled={sending}
            className="flex-1 p-3 rounded-full bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!messageInput.trim() || sending}
            className="p-3 bg-primary text-primary-foreground rounded-full hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}