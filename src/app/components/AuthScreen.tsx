// AuthScreen.tsx
import { useState } from "react";
import { ShoppingBag } from "lucide-react";
import { auth, db } from "../../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";

interface AuthScreenProps {
  onLogin: () => void;
}

export function AuthScreen({ onLogin }: AuthScreenProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    campus: "",
    password: ""
  });

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      campus: "",
      password: ""
    });
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isSignUp) {
        // CREATE ACCOUNT
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          formData.email,
          formData.password
        );

        const user = userCredential.user;

        // SAVE USER PROFILE
        await setDoc(doc(db, "users", user.uid), {
          name: formData.name,
          phone: formData.phone,
          campus: formData.campus,
          email: formData.email
        });

        // SAVE TO LOCAL STORAGE
        localStorage.setItem(
          "currentUser",
          JSON.stringify({
            uid: user.uid,
            email: user.email,
            name: formData.name
          })
        );
      } else {
        // LOGIN
        const userCredential = await signInWithEmailAndPassword(
          auth,
          formData.email,
          formData.password
        );

        const user = userCredential.user;

        // FETCH PROFILE
        const snap = await getDoc(doc(db, "users", user.uid));

        const profile = snap.exists() ? snap.data() : {};

        // SAVE TO LOCAL STORAGE
        localStorage.setItem(
          "currentUser",
          JSON.stringify({
            uid: user.uid,
            email: user.email,
            name: profile?.name || ""
          })
        );
      }

      resetForm();
      onLogin();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background p-6">
      {/* Header */}
      <div className="flex flex-col items-center mt-12 mb-8">
        <ShoppingBag className="w-16 h-16 text-primary" strokeWidth={1.5} />
        <h1 className="mt-4 text-3xl">Cosemetics</h1>
        <p className="text-muted-foreground mt-2">
          Your campus marketplace
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-500 text-center mb-4">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        {isSignUp && (
          <div>
            <label className="block text-sm mb-2">Full Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full p-3 rounded-lg bg-input-background border border-border"
              placeholder="John Doe"
              required
            />
          </div>
        )}

        <div>
          <label className="block text-sm mb-2">
            {isSignUp ? "Student Email" : "Email"}
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            className="w-full p-3 rounded-lg bg-input-background border border-border"
            placeholder="student@university.edu"
            required
          />
        </div>

        {isSignUp && (
          <>
            <div>
              <label className="block text-sm mb-2">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="w-full p-3 rounded-lg bg-input-background border border-border"
                required
              />
            </div>

            <div>
              <label className="block text-sm mb-2">Campus</label>
              <select
                value={formData.campus}
                onChange={(e) =>
                  setFormData({ ...formData, campus: e.target.value })
                }
                className="w-full p-3 rounded-lg bg-input-background border border-border"
                required
              >
                <option value="">Select campus</option>
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
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            className="w-full p-3 rounded-lg bg-input-background border border-border"
            required
            minLength={6}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full p-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
        >
          {loading ? "Please wait..." : isSignUp ? "Sign Up" : "Log In"}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button
          onClick={() => {
            setIsSignUp(!isSignUp);
            resetForm();
          }}
          className="text-primary hover:underline"
        >
          {isSignUp
            ? "Already have an account? Log in"
            : "Don't have an account? Sign up"}
        </button>
      </div>
    </div>
  );
}
