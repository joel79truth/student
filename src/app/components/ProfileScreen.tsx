import { useState, useEffect } from 'react';
import { ArrowLeft, Settings, Heart, Package, LogOut, MapPin, Mail } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';

interface ProfileScreenProps {
  onLogout: () => void;
  onBack: () => void;
}

interface UserData {
  name: string;
  email: string;
  campus: string;
}

export function ProfileScreen({ onLogout, onBack }: ProfileScreenProps) {
  const [activeTab, setActiveTab] = useState<'listings' | 'saved'>('listings');
  const [userData, setUserData] = useState<UserData>({ name: '', email: '', campus: '' });
  const [myProducts, setMyProducts] = useState<any[]>([]);
  const [savedItems, setSavedItems] = useState<string[]>([]);

  useEffect(() => {
    // Load user data
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    setUserData(user);

    // Load user's products
    const products = JSON.parse(localStorage.getItem('myProducts') || '[]');
    setMyProducts(products);

    // Load saved items
    const saved = JSON.parse(localStorage.getItem('savedItems') || '[]');
    setSavedItems(saved);
  }, []);

  const handleLogout = () => {
    if (confirm('Are you sure you want to log out?')) {
      onLogout();
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onBack} className="p-2 hover:bg-accent rounded-lg -ml-2">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <button className="p-2 hover:bg-accent rounded-lg">
            <Settings className="w-6 h-6" />
          </button>
        </div>

        {/* Profile Info */}
        <div className="flex items-center gap-4 mb-4">
          <div className="w-20 h-20 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-3xl">
            {userData.name ? userData.name[0].toUpperCase() : '?'}
          </div>
          
          <div className="flex-1">
            <h1 className="text-2xl mb-1">{userData.name || 'Student User'}</h1>
            <div className="flex items-center text-sm text-muted-foreground mb-1">
              <Mail className="w-4 h-4 mr-1" />
              <span>{userData.email || 'user@example.com'}</span>
            </div>
            <div className="flex items-center text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 mr-1" />
              <span>{userData.campus || 'Main Campus'}</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-4">
          <div className="flex-1 bg-secondary rounded-lg p-3 text-center">
            <div className="text-2xl mb-1">{myProducts.length}</div>
            <div className="text-xs text-muted-foreground">Listings</div>
          </div>
          <div className="flex-1 bg-secondary rounded-lg p-3 text-center">
            <div className="text-2xl mb-1">{savedItems.length}</div>
            <div className="text-xs text-muted-foreground">Saved</div>
          </div>
          <div className="flex-1 bg-secondary rounded-lg p-3 text-center">
            <div className="text-2xl mb-1">0</div>
            <div className="text-xs text-muted-foreground">Sold</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-card border-b border-border flex">
        <button
          onClick={() => setActiveTab('listings')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 border-b-2 transition-colors ${
            activeTab === 'listings'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground'
          }`}
        >
          <Package className="w-5 h-5" />
          <span>My Listings</span>
        </button>
        
        <button
          onClick={() => setActiveTab('saved')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 border-b-2 transition-colors ${
            activeTab === 'saved'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground'
          }`}
        >
          <Heart className="w-5 h-5" />
          <span>Saved Items</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'listings' && (
          <>
            {myProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Package className="w-16 h-16 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No listings yet</p>
                <p className="text-sm text-muted-foreground mt-1">Start selling items!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {myProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    isSaved={false}
                    onToggleSave={() => {}}
                    onClick={() => {}}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'saved' && (
          <div className="flex flex-col items-center justify-center py-12">
            <Heart className="w-16 h-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No saved items yet</p>
            <p className="text-sm text-muted-foreground mt-1">Save items you like!</p>
          </div>
        )}
      </div>

      {/* Logout Button */}
      <div className="bg-card border-t border-border p-4">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3 bg-destructive text-destructive-foreground rounded-lg hover:opacity-90 transition-opacity"
        >
          <LogOut className="w-5 h-5" />
          <span>Log Out</span>
        </button>
      </div>
    </div>
  );
}
