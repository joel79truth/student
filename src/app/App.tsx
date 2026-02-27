import { useState, useEffect } from "react";
import { Home, MessageCircle, PlusCircle, User } from "lucide-react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import { requestNotificationPermission, removeTokenFromFirestore } from "../lib/notifications";

// Screens
import { SplashScreen } from "../app/components/SplashScreen";
import { AuthScreen } from "../app/components/AuthScreen";
import { HomeScreen } from "../app/components/HomeScreen";
import { SellScreen } from "../app/components/SellScreen";
import { ChatScreen } from "../app/components/ChatScreen";
import { ProfileScreen } from "../app/components/ProfileScreen";
import { JSX } from "react/jsx-runtime";

type Screen = "splash" | "auth" | "home" | "sell" | "chat" | "profile";

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("splash");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // ✅ Handle PayChangu redirect from URL parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");

    if (payment === "success") {
      setCurrentScreen("sell");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // ✅ Firebase auth listener + request notification permission
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthLoading(false);

      if (user) {
        setIsAuthenticated(true);
        setCurrentScreen((prev) =>
          prev === "splash" || prev === "auth" ? "home" : prev
        );

        try {
          await requestNotificationPermission(user.uid);
        } catch (error) {
          console.error("Failed to set up notifications:", error);
        }
      } else {
        setIsAuthenticated(false);
        setCurrentScreen("auth");
      }
    });

    return () => unsubscribe();
  }, []);

  // ✅ Global redirect to sell screen if a pending upload exists
  useEffect(() => {
    // Wait for auth to be determined
    if (authLoading) return;

    const pending = localStorage.getItem("pending_upload");
    if (!pending) return;

    try {
      const data = JSON.parse(pending);
      const isRecent = Date.now() - data.timestamp < 60 * 60 * 1000; // 1 hour

      if (isRecent && isAuthenticated && currentScreen !== "sell") {
        setCurrentScreen("sell");
      } else if (!isRecent) {
        // Remove stale pending upload
        localStorage.removeItem("pending_upload");
      }
    } catch (e) {
      localStorage.removeItem("pending_upload");
    }
  }, [authLoading, isAuthenticated, currentScreen]);

  // ✅ Splash screen timer
  useEffect(() => {
    if (authLoading) return;

    const timer = setTimeout(() => {
      if (currentScreen === "splash") {
        setCurrentScreen(isAuthenticated ? "home" : "auth");
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [authLoading, isAuthenticated, currentScreen]);

  // ✅ External chat navigation listener
  useEffect(() => {
    const handleNavigateToChat = () => {
      setCurrentScreen("chat");
    };

    window.addEventListener("navigate-to-chat", handleNavigateToChat);
    return () => window.removeEventListener("navigate-to-chat", handleNavigateToChat);
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
    setCurrentScreen("home");
  };

  const handleLogout = async () => {
    try {
      // Remove FCM token and clear pending upload
      if (auth.currentUser) {
        await removeTokenFromFirestore(auth.currentUser.uid);
      }
      localStorage.removeItem("pending_upload"); // ← clear pending upload on logout
      await signOut(auth);
      setIsAuthenticated(false);
      setCurrentScreen("auth");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  return (
    <div className="h-screen bg-background flex flex-col max-w-md mx-auto">
      {/* Screens */}
      {currentScreen === "splash" && <SplashScreen />}
      {currentScreen === "auth" && <AuthScreen onLogin={handleLogin} />}
      {currentScreen === "home" && <HomeScreen />}
      {currentScreen === "sell" && (
        <SellScreen onBack={() => setCurrentScreen("home")} />
      )}
      {currentScreen === "chat" && (
        <ChatScreen onBack={() => setCurrentScreen("home")} />
      )}
      {currentScreen === "profile" && (
        <ProfileScreen onLogout={handleLogout} onBack={() => setCurrentScreen("home")} />
      )}

      {/* Bottom Navigation */}
      {isAuthenticated && currentScreen !== "auth" && currentScreen !== "splash" && (
        <nav className="bg-card border-t border-border p-2 flex justify-around items-center">
          <NavButton
            label="Home"
            icon={<Home className="w-6 h-6" />}
            active={currentScreen === "home"}
            onClick={() => setCurrentScreen("home")}
          />
          <NavButton
            label="Sell"
            icon={<PlusCircle className="w-6 h-6" />}
            active={currentScreen === "sell"}
            onClick={() => setCurrentScreen("sell")}
          />
          <NavButton
            label="Chat"
            icon={<MessageCircle className="w-6 h-6" />}
            active={currentScreen === "chat"}
            onClick={() => setCurrentScreen("chat")}
          />
          <NavButton
            label="Profile"
            icon={<User className="w-6 h-6" />}
            active={currentScreen === "profile"}
            onClick={() => setCurrentScreen("profile")}
          />
        </nav>
      )}
    </div>
  );
}

function NavButton({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: JSX.Element;
  active: boolean;
  onClick: () => void;
}) {
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
