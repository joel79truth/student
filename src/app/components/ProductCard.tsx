import { useState, useEffect } from 'react';
import { Heart, MapPin, MessageCircle, X, Send } from 'lucide-react';
import Slider from 'react-slick';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { supabase } from '../../lib/supabase'; // Ensure this path matches your project

// --- Interfaces ---
interface Product {
  id: string;
  title: string;
  price: number;
  images: string[];
  seller: string;
  sellerId: string;
  campus: string;
  distance: string;
  condition: string;
  category: string;
}

interface Message {
  id?: string;
  product_id: string;
  sender_id: string;
  receiver_id: string;
  text: string;
  created_at?: string;
}

// --- Component 1: The Product Card ---
interface ProductCardProps {
  product: Product;
  isSaved: boolean;
  onToggleSave: () => void;
  onClick: () => void;
  onBuy: () => void;
  onChatWithSeller: (product: Product) => void;
}

export function ProductCard({ product, isSaved, onToggleSave, onClick, onChatWithSeller }: ProductCardProps) {
  const [, setCurrentSlide] = useState(0);

  const handleChatClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChatWithSeller(product);
  };

  const sliderSettings = {
    dots: true,
    infinite: (product.images?.length ?? 0) > 1,
    speed: 300,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: false,
    beforeChange: (_current: number, next: number) => setCurrentSlide(next),
    dotsClass: 'slick-dots custom-dots',
  };

  return (
    <div onClick={onClick} className="bg-card rounded-lg overflow-hidden border border-border cursor-pointer hover:shadow-lg transition-shadow">
      <div className="relative aspect-square">
        {product.images?.length > 1 ? (
          <Slider {...sliderSettings}>
            {product.images.map((image, index) => (
              <div key={index} className="aspect-square">
                <ImageWithFallback src={image} alt={product.title} className="w-full h-full object-cover" />
              </div>
            ))}
          </Slider>
        ) : (
          <ImageWithFallback src={product.images?.[0] || ''} alt={product.title} className="w-full h-full object-cover" />
        )}

        <button onClick={(e) => { e.stopPropagation(); onToggleSave(); }} className="absolute top-2 right-2 p-2 bg-card/90 rounded-full">
          <Heart className={`w-5 h-5 ${isSaved ? 'fill-red-500 text-red-500' : 'text-foreground'}`} />
        </button>

        <button onClick={handleChatClick} className="absolute bottom-2 left-2 right-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium shadow-lg flex items-center justify-center gap-2">
          <MessageCircle className="w-4 h-4" />
          Chat with seller
        </button>
      </div>

      <div className="p-3">
        <h3 className="font-medium line-clamp-2">{product.title}</h3>
        <p className="font-semibold text-lg mb-1">MK{product.price.toFixed(1)}</p>
        <div className="flex items-center text-xs text-muted-foreground">
          <MapPin className="w-3 h-3 mr-1" />
          <span>{product.campus}</span>
        </div>
      </div>
    </div>
  );
}

// --- Component 2: The Marketplace (Parent) ---
export function Marketplace({ products }: { products: Product[] }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeChatProduct, setActiveChatProduct] = useState<Product | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");

  // Get current user on load
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUserId(data.user.id);
    });
  }, []);

  // Real-time Subscription Logic
  useEffect(() => {
    if (!activeChatProduct || !currentUserId) return;

    const channel = supabase
      .channel(`chat:${activeChatProduct.id}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'chat_messages',
          filter: `product_id=eq.${activeChatProduct.id}` 
        },
        (payload) => {
          const msg = payload.new as Message;
          // Security: Only show if I'm the sender or receiver
          if (msg.sender_id === currentUserId || msg.receiver_id === currentUserId) {
            setMessages((prev) => [...prev, msg]);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeChatProduct, currentUserId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChatProduct || !currentUserId) return;

    const { error } = await supabase.from('chat_messages').insert([{
      product_id: activeChatProduct.id,
      sender_id: currentUserId,
      receiver_id: activeChatProduct.sellerId,
      text: newMessage
    }]);

    if (error) alert(error.message);
    else setNewMessage("");
  };

  return (
    <div className="p-4 relative">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.map(product => (
          <ProductCard 
            key={product.id}
            product={product}
            isSaved={false}
            onToggleSave={() => {}} 
            onClick={() => {}}
            onBuy={() => {}}
            onChatWithSeller={(p) => setActiveChatProduct(p)}
          />
        ))}
      </div>

      {/* Simplified Chat Overlay */}
      {activeChatProduct && (
        <div className="fixed bottom-4 right-4 w-80 h-96 bg-card border border-border shadow-2xl rounded-lg flex flex-col z-50">
          <div className="p-3 border-b flex justify-between items-center bg-muted">
            <span className="font-bold text-sm truncate">{activeChatProduct.title}</span>
            <button onClick={() => setActiveChatProduct(null)}><X className="w-4 h-4" /></button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {messages.map((m, i) => (
              <div key={i} className={`p-2 rounded-lg text-sm max-w-[80%] ${m.sender_id === currentUserId ? 'bg-primary text-primary-foreground ml-auto' : 'bg-secondary text-secondary-foreground'}`}>
                {m.text}
              </div>
            ))}
          </div>

          <form onSubmit={handleSendMessage} className="p-2 border-t flex gap-2">
            <input 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-background border rounded px-2 py-1 text-sm"
            />
            <button type="submit" className="p-1 bg-primary text-primary-foreground rounded"><Send className="w-4 h-4" /></button>
          </form>
        </div>
      )}
    </div>
  );
}