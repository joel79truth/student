import { ArrowLeft, Heart, MessageCircle, MapPin, User, Package, Loader2 } from 'lucide-react';
import { ImageWithFallback } from '../../app/components/figma/ImageWithFallback';
import { getOrCreateChat, normalizeUserId } from '../../lib/chatService';
import { getCurrentUserData, getUserByUsername, getUserByEmail, createOrUpdateUser } from '../../lib/userService';
import { auth } from '../../lib/firebase';
import { useState } from 'react';

interface Product {
  id: string;
  title: string;
  price: number;
  image: string;
  seller: string;
  sellerId?: string;
  sellerEmail?: string;
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

      // Get current user data, with fallback creation if missing
      let userData = await getCurrentUserData(currentUser);
      if (!userData) {
        console.log('User data not found, creating on the fly...');
        userData = await createOrUpdateUser({
          uid: currentUser.uid,
          email: currentUser.email!,
          name: currentUser.displayName || currentUser.email!.split('@')[0],
        });
        if (!userData) {
          alert('User data not found. Please try again.');
          return;
        }
      }

      // --- Normalize current user ID to email ---
      const rawCurrentId = currentUser.email || currentUser.uid;
      const normalizedCurrent = await normalizeUserId(rawCurrentId);
      const currentUserId = normalizedCurrent.id; // should be email
      const currentUserName = userData.name || normalizedCurrent.name;

      // --- Resolve seller's email ---
      let sellerEmail: string | null = null;
      const sellerName = product.seller;

      // 1. Direct sellerEmail (most reliable)
      if (product.sellerEmail) {
        sellerEmail = product.sellerEmail;
        console.log('✅ Using product.sellerEmail:', sellerEmail);
      }

      // 2. Try sellerId (could be UID, email, or username)
      if (!sellerEmail && product.sellerId) {
        console.log('🔍 Looking up seller by sellerId:', product.sellerId);
        if (product.sellerId.includes('@')) {
          sellerEmail = product.sellerId;
          console.log('✅ sellerId is an email:', sellerEmail);
        } else {
          const sellerData = await getUserByUsername(product.sellerId);
          sellerEmail = sellerData?.email || null;
          if (sellerEmail) console.log('✅ Found seller via sellerId lookup:', sellerEmail);
        }
      }

      // 3. Try looking up by seller display name (product.seller)
      if (!sellerEmail && product.seller) {
        console.log('🔍 Looking up seller by display name:', product.seller);
        if (product.seller.includes('@')) {
          sellerEmail = product.seller;
          console.log('✅ seller name is an email:', sellerEmail);
        } else {
          const sellerData = await getUserByUsername(product.seller);
          sellerEmail = sellerData?.email || null;
          if (sellerEmail) console.log('✅ Found seller via display name lookup:', sellerEmail);
        }
      }

      // 4. Final fallback: try to construct email from common domains
      if (!sellerEmail && product.seller && !product.seller.includes('@')) {
        console.log('🔍 Attempting email construction for:', product.seller);
        const possibleDomains = ['@gmail.com', '@students.ku.edu', '@ku.edu'];
        for (const domain of possibleDomains) {
          const testEmail = `${product.seller.toLowerCase()}${domain}`;
          const userByEmail = await getUserByEmail(testEmail);
          if (userByEmail) {
            sellerEmail = userByEmail.email;
            console.log('✅ Found seller via constructed email:', sellerEmail);
            break;
          }
        }
      }

      if (!sellerEmail) {
        console.error('❌ Could not resolve seller email for:', { seller: product.seller, sellerId: product.sellerId });
        alert('Could not find seller information. Please try again later or contact support.');
        return;
      }

      // 🛡️ Prevent self-chat
      if (sellerEmail === currentUserId) {
        alert('You cannot start a chat with yourself.');
        return;
      }

      console.log('🚀 Creating chat with:', {
        currentUserId,
        currentUserName,
        sellerEmail,
        sellerName,
        productId: product.id,
        productTitle: product.title,
      });

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
          <div className="text-3xl mb-2">${product.price}</div>
          <h1 className="text-xl mb-4">{product.title}</h1>

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

          <div className="mb-6">
            <h3 className="mb-2">Description</h3>
            <p className="text-muted-foreground">
              This {product.title.toLowerCase()} is in {product.condition.toLowerCase()} condition and ready for pickup. 
              Located at {product.campus}. Contact seller for more details or to arrange a meetup.
            </p>
          </div>

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