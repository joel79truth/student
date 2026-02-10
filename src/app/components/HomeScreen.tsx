import { useState, useEffect } from 'react';
import { Search, Filter, MapPin } from 'lucide-react';
import { ProductCard } from '../../app/components/ProductCard';
import { ProductDetail } from '../../app/components/ProductDetail';
import { supabase } from '../../lib/supabase';

interface Product {
  id: string;
  title: string;
  price: number;
  image: string;
  seller: string;
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

  const categories = ['All', 'Electronics', 'Textbooks', 'Clothes', 'Dorm Items'];

  // Load saved items from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('savedItems');
    if (saved) setSavedItems(JSON.parse(saved));
  }, []);

  // Fetch products from Supabase
  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*');

      if (error) {
        console.error('Error fetching products:', error.message);
        return;
      }

      const productsWithImages: Product[] = (data || []).map((item: any) => {
        // Handle the images column, which may be an array
        let imageUrl = '';
        if (Array.isArray(item.images) && item.images.length > 0) {
          imageUrl = item.images[0]; // take first image URL
        } else if (typeof item.images === 'string') {
          imageUrl = item.images;
        }

        return {
          id: item.id.toString(),
          title: item.title || 'Untitled Product',
          price: item.price || 0,
          image: imageUrl,
          seller: item.seller || 'Unknown',
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
        product={selectedProduct}
        isSaved={savedItems.includes(selectedProduct.id)}
        onToggleSave={() => toggleSave(selectedProduct.id)}
        onBack={() => setSelectedProduct(null)}
        onChatStart={() => setNavigateToChat(true)}
      />
    );
  }

  // Main marketplace view
  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
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

        {/* Search Bar */}
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

        {/* Category Tabs */}
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
              product={product}
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
    </div>
  );
}
