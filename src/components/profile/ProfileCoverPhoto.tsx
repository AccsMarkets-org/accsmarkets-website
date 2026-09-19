"use client";

import { useRef, useState } from "react";
import toast from "react-hot-toast";

interface ProfileCoverPhotoProps {
  coverUrl: string | null;
  isOwn: boolean;
  onUpdate?: (url: string) => void;
}

export function ProfileCoverPhoto({ coverUrl, isOwn, onUpdate }: ProfileCoverPhotoProps) {
  const [preview, setPreview] = useState<string | null>(coverUrl);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUri = ev.target?.result as string;
      setPreview(dataUri);
      setUploading(true);
      try {
        const res = await fetch("/api/upload/cover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataUri }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Upload failed");
        setPreview(json.url);
        onUpdate?.(json.url);
        toast.success("Cover photo updated");
      } catch (err) {
        toast.error((err as Error).message ?? "Upload failed");
        setPreview(coverUrl);
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="relative h-40 sm:h-52 w-full overflow-hidden rounded-t-2xl">
      {preview ? (
        <img
          src={preview}
          alt="Cover photo"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="h-full w-full bg-gradient-to-br from-brand-400 via-brand-500 to-brand-700" />
      )}

      {/* Gradient overlay for avatar legibility */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />

      {isOwn && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
          />
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            aria-label="Change cover photo"
            className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-lg bg-black/50 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm hover:bg-black/70 disabled:opacity-50 transition-colors"
          >
            {uploading ? (
              <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            ) : (
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            )}
            {uploading ? "Uploading…" : "Edit cover"}
          </button>
        </>
      )}
    </div>
  );
}
