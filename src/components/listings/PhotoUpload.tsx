'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';

interface PhotoUploadProps {
  photos: File[];
  onChange: (photos: File[]) => void;
}

const MAX_PHOTOS = 5;
const MAX_SIZE_MB = 5;
// Must match allowed_mime_types on the storage buckets (migration 005).
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export default function PhotoUpload({ photos, onChange }: PhotoUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const processFiles = useCallback((files: FileList | File[]) => {
    setError(null);
    
    if (photos.length + files.length > MAX_PHOTOS) {
      setError(`You can only upload a maximum of ${MAX_PHOTOS} photos.`);
      return;
    }

    const validFiles: File[] = [];
    const newPhotos = Array.from(files);

    for (const file of newPhotos) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError('Only JPEG, PNG, WebP or GIF images are allowed.');
        continue;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setError(`File ${file.name} is too large. Maximum size is ${MAX_SIZE_MB}MB.`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      onChange([...photos, ...validFiles].slice(0, MAX_PHOTOS));
    }
  }, [photos, onChange]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const removePhoto = (indexToRemove: number) => {
    onChange(photos.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      {photos.length < MAX_PHOTOS && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
            isDragging 
              ? 'border-emerald-500 bg-emerald-500/10' 
              : 'border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-slate-600'
          }`}
        >
          <input
            type="file"
            accept={ALLOWED_TYPES.join(',')}
            multiple
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            title="Upload photos"
          />
          <div className="flex flex-col items-center gap-2 pointer-events-none">
            <svg className={`w-10 h-10 ${isDragging ? 'text-emerald-400' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-white font-medium">Click or drag photos here</p>
            <p className="text-slate-400 text-sm">Upload up to {MAX_PHOTOS} images (max {MAX_SIZE_MB}MB each)</p>
          </div>
        </div>
      )}

      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {photos.map((photo, index) => (
            <div key={`${photo.name}-${index}`} className="relative aspect-square rounded-lg overflow-hidden group bg-slate-800 border border-slate-700">
              <Image
                src={URL.createObjectURL(photo)}
                alt={`Preview ${index + 1}`}
                fill
                className="object-cover"
              />
              <button
                type="button"
                onClick={() => removePhoto(index)}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              {index === 0 && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-xs text-center text-white py-1">
                  Main Photo
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
