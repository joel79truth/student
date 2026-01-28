import { useState, useEffect } from 'react';
import { ArrowLeft, Camera, X, CreditCard, AlertCircle } from 'lucide-react';
import { supabase } from '../../supabase'; // your Supabase client

interface SellScreenProps {
  onBack: () => void;
}

const CATEGORIES = ['Electronics', 'Textbooks', 'Clothes', 'Dorm Items', 'Furniture', 'Books', 'Other'];
const CONDITIONS = ['New', 'Like New', 'Very Good', 'Good', 'Fair'];
const CAMPUSES = ['Main Campus', 'North Campus', 'South Campus', 'Downtown Campus'];

const FREE_UPLOADS_LIMIT = 3;
const UPLOAD_FEE = 300; // MK300

export function SellScreen({ onBack }: SellScreenProps) {
  const [images, setImages] = useState<string[]>([]); // UI previews
  const [imageFiles, setImageFiles] = useState<File[]>([]); // Files to upload
  const [isUploading, setIsUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentPhone, setPaymentPhone] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    price: '',
    category: '',
    condition: '',
    campus: '',
    description: ''
  });

  // Check user's upload count on mount
  useEffect(() => {
    checkUploadCount();
  }, []);

  // Check how many times the user has uploaded
  const checkUploadCount = async () => {
    try {
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      if (!currentUser.email) return;

      const sellerName = nameFromEmail(currentUser.email);

      // Count products uploaded by this user
      const { count, error } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('seller', sellerName);

      if (error) throw error;

      setUploadCount(count || 0);
      console.log(`User has uploaded ${count} products`);
    } catch (err) {
      console.error('Error checking upload count:', err);
    }
  };

  // Handle image selection
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const fileArray = Array.from(files);
    setImageFiles(prev => [...prev, ...fileArray].slice(0, 5));

    fileArray.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => [...prev, reader.result as string].slice(0, 5));
      };
      reader.readAsDataURL(file);
    });
  };

  // Remove image and file
  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Helper to extract a proper name from email
  function nameFromEmail(email: string) {
    const namePart = email.split('@')[0];           // Take before @
    const cleaned = namePart.replace(/[._-]+/g, ' '); // Replace dots/underscores/hyphens with spaces
    return cleaned
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize each word
      .join(' ');
  }

  // Handle payment process
  const handlePayment = async () => {
    if (!paymentPhone || paymentPhone.length < 9) {
      alert('Please enter a valid phone number');
      return;
    }

    setIsProcessingPayment(true);

    try {
      // TODO: Integrate with actual payment gateway
      // For Malawi, you might use:
      // - Paychangu (supports Airtel Money, TNM Mpamba)
      // - DPO PayGate
      // - TNM Mpamba API
      // - Airtel Money API

      // Mock payment process - Replace with actual payment gateway
      console.log(`Processing payment of MK${UPLOAD_FEE} from ${paymentPhone}`);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Record payment in database
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      const { error: paymentError } = await supabase.from('payments').insert([{
        user_email: currentUser.email,
        amount: UPLOAD_FEE,
        phone_number: paymentPhone,
        payment_type: 'upload_fee',
        status: 'completed',
        created_at: new Date().toISOString()
      }]);

      if (paymentError) throw paymentError;

      alert('Payment successful! You can now upload your item.');
      setShowPaymentModal(false);
      setPaymentPhone('');
      
      // Proceed with upload after successful payment
      await performUpload();
    } catch (err) {
      console.error('Payment error:', err);
      alert('Payment failed. Please try again.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Perform the actual upload
  const performUpload = async () => {
    if (imageFiles.length === 0) {
      alert('Please add at least one image.');
      return;
    }

    setIsUploading(true);

    try {
      const uploadedUrls: string[] = [];

      for (const file of imageFiles) {
        const filePath = `products/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);

        uploadedUrls.push(data.publicUrl);
      }

      // Get the user email from localStorage and convert to proper name
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      const sellerName = currentUser.email ? nameFromEmail(currentUser.email) : 'Anonymous';

      // Insert into products table
      const { error: dbError } = await supabase.from('products').insert([{
        ...formData,
        price: Number(formData.price),
        images: uploadedUrls,
        seller: sellerName,
        created_at: new Date().toISOString()
      }]);

      if (dbError) throw dbError;

      alert('Product listed successfully!');
      
      // Reset form
      setFormData({
        title: '',
        price: '',
        category: '',
        condition: '',
        campus: '',
        description: ''
      });
      setImages([]);
      setImageFiles([]);
      
      // Update upload count
      setUploadCount(prev => prev + 1);
      
      onBack();
    } catch (err) {
      console.error('Error uploading product:', err);
      alert('Error uploading product. Check console.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if user needs to pay
    if (uploadCount >= FREE_UPLOADS_LIMIT) {
      setShowPaymentModal(true);
      return;
    }

    // Free upload available
    await performUpload();
  };

  const remainingFreeUploads = Math.max(0, FREE_UPLOADS_LIMIT - uploadCount);
  const needsPayment = uploadCount >= FREE_UPLOADS_LIMIT;

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="bg-card border-b border-border p-4 flex items-center justify-between">
        <div className="flex items-center">
          <button onClick={onBack} className="p-2 hover:bg-accent rounded-lg -ml-2">
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

      {/* Upload Limit Notice */}
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
        {/* Image Upload */}
        <div className="mb-6">
          <label className="block text-sm mb-1">{images.length}/5 Photos Selected</label>
          <div className="grid grid-cols-3 gap-2">
            {images.map((image, index) => (
              <div key={index} className="relative aspect-square">
                <img
                  src={image}
                  alt={`Upload ${index + 1}`}
                  className="w-full h-full object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-1 right-1 p-1 bg-destructive rounded-full"
                >
                  <X className="w-4 h-4 text-destructive-foreground" />
                </button>
              </div>
            ))}

            {images.length < 5 && (
              <label className="aspect-square border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-accent/50 transition-colors">
                <Camera className="w-8 h-8 text-muted-foreground mb-1" />
                <span className="text-xs text-muted-foreground">Add Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        {/* Title */}
        <div className="mb-4">
          <label className="block text-sm mb-2">Title *</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full p-3 rounded-lg bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="e.g., iPhone 13 Pro - Excellent Condition"
            required
          />
        </div>

        {/* Price */}
        <div className="mb-4">
          <label className="block text-sm mb-2">Price (MK) *</label>
          <input
            type="number"
            step="0.01"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            className="w-full p-3 rounded-lg bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="0.00"
            required
          />
        </div>

        {/* Category */}
        <div className="mb-4">
          <label className="block text-sm mb-2">Category *</label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full p-3 rounded-lg bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-primary"
            required
          >
            <option value="">Select category</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Condition */}
        <div className="mb-4">
          <label className="block text-sm mb-2">Condition *</label>
          <select
            value={formData.condition}
            onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
            className="w-full p-3 rounded-lg bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-primary"
            required
          >
            <option value="">Select condition</option>
            {CONDITIONS.map(cond => (
              <option key={cond} value={cond}>{cond}</option>
            ))}
          </select>
        </div>

        {/* Campus */}
        <div className="mb-4">
          <label className="block text-sm mb-2">Campus *</label>
          <select
            value={formData.campus}
            onChange={(e) => setFormData({ ...formData, campus: e.target.value })}
            className="w-full p-3 rounded-lg bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-primary"
            required
          >
            <option value="">Select campus</option>
            {CAMPUSES.map(campus => (
              <option key={campus} value={campus}>{campus}</option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div className="mb-4">
          <label className="block text-sm mb-2">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full p-3 rounded-lg bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-primary h-32 resize-none"
            placeholder="Describe your item, include details like condition, reason for selling, etc."
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isUploading}
          className={`w-full p-3 bg-primary text-primary-foreground rounded-lg transition-all mb-4 flex items-center justify-center gap-2 ${
            isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
          }`}
        >
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
                onClick={() => setShowPaymentModal(false)}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
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
              <label className="block text-sm mb-2 font-medium">Mobile Money Number</label>
              <input
                type="tel"
                value={paymentPhone}
                onChange={(e) => setPaymentPhone(e.target.value)}
                placeholder="0888 123 456"
                className="w-full p-3 rounded-lg bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isProcessingPayment}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Enter your Airtel Money or TNM Mpamba number
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handlePayment}
                disabled={isProcessingPayment || !paymentPhone}
                className="w-full p-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isProcessingPayment ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Processing...
                  </span>
                ) : (
                  `Pay MK ${UPLOAD_FEE}`
                )}
              </button>

              <button
                onClick={() => setShowPaymentModal(false)}
                disabled={isProcessingPayment}
                className="w-full p-3 border border-border rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>

            <p className="text-xs text-center text-muted-foreground mt-4">
              You'll receive a prompt on your phone to complete the payment
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
