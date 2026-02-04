import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  MapPin,
  User,
  Package,
} from "lucide-react";

import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { getOrCreateChat } from "../../lib/chatService";
import { auth } from "../../firebase";

/* ================= TYPES ================= */

export interface Product {
  id: string;
  title: string;
  price: number;
  images: string[];
  seller: string;
  campus: string;
  distance?: string;
  condition: string;
  category: string;
}

interface ProductDetailProps {
  product: Product;
  isSaved: boolean;
  onToggleSave: () => void;
  onBack: () => void;
  onOpenChat: () => void;
}

/* ================= COMPONENT ================= */

export default function ProductDetail({
  product,
  isSaved,
  onToggleSave,
  onBack,
}: ProductDetailProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const navigate = useNavigate();

  /* ---------- Image Controls ---------- */

  const nextImage = () => {
    setCurrentImageIndex(
      (prev) => (prev + 1) % product.images.length
    );
  };

  const prevImage = () => {
    setCurrentImageIndex(
      (prev) =>
        (prev - 1 + product.images.length) %
        product.images.length
    );
  };

  /* ---------- Chat ---------- */

  const handleChat = async () => {
    try {
      const user = auth.currentUser;

      if (!user) {
        alert("You must be logged in to chat.");
        return;
      }

      const chatId = await getOrCreateChat(
        user.uid,
        product.seller,
        product.id,
        product.title
      );

      navigate(`/chat/${chatId}`);
    } catch (err) {
      console.error("Failed to start chat:", err);
    }
  };

  /* ================= RENDER ================= */

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden">

      {/* ---------- HEADER ---------- */}
      <div className="bg-card border-b border-border p-4 flex items-center justify-between">

        <button
          onClick={onBack}
          className="p-2 hover:bg-accent rounded-lg"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>

        <button
          onClick={onToggleSave}
          className="p-2 hover:bg-accent rounded-lg"
        >
          <Heart
            className={`w-6 h-6 ${
              isSaved
                ? "fill-red-500 text-red-500"
                : "text-foreground"
            }`}
          />
        </button>

      </div>

      {/* ---------- IMAGE CAROUSEL ---------- */}
      <div className="relative w-full aspect-square bg-gray-100">

        <ImageWithFallback
          src={product.images[currentImageIndex]}
          alt={product.title}
          className="w-full h-full object-cover"
        />

        {product.images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white p-2 rounded-full"
            >
              ←
            </button>

            <button
              onClick={nextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white p-2 rounded-full"
            >
              →
            </button>

            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {product.images.map((_, i) => (
                <span
                  key={i}
                  className={`w-2 h-2 rounded-full ${
                    i === currentImageIndex
                      ? "bg-white"
                      : "bg-white/50"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ---------- CONTENT ---------- */}
      <div className="flex-1 overflow-y-auto p-4">

        <div className="text-3xl mb-2">
          $
          {new Intl.NumberFormat("en-US").format(
            product.price
          )}
        </div>

        <h1 className="text-xl mb-4">{product.title}</h1>

        {/* DETAILS */}
        <div className="space-y-4 mb-6 text-muted-foreground">

          <div className="flex items-center">
            <Package className="w-5 h-5 mr-3" />
            <div>
              <div className="text-xs">Condition</div>
              <div className="text-foreground">
                {product.condition}
              </div>
            </div>
          </div>

          <div className="flex items-center">
            <MapPin className="w-5 h-5 mr-3" />
            <div>
              <div className="text-xs">Location</div>
              <div className="text-foreground">
                {product.campus} • {product.distance || "N/A"}
              </div>
            </div>
          </div>

          <div className="flex items-center">
            <User className="w-5 h-5 mr-3" />
            <div>
              <div className="text-xs">Seller</div>
              <div className="text-foreground">
                {product.seller}
              </div>
            </div>
          </div>

        </div>

        {/* DESCRIPTION */}
        <div className="mb-6">
          <h3 className="mb-2 font-medium">
            Description
          </h3>
          <p className="text-muted-foreground">
            This {product.title.toLowerCase()} is in{" "}
            {product.condition.toLowerCase()} condition
            and available for pickup at {product.campus}.
            Contact the seller for details.
          </p>
        </div>

        {/* CATEGORY */}
        <span className="inline-block px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm">
          {product.category}
        </span>

      </div>

      {/* ---------- BOTTOM ACTION ---------- */}
      <div className="bg-card border-t border-border p-4">

        <button
          onClick={handleChat}
          className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
        >
          <MessageCircle className="w-5 h-5" />
          Chat with Seller
        </button>

      </div>

    </div>
  );
}
