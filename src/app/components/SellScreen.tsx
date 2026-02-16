import { useState, useEffect } from 'react';
import { ArrowLeft, Camera, X, CreditCard, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { auth } from '../../lib/firebase'; // Add Firebase auth
import { getCurrentUserData } from '../../lib/userService'; // To get user's actual name

const API_BASE =
  import.meta.env.MODE === "production"
    ? "https://student-1-5tjj.onrender.com"
    : "http://localhost:5000";

interface SellScreenProps {
  onBack: () => void;
}

interface FormData {
  title: string;
  price: string;
  category: string;
  condition: string;
  campus: string;
  description: string;
}

interface PendingUpload {
  formData: FormData;
  images: string[];
  timestamp: number;
  reference: string;
}

const CATEGORIES = ['Food', 'Electronics', 'Clothes', 'Books', 'Other'];
const CONDITIONS = ['New', 'Like New', 'Very Good', 'Good', 'Fair'];
const CAMPUSES = ['Bunda Campus', 'NRC Campus', 'City Campus', 'other'];

const FREE_UPLOADS_LIMIT = 3;
const UPLOAD_FEE = 300;

export function SellScreen({ onBack }: SellScreenProps) {
  const [images, setImages] = useState<string[]>([]);
  const [, setImageFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentPhone, setPaymentPhone] = useState('');

  const [formData, setFormData] = useState<FormData>({
    title: '',
    price: '',
    category: '',
    condition: '',
    campus: '',
    description: ''
  });

  // --- FIX: Get current user from Firebase ---
  const currentUser = auth.currentUser;

  // Check how many products the user has uploaded
  const checkUploadCount = async (): Promise<void> => {
    try {
      if (!currentUser?.email) return;

      // Count by sellerEmail (more reliable than seller name)
      const { count, error } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('sellerEmail', currentUser.email); // Use email for counting

      if (error) throw error;
      setUploadCount(count || 0);
    } catch (err) {
      console.error('Error checking upload count:', err);
    }
  };

  // Payment verification function
  const verifyPayment = async (reference: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/verify-payment/${reference}`);
      if (!response.ok) {
        console.log('Payment verification API call failed');
        return true; // fallback
      }
      const data = await response.json();
      return data.status === 'successful' || data.data?.status === 'successful';
    } catch (error) {
      console.error('Payment verification error:', error);
      return true;
    }
  };

  // Perform upload to Supabase AFTER payment
  const performUpload = async (isAfterPayment: boolean = false): Promise<void> => {
    if (!currentUser) {
      alert('You must be logged in to list an item.');
      return;
    }

    if (images.length === 0) {
      alert('Please add at least one image.');
      return;
    }

    if (!formData.title || !formData.price || !formData.category || !formData.condition || !formData.campus) {
      alert('Please fill in all required fields.');
      return;
    }

    setIsUploading(true);

    try {
      // --- FIX: Get user's actual name from Firestore ---
      const userData = await getCurrentUserData(currentUser);
      const sellerName = userData?.name || currentUser.email?.split('@')[0] || 'Anonymous';
      const sellerEmail = currentUser.email; // always available if logged in
      const sellerId = currentUser.uid; // Firebase UID

      const uploadedUrls: string[] = [];

      // Upload images
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        const blob = await fetch(image).then(res => res.blob());
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
        const filePath = `products/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, blob, { contentType: 'image/jpeg', upsert: false });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);

        uploadedUrls.push(data.publicUrl);
      }

      // Insert product with seller email and ID
      const { error: dbError } = await supabase
        .from('products')
        .insert([{
          title: formData.title,
          price: parseFloat(formData.price),
          category: formData.category,
          condition: formData.condition,
          campus: formData.campus,
          description: formData.description,
          images: uploadedUrls,
          seller: sellerName,           // Display name
          sellerEmail: sellerEmail,      // Email for chat resolution
          sellerId: sellerId,            // Firebase UID (optional but useful)
          created_at: new Date().toISOString(),
          payment_status: isAfterPayment ? 'paid' : 'free'
        }]);

      if (dbError) throw dbError;

      alert('Product listed successfully!');

      // Reset
      setFormData({ title: '', price: '', category: '', condition: '', campus: '', description: '' });
      setImages([]);
      setImageFiles([]);
      localStorage.removeItem('pending_upload');
      localStorage.removeItem('upload_done');

      await checkUploadCount();
      onBack();

    } catch (err) {
      console.error('Error uploading product:', err);
      alert('Error uploading product. Please try again.');
      throw err;
    } finally {
      setIsUploading(false);
    }
  };

  // Payment handler
  const handlePayment = async (): Promise<void> => {
    if (!paymentPhone || paymentPhone.length < 9) {
      alert('Please enter a valid phone number');
      return;
    }

    setIsProcessingPayment(true);
    setShowPaymentModal(false);

    try {
      const reference = `UPLOADFEE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const pendingData: PendingUpload = { 
        formData, 
        images,
        timestamp: Date.now(),
        reference 
      };
      localStorage.setItem('pending_upload', JSON.stringify(pendingData));
      localStorage.removeItem('upload_done');

      const response = await fetch(`${API_BASE}/create-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          amount: UPLOAD_FEE, 
          phone: paymentPhone, 
          reference 
        })
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Payment initialization failed: ${text.substring(0, 100)}`);
      }

      const result = await response.json();
      if (result?.status === 'success' && result?.data?.checkout_url) {
        window.location.href = result.data.checkout_url;
      } else {
        throw new Error(result.message || 'Payment initialization failed');
      }

    } catch (err: any) {
      console.error('Payment Error:', err);
      alert(`Payment Error: ${err.message}`);
      setIsProcessingPayment(false);
      setShowPaymentModal(true);
    }
  };

  // Handle image selection
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const files = e.target.files;
    if (!files) return;

    const fileArray = Array.from(files);
    const remainingSlots = 5 - images.length;
    const filesToAdd = fileArray.slice(0, remainingSlots);

    setImageFiles(prev => [...prev, ...filesToAdd]);

    filesToAdd.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => prev.length < 5 ? [...prev, reader.result as string] : prev);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number): void => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (!currentUser) {
      alert('Please log in to list an item.');
      return;
    }

    if (uploadCount >= FREE_UPLOADS_LIMIT) {
      setShowPaymentModal(true);
      return;
    }

    await performUpload(false);
  };

  // Handle payment success and auto-upload
  useEffect(() => {
    checkUploadCount();

    const handlePaymentSuccess = async () => {
      const params = new URLSearchParams(window.location.search);
      const paymentStatus = params.get('payment');
      const txRef = params.get('tx_ref');

      if (paymentStatus === 'success' && txRef) {
        const pending = localStorage.getItem('pending_upload');
        const alreadyUploaded = localStorage.getItem('upload_done');

        if (pending && !alreadyUploaded) {
          try {
            window.history.replaceState({}, document.title, window.location.pathname);
            
            const pendingData: PendingUpload = JSON.parse(pending);
            
            const isPaymentVerified = await verifyPayment(pendingData.reference);
            
            if (!isPaymentVerified) {
              alert('Payment verification failed. Please contact support.');
              localStorage.removeItem('pending_upload');
              return;
            }
            
            setFormData(pendingData.formData);
            setImages(pendingData.images);
            localStorage.setItem('upload_done', 'true');
            
            setIsUploading(true);
            
            await new Promise(resolve => setTimeout(resolve, 100));
            
            await performUpload(true);
            
            localStorage.removeItem('pending_upload');
            localStorage.removeItem('upload_done');
            
          } catch (err) {
            console.error('Auto-upload failed:', err);
            alert('Failed to complete upload after payment. Please try again or contact support.');
            setIsUploading(false);
            localStorage.removeItem('upload_done');
          }
        }
      }
    };

    handlePaymentSuccess();
  }, []);

  // Clean up old pending uploads
  useEffect(() => {
    const pending = localStorage.getItem('pending_upload');
    if (pending) {
      try {
        const data = JSON.parse(pending);
        if (Date.now() - data.timestamp > 3600000) {
          localStorage.removeItem('pending_upload');
          localStorage.removeItem('upload_done');
        }
      } catch (e) {
        localStorage.removeItem('pending_upload');
        localStorage.removeItem('upload_done');
      }
    }
  }, []);

  const remainingFreeUploads = Math.max(0, FREE_UPLOADS_LIMIT - uploadCount);
  const needsPayment = uploadCount >= FREE_UPLOADS_LIMIT;

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="bg-card border-b border-border p-4 flex items-center justify-between">
        <div className="flex items-center">
          <button onClick={onBack} className="p-2 hover:bg-accent rounded-lg -ml-2" type="button">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl ml-4">List an Item</h1>
        </div>
        {remainingFreeUploads > 0 && (
          <div className="bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm font-medium">
            {remainingFreeUploads} free {remainingFreeUploads === 1 ? 'upload' : 'uploads'} left
          </div>
        )}
      </div>

      {/* Upload limit notice */}
      {needsPayment && (
        <div className="bg-orange-50 border-l-4 border-orange-400 p-4 m-4 rounded-r-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-orange-900">Free uploads used</h3>
              <p className="text-sm text-orange-700 mt-1">
                You've used your {FREE_UPLOADS_LIMIT} free uploads. Pay MK{UPLOAD_FEE} to list this item.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4">
        {/* Images */}
        <div className="mb-6">
          <label className="block text-sm mb-1 font-medium">{images.length}/5 Photos Selected</label>
          <div className="grid grid-cols-3 gap-2">
            {images.map((image, index) => (
              <div key={index} className="relative aspect-square">
                <img src={image} alt={`Upload ${index + 1}`} className="w-full h-full object-cover rounded-lg" />
                <button type="button" onClick={() => removeImage(index)} className="absolute top-1 right-1 p-1 bg-destructive rounded-full hover:opacity-80 transition-opacity">
                  <X className="w-4 h-4 text-destructive-foreground" />
                </button>
              </div>
            ))}
            {images.length < 5 && (
              <label className="aspect-square border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-accent/50 transition-colors">
                <Camera className="w-8 h-8 text-muted-foreground mb-1" />
                <span className="text-xs text-muted-foreground">Add Photo</span>
                <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
              </label>
            )}
          </div>
        </div>

        {/* Title */}
        <div className="mb-4">
          <label className="block text-sm mb-2 font-medium">Title *</label>
          <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full p-3 rounded-lg bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="e.g., iPhone 13 Pro - Excellent Condition" required />
        </div>

        {/* Price */}
        <div className="mb-4">
          <label className="block text-sm mb-2 font-medium">Price (MK) *</label>
          <input type="number" step="0.01" min="0" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            className="w-full p-3 rounded-lg bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="0.00" required />
        </div>

        {/* Category, Condition, Campus, Description */}
        <div className="mb-4">
          <label className="block text-sm mb-2 font-medium">Category *</label>
          <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} required
            className="w-full p-3 rounded-lg bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="">Select category</option>
            {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-sm mb-2 font-medium">Condition *</label>
          <select value={formData.condition} onChange={(e) => setFormData({ ...formData, condition: e.target.value })} required
            className="w-full p-3 rounded-lg bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="">Select condition</option>
            {CONDITIONS.map(cond => <option key={cond} value={cond}>{cond}</option>)}
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-sm mb-2 font-medium">Campus *</label>
          <select value={formData.campus} onChange={(e) => setFormData({ ...formData, campus: e.target.value })} required
            className="w-full p-3 rounded-lg bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="">Select campus</option>
            {CAMPUSES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-sm mb-2 font-medium">Description</label>
          <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full p-3 rounded-lg bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-primary h-32 resize-none"
            placeholder="Describe your item" />
        </div>

        {/* Submit */}
        <button type="submit" disabled={isUploading}
          className={`w-full p-3 bg-primary text-primary-foreground rounded-lg transition-all mb-4 flex items-center justify-center gap-2 font-medium ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}`}>
          {needsPayment && <CreditCard className="w-5 h-5" />}
          {isUploading ? 'Uploading...' : needsPayment ? `Pay MK${UPLOAD_FEE} & List Item` : 'List Item'}
        </button>
      </form>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold">Payment Required</h2>
              <button 
                type="button" 
                onClick={() => setShowPaymentModal(false)} 
                className="p-2 hover:bg-accent rounded-lg" 
                disabled={isProcessingPayment}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Upload Fee:</span>
                <span className="text-2xl font-bold text-primary">MK {UPLOAD_FEE}</span>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm mb-2 font-medium">Mobile Money Number *</label>
              <input 
                type="tel" 
                value={paymentPhone} 
                onChange={(e) => setPaymentPhone(e.target.value)}
                placeholder="0888 123 456" 
                className="w-full p-3 rounded-lg bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-primary" 
                disabled={isProcessingPayment} 
              />
              <p className="text-xs text-muted-foreground mt-1">Enter your mobile money number to receive payment prompt</p>
            </div>

            <div className="space-y-3">
              <button 
                type="button" 
                onClick={handlePayment} 
                disabled={isProcessingPayment || !paymentPhone}
                className="w-full p-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isProcessingPayment ? 'Processing...' : `Pay MK ${UPLOAD_FEE}`}
              </button>

              <button 
                type="button" 
                onClick={() => setShowPaymentModal(false)} 
                disabled={isProcessingPayment}
                className="w-full p-3 border border-border rounded-lg hover:bg-accent transition-colors"
              >
                Cancel
              </button>
            </div>

            {isProcessingPayment && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700 text-center">
                  Redirecting to payment page...
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}