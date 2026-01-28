import { useState, useEffect } from 'react';
import { Home, MessageCircle, PlusCircle, User } from 'lucide-react';

// Import screens
import { SplashScreen } from './components/SplashScreen';
import { AuthScreen } from './components/AuthScreen';
import { HomeScreen } from './components/HomeScreen';
import { SellScreen } from './components/SellScreen';
import { ChatScreen } from './components/ChatScreen';
import { ProfileScreen } from './components/ProfileScreen';

type Screen = 'splash' | 'auth' | 'home' | 'sell' | 'chat' | 'profile';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('splash');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Show splash screen for 2 seconds
    const timer = setTimeout(() => {
      const hasUser = localStorage.getItem('currentUser');
      if (hasUser) {
        setIsAuthenticated(true);
        setCurrentScreen('home');
      } else {
        setCurrentScreen('auth');
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
    setCurrentScreen('home');
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    setIsAuthenticated(false);
    setCurrentScreen('auth');
  };

  return (
    <div className="h-screen bg-background flex flex-col max-w-md mx-auto">
      {/* Render current screen */}
      {currentScreen === 'splash' && <SplashScreen />}
      {currentScreen === 'auth' && <AuthScreen onLogin={handleLogin} />}
      {currentScreen === 'home' && <HomeScreen />}
      {currentScreen === 'sell' && <SellScreen onBack={() => setCurrentScreen('home')} />}
      {currentScreen === 'chat' && <ChatScreen onBack={() => setCurrentScreen('home')} />}
      {currentScreen === 'profile' && <ProfileScreen onLogout={handleLogout} onBack={() => setCurrentScreen('home')} />}

      {/* Bottom Navigation */}
      {isAuthenticated && currentScreen !== 'auth' && currentScreen !== 'splash' && (
        <nav className="bg-card border-t border-border p-2 flex justify-around items-center">
          <button
            onClick={() => setCurrentScreen('home')}
            className={`flex flex-col items-center p-2 rounded-lg ${
              currentScreen === 'home' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <Home className="w-6 h-6" />
            <span className="text-xs mt-1">Home</span>
          </button>
          
          <button
            onClick={() => setCurrentScreen('sell')}
            className={`flex flex-col items-center p-2 rounded-lg ${
              currentScreen === 'sell' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <PlusCircle className="w-6 h-6" />
            <span className="text-xs mt-1">Sell</span>
          </button>
          
          <button
            onClick={() => setCurrentScreen('chat')}
            className={`flex flex-col items-center p-2 rounded-lg ${
              currentScreen === 'chat' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <MessageCircle className="w-6 h-6" />
            <span className="text-xs mt-1">Chat</span>
          </button>
          
          <button
            onClick={() => setCurrentScreen('profile')}
            className={`flex flex-col items-center p-2 rounded-lg ${
              currentScreen === 'profile' ? 'text-primary' : 'text-muted-foreground'
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
