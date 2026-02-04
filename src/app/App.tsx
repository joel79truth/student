import { useState, useEffect } from "react";
import { Home, MessageCircle, PlusCircle, User } from "lucide-react";

// Import screens
import { SplashScreen } from "./components/SplashScreen";
import { AuthScreen } from "./components/AuthScreen";
import { HomeScreen } from "./components/HomeScreen";
import { SellScreen } from "./components/SellScreen";
import { ChatScreen } from "./components/ChatScreen";
import { ProfileScreen } from "./components/ProfileScreen";

type Screen = "splash" | "auth" | "home" | "sell" | "chat" | "profile";

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("splash");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // ---------------------- EFFECTS ----------------------
  useEffect(() => {
    // Show splash screen for 2 seconds
    const timer = setTimeout(() => {
      const hasUser = localStorage.getItem("currentUser");
      if (hasUser) {
        setIsAuthenticated(true);
        setCurrentScreen("home");
      } else {
        setCurrentScreen("auth");
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // ---------------------- HANDLERS ----------------------
  const handleLogin = () => {
    setIsAuthenticated(true);
    setCurrentScreen("home");
  };

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    setIsAuthenticated(false);
    setCurrentScreen("auth");
  };

  const openChat = () => setCurrentScreen("chat");

  // ---------------------- RENDER ----------------------
  return (
    <div className="h-screen bg-background flex flex-col max-w-md mx-auto">
      {/* Screens */}
      {currentScreen === "splash" && <SplashScreen />}
      {currentScreen === "auth" && <AuthScreen onLogin={handleLogin} />}
      {currentScreen === "home" && <HomeScreen onOpenChat={openChat} />}
      {currentScreen === "sell" && <SellScreen onBack={() => setCurrentScreen("home")} />}
      {currentScreen === "chat" && <ChatScreen onBack={() => setCurrentScreen("home")} />}
      {currentScreen === "profile" && (
        <ProfileScreen onLogout={handleLogout} onBack={() => setCurrentScreen("home")} />
      )}

      {/* Bottom Navigation */}
      {isAuthenticated && currentScreen !== "auth" && currentScreen !== "splash" && (
        <nav className="bg-card border-t border-border p-2 flex justify-around items-center">
          <NavButton
            icon={<Home className="w-6 h-6" />}
            label="Home"
            active={currentScreen === "home"}
            onClick={() => setCurrentScreen("home")}
          />
          <NavButton
            icon={<PlusCircle className="w-6 h-6" />}
            label="Sell"
            active={currentScreen === "sell"}
            onClick={() => setCurrentScreen("sell")}
          />
          <NavButton
            icon={<MessageCircle className="w-6 h-6" />}
            label="Chat"
            active={currentScreen === "chat"}
            onClick={() => setCurrentScreen("chat")}
          />
          <NavButton
            icon={<User className="w-6 h-6" />}
            label="Profile"
            active={currentScreen === "profile"}
            onClick={() => setCurrentScreen("profile")}
          />
        </nav>
      )}
    </div>
  );
}

// ---------------------- NAV BUTTON COMPONENT ----------------------
interface NavButtonProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

function NavButton({ icon, label, active, onClick }: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center p-2 rounded-lg ${
        active ? "text-primary" : "text-muted-foreground"
      }`}
    >
      {icon}
      <span className="text-xs mt-1">{label}</span>
    </button>
  );
}
