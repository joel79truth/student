import { ArrowLeft, ArrowRight, Heart, MessageCircle, MapPin, User, Package, Loader2, ShoppingCart } from 'lucide-react';
import { ImageWithFallback } from '../../app/components/figma/ImageWithFallback';
import { getOrCreateChat, normalizeUserId } from '../../lib/chatService';
import { getCurrentUserData, getUserByUsername, createOrUpdateUser } from '../../lib/userService'; // removed getUserByEmail
import { auth } from '../../lib/firebase';
import { useState } from 'react';

interface Product {
  id: string;
  title: string;
  price: number;
  image?: string;           // fallback single image
  images?: string[];        // ✅ multiple images from same user
  seller: string;
  sellerEmail: string;
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
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Normalize images: use product.images if available, else fallback to single product.image
  const images = product.images && product.images.length > 0
    ? product.images
    : product.image
      ? [product.image]
      : [];

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleBuyNow = () => {
    alert('This feature is coming soon! 🚀\n\nWe\'re working on adding secure payment options. For now, please chat with the seller to arrange payment.');
  };

  const handleChatWithSeller = async () => {
    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        alert('Please log in to chat with sellers');
        return;
      }

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

      const rawCurrentId = currentUser.email || currentUser.uid;
      const normalizedCurrent = await normalizeUserId(rawCurrentId);
      const currentUserId = normalizedCurrent.id;
      const currentUserName = userData.name || normalizedCurrent.name;

      let sellerEmail: string | null = null;
      const sellerName = product.seller;

      if (product.sellerEmail) {
        sellerEmail = product.sellerEmail;
        console.log('✅ Using product.sellerEmail:', sellerEmail);
      }

      if (!sellerEmail && product.seller) {
        console.log('🔍 Looking up seller by display name:', product.seller);
        if (product.seller.includes('@')) {
          sellerEmail = product.seller;
          console.log('✅ seller name is an email:', sellerEmail);
        } else {
          const trimmedSeller = product.seller.trim();
          const sellerData = await getUserByUsername(trimmedSeller);
          sellerEmail = sellerData?.email || null;
          if (sellerEmail) console.log('✅ Found seller via display name lookup:', sellerEmail);
        }
      }

      if (!sellerEmail) {
        console.error('❌ Could not resolve seller email for:', { seller: product.seller, sellerId: product.seller });
        alert('Could not find seller information. Please try again later or contact support.');
        return;
      }

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
        images[0] || '' // use first image as thumbnail
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

  // If no images at all, show placeholder
  if (images.length === 0) {
    return (
      <div className="flex-1 flex flex-col bg-background overflow-hidden">
        <div className="bg-card border-b border-border p-4 flex items-center justify-between">
          <button onClick={onBack} className="p-2 hover:bg-accent rounded-lg -ml-2">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <button onClick={onToggleSave} className="p-2 hover:bg-accent rounded-lg">
            <Heart className={`w-6 h-6 ${isSaved ? 'fill-red-500 text-red-500' : 'text-foreground'}`} />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          No images available
        </div>
      </div>
    );
  }

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
        {/* Image Carousel */}
        <div className="relative aspect-square bg-muted">
          <ImageWithFallback
            src={images[currentImageIndex]}
            alt={`${product.title} - image ${currentImageIndex + 1}`}
            className="w-full h-full object-cover"
          />

          {images.length > 1 && (
            <>
              <button
                onClick={handlePrevImage}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition"
                aria-label="Previous image"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleNextImage}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition"
                aria-label="Next image"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                {currentImageIndex + 1} / {images.length}
              </div>
            </>
          )}
        </div>

        {/* Thumbnails (only if multiple images) */}
        {images.length > 1 && (
          <div className="flex gap-2 p-2 overflow-x-auto">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentImageIndex(idx)}
                className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 ${
                  idx === currentImageIndex ? 'border-primary' : 'border-transparent'
                }`}
              >
                <ImageWithFallback
                  src={img}
                  alt={`Thumbnail ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}

        {/* Product details (unchanged) */}
        <div className="p-4">
          <div className="text-3xl mb-2">Mk{product.price}</div>
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

      {/* Bottom Action Buttons */}
      <div className="bg-card border-t border-border p-4 space-y-3">
        <button
          onClick={handleBuyNow}
          className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
        >
          <ShoppingCart className="w-5 h-5" />
          <span>Buy Now</span>
        </button>
        <button
          onClick={handleChatWithSeller}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 bg-secondary text-secondary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
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