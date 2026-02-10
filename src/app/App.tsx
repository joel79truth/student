import { useState, useEffect } from "react";
import {
  Home,
  MessageCircle,
  PlusCircle,
  User,
} from "lucide-react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../lib/firebase";

// Import screens
import { SplashScreen } from "../app/components/SplashScreen";
import { AuthScreen } from "../app/components/AuthScreen";
import { HomeScreen } from "../app/components/HomeScreen";
import { SellScreen } from "../app/components/SellScreen";
import { ChatScreen } from "../app/components/ChatScreen";
import { ProfileScreen } from "../app/components/ProfileScreen";

type Screen =
  | "splash"
  | "auth"
  | "home"
  | "sell"
  | "chat"
  | "profile";

export default function App() {
  const [currentScreen, setCurrentScreen] =
    useState<Screen>("splash");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    // Listen to Firebase Auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthLoading(false);
      if (user) {
        setIsAuthenticated(true);
        if (currentScreen === "splash" || currentScreen === "auth") {
          setCurrentScreen("home");
        }
      } else {
        setIsAuthenticated(false);
        if (currentScreen !== "splash") {
          setCurrentScreen("auth");
        }
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Show splash screen for 2 seconds
    const timer = setTimeout(() => {
      if (!authLoading && currentScreen === "splash") {
        setCurrentScreen(isAuthenticated ? "home" : "auth");
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    // Listen for navigation to chat from other screens
    const handleNavigateToChat = () => {
      setCurrentScreen("chat");
    };

    window.addEventListener(
      "navigate-to-chat",
      handleNavigateToChat,
    );
    return () =>
      window.removeEventListener(
        "navigate-to-chat",
        handleNavigateToChat,
      );
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
    setCurrentScreen("home");
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsAuthenticated(false);
      setCurrentScreen("auth");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <div className="h-screen bg-background flex flex-col max-w-md mx-auto">
      {/* Render current screen */}
      {currentScreen === "splash" && <SplashScreen />}
      {currentScreen === "auth" && (
        <AuthScreen onLogin={handleLogin} />
      )}
      {currentScreen === "home" && <HomeScreen />}
      {currentScreen === "sell" && (
        <SellScreen onBack={() => setCurrentScreen("home")} />
      )}
      {currentScreen === "chat" && (
        <ChatScreen onBack={() => setCurrentScreen("home")} />
      )}
      {currentScreen === "profile" && (
        <ProfileScreen
          onLogout={handleLogout}
          onBack={() => setCurrentScreen("home")}
        />
      )}

      {/* Bottom Navigation */}
      {isAuthenticated &&
        currentScreen !== "auth" &&
        currentScreen !== "splash" && (
          <nav className="bg-card border-t border-border p-2 flex justify-around items-center">
            <button
              onClick={() => setCurrentScreen("home")}
              className={`flex flex-col items-center p-2 rounded-lg ${
                currentScreen === "home"
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <Home className="w-6 h-6" />
              <span className="text-xs mt-1">Home</span>
            </button>

            <button
              onClick={() => setCurrentScreen("sell")}
              className={`flex flex-col items-center p-2 rounded-lg ${
                currentScreen === "sell"
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <PlusCircle className="w-6 h-6" />
              <span className="text-xs mt-1">Sell</span>
            </button>

            <button
              onClick={() => setCurrentScreen("chat")}
              className={`flex flex-col items-center p-2 rounded-lg ${
                currentScreen === "chat"
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <MessageCircle className="w-6 h-6" />
              <span className="text-xs mt-1">Chat</span>
            </button>

            <button
              onClick={() => setCurrentScreen("profile")}
              className={`flex flex-col items-center p-2 rounded-lg ${
                currentScreen === "profile"
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <User className="w-6 h-6" />
              <span className="text-xs mt-1">Profile</span>
            </button>
          </nav>
        )}
    </div>
  );
}