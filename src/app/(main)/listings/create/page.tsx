'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LISTING_CATEGORIES, PRODUCT_AGE_BRACKETS, PROHIBITED_KEYWORDS } from '@/lib/constants';
import PhotoUpload from '@/components/listings/PhotoUpload';
import { getErrorMessage } from '@/lib/errors';

export default function CreateListingPage() {
  const router = useRouter();
  const [photos, setPhotos] = useState<File[]>([]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>(LISTING_CATEGORIES[0]);
  const [askingPrice, setAskingPrice] = useState('');
  const [productAge, setProductAge] = useState<string>(PRODUCT_AGE_BRACKETS[0]);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const validateForm = () => {
    setError(null);
    setWarning(null);

    if (photos.length === 0) {
      setError('At least one photo is required.');
      return false;
    }
    if (title.length < 3) {
      setError('Title must be at least 3 characters long.');
      return false;
    }
    const price = Number(askingPrice);
    if (isNaN(price) || price <= 0) {
      setError('Asking price must be greater than 0.');
      return false;
    }

    const textToCheck = `${title} ${description}`.toLowerCase();
    const hasProhibited = PROHIBITED_KEYWORDS.some(keyword => textToCheck.includes(keyword.toLowerCase()));
    
    if (hasProhibited) {
      setWarning('Your listing contains words that might violate community guidelines. It may be reviewed.');
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    const supabase = createClient();

    try {
      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (authError || !userData.user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('banned')
        .eq('id', userData.user.id)
        .single();

      if (profile?.banned) {
        throw new Error('Your account is restricted from creating listings.');
      }

      // Upload photos
      const photoUrls: string[] = [];
      for (const file of photos) {
        // Extension from the MIME type, not the user-supplied file name.
        const fileExt = file.type.split('/')[1] || 'jpg';
        const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `${userData.user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('listing-photos')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('listing-photos')
          .getPublicUrl(filePath);
          
        photoUrls.push(publicUrlData.publicUrl);
      }

      // Insert listing
      const { data: newListing, error: insertError } = await supabase
        .from('listings')
        .insert({
          title,
          description,
          category,
          asking_price: Number(askingPrice),
          product_age: productAge,
          photos: photoUrls,
          seller_id: userData.user.id,
          status: 'active'
        })
        .select()
        .single();

      if (insertError) throw insertError;

      router.push(`/listings/${newListing.id}`);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create listing'));
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Create New Listing</h1>
        <p className="text-slate-400">Sell your items to the campus community.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 glass-card p-6 md:p-8 rounded-2xl">
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-start gap-3">
            <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>{error}</p>
          </div>
        )}
        
        {warning && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-start gap-3">
            <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p>{warning}</p>
          </div>
        )}

        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-300">
            Photos <span className="text-red-400">*</span>
          </label>
          <PhotoUpload photos={photos} onChange={setPhotos} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3 md:col-span-2">
            <label htmlFor="title" className="block text-sm font-medium text-slate-300">
              Listing Title <span className="text-red-400">*</span>
            </label>
            <input
              id="title"
              type="text"
              required
              placeholder="What are you selling?"
              className="input-field w-full text-lg"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <label htmlFor="category" className="block text-sm font-medium text-slate-300">
              Category <span className="text-red-400">*</span>
            </label>
            <select
              id="category"
              className="input-field w-full bg-slate-900 text-slate-200 border-white/10 appearance-none"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {LISTING_CATEGORIES.map((cat) => (
                <option key={cat} value={cat} className="bg-slate-900 text-slate-200">{cat}</option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <label htmlFor="price" className="block text-sm font-medium text-slate-300">
              Asking Price (₹) <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">₹</span>
              <input
                id="price"
                type="number"
                required
                min="1"
                className="input-field w-full pl-8"
                placeholder="0.00"
                value={askingPrice}
                onChange={(e) => setAskingPrice(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3 md:col-span-2">
            <label htmlFor="age" className="block text-sm font-medium text-slate-300">
              Product Age <span className="text-red-400">*</span>
            </label>
            <select
              id="age"
              className="input-field w-full bg-slate-900 text-slate-200 border-white/10 appearance-none"
              value={productAge}
              onChange={(e) => setProductAge(e.target.value)}
            >
              {PRODUCT_AGE_BRACKETS.map((age) => (
                <option key={age} value={age} className="bg-slate-900 text-slate-200">{age}</option>
              ))}
            </select>
          </div>

          <div className="space-y-3 md:col-span-2">
            <label htmlFor="description" className="block text-sm font-medium text-slate-300">
              Description & Availability
            </label>
            <textarea
              id="description"
              rows={4}
              placeholder="Describe the condition, reason for selling, and when you are available to meet..."
              className="input-field w-full resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            ></textarea>
          </div>
        </div>

        <div className="pt-6 border-t border-white/10 flex justify-end gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="btn-ghost px-6"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary px-8"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Publishing...
              </span>
            ) : (
              'Publish Listing'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
