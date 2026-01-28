import { ShoppingBag } from 'lucide-react';

export function SplashScreen() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-primary">
      <div className="animate-bounce">
        <ShoppingBag className="w-24 h-24 text-primary-foreground" strokeWidth={1.5} />
      </div>
      <h1 className="mt-6 text-4xl text-primary-foreground">
        Student Market
      </h1>
      <p className="mt-2 text-primary-foreground/80">Buy & Sell Locally</p>
    </div>
  );
}
