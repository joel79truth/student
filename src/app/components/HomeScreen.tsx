import { useState, useEffect } from 'react';
import { Search, Filter, MapPin } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { ProductDetail } from '../components/ProductDetail';
import { supabase } from '../../supabase'; // your Supabase client

export function HomeScreen() {
  const [products, setProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [savedItems, setSavedItems] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const categories = ['All', 'Electronics', 'Textbooks', 'Clothes', 'Dorm Items', 'Furniture', 'Books', 'Other'];

  useEffect(() => {
    // Load saved items from localStorage
    const saved = localStorage.getItem('savedItems');
    if (saved) setSavedItems(JSON.parse(saved));

    // Fetch products from Supabase
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching products:', error);
        return;
      }

      // Map image arrays to a primary image for UI
      const formatted = data.map((item: any) => ({
        ...item,
        image: item.images?.[0] || '', // take first image as thumbnail
      }));

      setProducts(formatted);
    } catch (err) {
      console.error('Unexpected fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSave = (productId: string) => {
    const newSaved = savedItems.includes(productId)
      ? savedItems.filter(id => id !== productId)
      : [...savedItems, productId];

    setSavedItems(newSaved);
    localStorage.setItem('savedItems', JSON.stringify(newSaved));
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (selectedProduct) {
    return (
      <ProductDetail
        product={selectedProduct}
        isSaved={savedItems.includes(selectedProduct.id)}
        onToggleSave={() => toggleSave(selectedProduct.id)}
        onBack={() => setSelectedProduct(null)}
      />
    );
  }

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
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading products...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Search className="w-16 h-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No items found</p>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}
