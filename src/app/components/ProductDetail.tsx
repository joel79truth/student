import { ArrowLeft, Heart, MessageCircle, MapPin, User, Package, Loader2 } from 'lucide-react';
import { ImageWithFallback } from '../../app/components/figma/ImageWithFallback';
import { getOrCreateChat } from '../../lib/chatService';
import { getCurrentUserData, getUserByUsername } from '../../lib/userService';
import { auth } from '../../lib/firebase';
import { useState } from 'react';

interface Product {
  id: string;
  title: string;
  price: number;
  image: string;
  seller: string;
  sellerId?: string;
  sellerEmail?: string; // Add this field
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

    // Get current user data
    const userData = await getCurrentUserData(currentUser);
    if (!userData) {
      alert('User data not found. Please try again.');
      return;
    }

    const currentUserId = currentUser.email || currentUser.uid;
    const currentUserName = userData.name || 'Student User';

    // --- Find seller's email ---
    let sellerEmail: string | null = null;
    let sellerName = product.seller; // display name

    if (product.sellerEmail) {
      sellerEmail = product.sellerEmail;
    } else if (product.sellerId) {
      // sellerId might be a username, sellerId field, or even an email prefix
      const sellerData = await getUserByUsername(product.sellerId);
      sellerEmail = sellerData?.email || null;
    } else {
      // fallback: look up by the seller's display name (username field in Firestore)
      const sellerData = await getUserByUsername(product.seller);
      sellerEmail = sellerData?.email || null;
    }

    if (!sellerEmail) {
      alert('Could not find seller information. Please try again later.');
      return;
    }

    console.log('Creating chat with:');
    console.log('- Current user:', currentUserId, currentUserName);
    console.log('- Seller:', sellerEmail, sellerName);
    console.log('- Product:', product.id, product.title);

    const chatId = await getOrCreateChat(
      currentUserId,
      currentUserName,
      sellerEmail,
      sellerName,
      product.id,
      product.title,
      product.image
    );

    console.log('✅ Chat created/found:', chatId);

    if (onChatStart) onChatStart();
  } catch (error) {
    console.error('❌ Error starting chat:', error);
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
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Starting chat...</span>
            </>
          ) : (
            <>
              <MessageCircle className="w-5 h-5" />
              <span>Chat with Seller</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}