import { ArrowLeft, Heart, MessageCircle, MapPin, User, Package } from 'lucide-react';
import { ImageWithFallback } from '../../app/components/figma/ImageWithFallback';
import { getOrCreateChat } from '../../lib/chatService';
import { getCurrentUserData } from '../../lib/userService';
import { auth } from '../../lib/firebase';
import { useState } from 'react';

interface Product {
  id: string;
  title: string;
  price: number;
  image: string;
  seller: string;
  sellerId?: string;
  campus: string;
  distance: string;
  condition: string;
  category: string;
}

interface ProductDetailProps {
  product: Product;
  isSaved: boolean;
  onToggleSave: () => void;
  onBack: () => void;
  onChatStart?: () => void;
}

export function ProductDetail({ product, isSaved, onToggleSave, onBack, onChatStart }: ProductDetailProps) {
  const [loading, setLoading] = useState(false);

  const handleChatWithSeller = async () => {
    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        alert('Please log in to chat with sellers');
        return;
      }
      
      const userData = await getCurrentUserData(currentUser);
      const currentUserId = currentUser.email || 'anonymous';
      const currentUserName = userData?.name || 'Student User';
      
      // Create a seller ID if not present (for mock products)
      const sellerId = product.sellerId || `seller_${product.seller.toLowerCase().replace(/\s+/g, '_')}`;
      
      // Create or get existing chat
      const chatId = await getOrCreateChat(
        currentUserId,
        currentUserName,
        sellerId,
        product.seller,
        product.id,
        product.title,
        product.image
      );
      
      console.log('Chat created/found:', chatId);
      
      // Navigate to chat screen
      if (onChatStart) {
        onChatStart();
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      alert('Failed to start chat. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="bg-card border-b border-border p-4 flex items-center justify-between">
        <button onClick={onBack} className="p-2 hover:bg-accent rounded-lg -ml-2">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <button onClick={onToggleSave} className="p-2 hover:bg-accent rounded-lg">
          <Heart
            className={`w-6 h-6 ${isSaved ? 'fill-red-500 text-red-500' : 'text-foreground'}`}
          />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="relative aspect-square">
          <ImageWithFallback
            src={product.image}
            alt={product.title}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="p-4">
          {/* Price */}
          <div className="text-3xl mb-2">${product.price}</div>
          
          {/* Title */}
          <h1 className="text-xl mb-4">{product.title}</h1>

          {/* Details */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center text-muted-foreground">
              <Package className="w-5 h-5 mr-3" />
              <div>
                <div className="text-xs">Condition</div>
                <div className="text-foreground">{product.condition}</div>
              </div>
            </div>
            
            <div className="flex items-center text-muted-foreground">
              <MapPin className="w-5 h-5 mr-3" />
              <div>
                <div className="text-xs">Location</div>
                <div className="text-foreground">{product.campus} • {product.distance} away</div>
              </div>
            </div>
            
            <div className="flex items-center text-muted-foreground">
              <User className="w-5 h-5 mr-3" />
              <div>
                <div className="text-xs">Seller</div>
                <div className="text-foreground">{product.seller}</div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <h3 className="mb-2">Description</h3>
            <p className="text-muted-foreground">
              This {product.title.toLowerCase()} is in {product.condition.toLowerCase()} condition and ready for pickup. 
              Located at {product.campus}. Contact seller for more details or to arrange a meetup.
            </p>
          </div>

          {/* Category Tag */}
          <div className="inline-block px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm">
            {product.category}
          </div>
        </div>
      </div>

      {/* Bottom Action */}
      <div className="bg-card border-t border-border p-4">
        <button 
          onClick={handleChatWithSeller}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <MessageCircle className="w-5 h-5" />
          <span>{loading ? 'Starting chat...' : 'Chat with Seller'}</span>
        </button>
      </div>
    </div>
  );
}