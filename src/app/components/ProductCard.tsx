import { Heart, MapPin } from 'lucide-react';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';

interface Product {
  id: string;
  title: string;
  price: number;
  image: string;
  seller: string;
  sellerId: string;   // ✅ ADD
  campus: string;
  distance: string;
  condition: string;
  category: string;
}

interface ProductCardProps {
  product: Product;
  isSaved: boolean;
  onToggleSave: () => void;
  onClick: () => void;
}

export function ProductCard({
  product,
  isSaved,
  onToggleSave,
  onClick
}: ProductCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-card rounded-lg overflow-hidden border border-border cursor-pointer hover:shadow-lg transition-shadow"
    >
      <div className="relative aspect-square">
        <ImageWithFallback
          src={product.image}
          alt={product.title}
          className="w-full h-full object-cover"
        />

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave();
          }}
          className="absolute top-2 right-2 p-2 bg-card/90 rounded-full hover:bg-card transition-colors"
        >
          <Heart
            className={`w-5 h-5 ${
              isSaved ? 'fill-red-500 text-red-500' : 'text-foreground'
            }`}
          />
        </button>

        <div className="absolute bottom-2 left-2 px-2 py-1 bg-primary/90 text-primary-foreground text-xs rounded">
          ${product.price.toFixed(2)}
        </div>
      </div>

      <div className="p-3">
        <h3 className="font-medium line-clamp-2 mb-1">
          {product.title}
        </h3>

        <div className="flex items-center text-xs text-muted-foreground mb-1">
          <MapPin className="w-3 h-3 mr-1" />
          <span>{product.campus} ({product.distance})</span>
        </div>

        <p className="text-xs text-muted-foreground">
          {product.seller}
        </p>
      </div>
    </div>
  );
}
