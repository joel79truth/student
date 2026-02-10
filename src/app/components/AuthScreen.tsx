import { useState } from 'react';
import { ShoppingBag, Loader2 } from 'lucide-react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  AuthError
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';

interface AuthScreenProps {
  onLogin: () => void;
}

export function AuthScreen({ onLogin }: AuthScreenProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    campus: '',
    password: ''
  });

  const getErrorMessage = (error: AuthError) => {
    switch (error.code) {
      case 'auth/email-already-in-use':
        return 'This email is already registered. Please log in instead.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters.';
      case 'auth/user-not-found':
        return 'No account found with this email.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/invalid-credential':
        return 'Invalid email or password. Please try again.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      default:
        return 'An error occurred. Please try again.';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      if (isSignUp) {
        // Create new user account
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          formData.email,
          formData.password
        );
        
        // Store additional user data in Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          uid: userCredential.user.uid,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          campus: formData.campus,
          createdAt: new Date().toISOString(),
          avatar: formData.name[0].toUpperCase()
        });
        
        // Also store with email as key for easier lookups in chat
        await setDoc(doc(db, 'users', formData.email), {
          uid: userCredential.user.uid,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          campus: formData.campus,
          createdAt: new Date().toISOString(),
          avatar: formData.name[0].toUpperCase()
        });
        
      } else {
        // Sign in existing user
        await signInWithEmailAndPassword(
          auth,
          formData.email,
          formData.password
        );
      }
      
      onLogin();
    } catch (err: any) {
      console.error('Authentication error:', err);
      setError(getErrorMessage(err as AuthError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background p-6 overflow-y-auto">
      <div className="flex flex-col items-center mt-12 mb-8">
        <ShoppingBag className="w-16 h-16 text-primary" strokeWidth={1.5} />
        <h1 className="mt-4 text-3xl">Student Market</h1>
        <p className="text-muted-foreground mt-2">Your campus marketplace</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {isSignUp && (
          <div>
            <label className="block text-sm mb-2">Full Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-3 rounded-lg bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="John Doe"
              required={isSignUp}
              disabled={loading}
            />
          </div>
        )}

        <div>
          <label className="block text-sm mb-2">
            {isSignUp ? 'Student Email' : 'Email'}
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full p-3 rounded-lg bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="student@university.edu"
            required
            disabled={loading}
          />
        </div>

        {isSignUp && (
          <>
            <div>
              <label className="block text-sm mb-2">Phone Number</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full p-3 rounded-lg bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="+1 (555) 000-0000"
                required={isSignUp}
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm mb-2">Campus</label>
              <select
                value={formData.campus}
                onChange={(e) => setFormData({ ...formData, campus: e.target.value })}
                className="w-full p-3 rounded-lg bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                required={isSignUp}
                disabled={loading}
              >
                <option value="">Select your campus</option>
                <option value="Main Campus">Main Campus</option>
                <option value="North Campus">North Campus</option>
                <option value="South Campus">South Campus</option>
                <option value="Downtown Campus">Downtown Campus</option>
              </select>
            </div>
          </>
        )}

        <div>
          <label className="block text-sm mb-2">Password</label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="w-full p-3 rounded-lg bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="••••••••"
            required
            minLength={6}
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full p-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity mt-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {isSignUp ? 'Creating account...' : 'Logging in...'}
            </>
          ) : (
            <>{isSignUp ? 'Sign Up' : 'Log In'}</>
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button
          onClick={() => {
            setIsSignUp(!isSignUp);
            setError('');
          }}
          disabled={loading}
          className="text-primary hover:underline disabled:opacity-50"
        >
          {isSignUp
            ? 'Already have an account? Log in'
            : "Don't have an account? Sign up"}
        </button>
      </div>

      {isSignUp && (
        <p className="text-xs text-muted-foreground mt-6 text-center">
          By signing up, you agree to verify your student status via email verification
        </p>
      )}
    </div>
  );
}