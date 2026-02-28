import { useState, useEffect, useRef } from 'react';
import { Search, Filter, MapPin, X } from 'lucide-react';
import { ProductCard } from '../../app/components/ProductCard';
import { ProductDetail } from '../../app/components/ProductDetail';
import { supabase } from '../../lib/supabase';

interface Product {
  id: string;
  title: string;
  price: number;
  images: string[];          // full array for detail view
  image: string;             // first image for card view
  seller: string;
  sellerEmail: string;
  campus: string;
  distance: string;
  condition: string;
  category: string;
}

export function HomeScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [savedItems, setSavedItems] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [navigateToChat, setNavigateToChat] = useState(false);

  // PWA install prompt state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPopup, setShowInstallPopup] = useState(false);

  // iOS detection
  const [isIOS, setIsIOS] = useState(false);

  // Ref to prevent multiple timers
  const iosTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const categories = ['All', 'Electronics', 'Food', 'Books', 'clothes'];

  // Load saved items from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('savedItems');
    if (saved) setSavedItems(JSON.parse(saved));
  }, []);

  // Detect iOS
  useEffect(() => {
    const ua = window.navigator.userAgent;
    const iOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsIOS(iOS);
  }, []);

  // Manual trigger for iOS after a short delay (if not installed)
  useEffect(() => {
    if (!isIOS) return;

    const checkInstalledAndShow = () => {
      // Don't show if already in standalone mode
      if (window.matchMedia('(display-mode: standalone)').matches) {
        console.log('iOS app already installed (standalone)');
        return;
      }

      // Respect dismissal flag
      const lastDismiss = localStorage.getItem('installDismissed');
      if (lastDismiss && Date.now() - Number(lastDismiss) < 7 * 24 * 60 * 60 * 1000) {
        console.log('iOS popup dismissed recently, not showing');
        return;
      }

      // Show the popup after a short delay (e.g., 2 seconds)
      iosTimerRef.current = setTimeout(() => {
        setShowInstallPopup(true);
      }, 2000);
    };

    checkInstalledAndShow();

    return () => {
      if (iosTimerRef.current) clearTimeout(iosTimerRef.current);
    };
  }, [isIOS]);

  // Listen for beforeinstallprompt event (Android/Chrome)
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();

      // Check if user dismissed recently
      const lastDismiss = localStorage.getItem('installDismissed');
      if (lastDismiss && Date.now() - Number(lastDismiss) < 7 * 24 * 60 * 60 * 1000) {
        console.log('Install popup dismissed recently, ignoring beforeinstallprompt');
        return;
      }

      // Only show if not already installed
      if (!window.matchMedia('(display-mode: standalone)').matches) {
        console.log('beforeinstallprompt fired, showing popup');
        setDeferredPrompt(e);
        setShowInstallPopup(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Listen for successful installation
  useEffect(() => {
    const handleAppInstalled = () => {
      console.log('PWA installed successfully');
      setShowInstallPopup(false);
      setDeferredPrompt(null);
      localStorage.removeItem('installDismissed');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Install button handler (for non‑iOS)
  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the native install prompt
    deferredPrompt.prompt();

    // Wait for the user's choice
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);

    // Clear the stored prompt
    setDeferredPrompt(null);
    setShowInstallPopup(false);
  };

  // Dismiss handler (user clicks "Not now")
  const handleDismiss = () => {
    setShowInstallPopup(false);
    // Remember that user dismissed (optional, to avoid showing too often)
    localStorage.setItem('installDismissed', Date.now().toString());
  };

  // Fetch products from Supabase
 // Inside HomeScreen.tsx, replace the fetchProducts useEffect with:

useEffect(() => {
  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false }); // 👈 newest first

    if (error) {
      console.error('Error fetching products:', error.message);
      return;
    }

    const productsWithImages: Product[] = (data || []).map((item: any) => {
      const imagesArray = Array.isArray(item.images) ? item.images : [];
      const firstImage = imagesArray.length > 0 ? imagesArray[0] : '';

      return {
        id: item.id.toString(),
        title: item.title || 'Untitled Product',
        price: item.price || 0,
        images: imagesArray,
        image: firstImage,
        seller: item.seller || 'Unknown',
        sellerEmail: item.sellerEmail || '',
        campus: item.campus || 'Main Campus',
        distance: item.distance || '0.5 mi',
        condition: item.condition || 'Good',
        category: item.category || 'Other',
      };
    });

    setProducts(productsWithImages);
  };

  fetchProducts();
}, []);
  // Toggle saved items
  const toggleSave = (productId: string) => {
    const newSaved = savedItems.includes(productId)
      ? savedItems.filter(id => id !== productId)
      : [...savedItems, productId];

    setSavedItems(newSaved);
    localStorage.setItem('savedItems', JSON.stringify(newSaved));
  };

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Handle navigation to chat
  useEffect(() => {
    if (navigateToChat) {
      window.dispatchEvent(new CustomEvent('navigate-to-chat'));
      setNavigateToChat(false);
      setSelectedProduct(null);
    }
  }, [navigateToChat]);

  // Product detail view
  if (selectedProduct) {
    return (
      <ProductDetail
        product={selectedProduct}       // now includes full images array
        isSaved={savedItems.includes(selectedProduct.id)}
        onToggleSave={() => toggleSave(selectedProduct.id)}
        onBack={() => setSelectedProduct(null)}
        onChatStart={() => setNavigateToChat(true)}
      />
    );
  }

  // Main marketplace view (unchanged)
  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden relative">
      {/* Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl">Marketplace</h1>
            <div className="flex items-center text-sm text-muted-foreground mt-1">
              <MapPin className="w-4 h-4 mr-1" />
              <span>Main Campus</span>
            </div>
          </div>
          <button className="p-2 hover:bg-accent rounded-lg">
            <Filter className="w-5 h-5" />
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search items..."
            className="w-full pl-10 pr-4 py-3 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                selectedCategory === category
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-3">
          {filteredProducts.map(product => (
            <ProductCard
              key={product.id}
              product={product}          // ProductCard only uses product.image
              isSaved={savedItems.includes(product.id)}
              onToggleSave={() => toggleSave(product.id)}
              onClick={() => setSelectedProduct(product)}
            />
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <Search className="w-16 h-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No items found</p>
          </div>
        )}
      </div>

      {/* Custom Install Popup with iOS handling */}
      {showInstallPopup && (
        <div className="fixed bottom-4 left-4 right-4 bg-card border border-border rounded-lg shadow-lg p-4 z-50 animate-slide-up">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">Install App</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {isIOS
                  ? 'Install this app on your home screen for quick access.'
                  : 'Install this app on your device for quick access and offline use.'}
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-accent rounded-full"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          <div className="flex gap-2 mt-3">
            {isIOS ? (
              // iOS instructions – no install button, just a helpful hint
              <div className="flex-1 text-center text-sm text-muted-foreground bg-secondary/50 py-2 rounded-lg">
                Tap <span className="font-semibold">Share</span> →{' '}
                <span className="font-semibold">Add to Home Screen</span>
              </div>
            ) : (
              <button
                onClick={handleInstallClick}
                className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                Install
              </button>
            )}
            <button
              onClick={handleDismiss}
              className="flex-1 bg-secondary text-secondary-foreground py-2 rounded-lg font-medium hover:bg-secondary/80 transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}