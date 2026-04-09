"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  Upload,
  X,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Download,
  Trash2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type PhotoItem = {
  _id?: string;
  url: string;
  publicId?: string;
};

type PhotoGalleryProps = {
  mode?: "public" | "admin";
};

export default function PhotoGallery({ mode = "public" }: PhotoGalleryProps) {
  const isAdmin = mode === "admin";
  const { data: photos, mutate } = useSWR("/api/photos", fetcher, { refreshInterval: 10000 });
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const photoList: PhotoItem[] = Array.isArray(photos) ? photos : [];

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!selectedPhoto) return;

      if (event.key === "Escape") {
        setSelectedPhoto(null);
        return;
      }

      if (event.key === "+" || event.key === "=") {
        setZoomLevel((prev) => Math.min(4, Number((prev + 0.2).toFixed(2))));
      }

      if (event.key === "-") {
        setZoomLevel((prev) => Math.max(1, Number((prev - 0.2).toFixed(2))));
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedPhoto]);

  useEffect(() => {
    setZoomLevel(1);
  }, [selectedPhoto]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setMessage({ type: "error", text: "File too large. Max 10MB." });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      // 1. Get Signature
      const signRes = await fetch("/api/uploads/sign", {
        method: "POST",
        body: JSON.stringify({ folder: "smt-tournament/gallery" }),
      });
      const signData = await signRes.json();

      if (!signRes.ok) throw new Error(signData.message || "Failed to sign upload");

      // 2. Upload to Cloudinary
      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", signData.apiKey);
      formData.append("timestamp", signData.timestamp);
      formData.append("folder", signData.folder);
      formData.append("public_id", signData.publicId);
      formData.append("signature", signData.signature);
      formData.append("transformation", signData.transformation);

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${signData.cloudName}/image/upload`,
        { method: "POST", body: formData }
      );
      const uploadData = await uploadRes.json();

      if (!uploadRes.ok) throw new Error("Cloudinary upload failed");

      // 3. Save to DB
      const saveRes = await fetch("/api/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: uploadData.secure_url,
          publicId: uploadData.public_id,
        }),
      });

      if (!saveRes.ok) throw new Error("Failed to save photo metadata");

      setMessage({ type: "success", text: "Moment uploaded successfully!" });
      mutate();
      setTimeout(() => setShowUpload(false), 2000);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Upload failed" });
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(photoUrl: string) {
    try {
      setDownloading(true);

      const response = await fetch(photoUrl);
      if (!response.ok) {
        throw new Error("Could not download image");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = objectUrl;
      anchor.download = `smt-match-${Date.now()}.jpg`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(photoUrl, "_blank", "noopener,noreferrer");
    } finally {
      setDownloading(false);
    }
  }

  async function handleDelete(photo: PhotoItem) {
    if (!photo._id && !photo.publicId) {
      setMessage({ type: "error", text: "Could not identify photo to delete." });
      return;
    }

    const confirmed = window.confirm("Delete this image from gallery?");
    if (!confirmed) return;

    try {
      setDeletingId(photo._id || photo.publicId || null);
      const response = await fetch("/api/photos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: photo._id, publicId: photo.publicId }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Delete failed");
      }

      if (selectedPhoto && (selectedPhoto._id === photo._id || selectedPhoto.publicId === photo.publicId)) {
        setSelectedPhoto(null);
      }

      setMessage({ type: "success", text: "Image deleted successfully." });
      await mutate();
    } catch (err: any) {
      setMessage({ type: "error", text: err?.message || "Delete failed" });
    } finally {
      setDeletingId(null);
    }
  }

  function closeModal() {
    setSelectedPhoto(null);
    setZoomLevel(1);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-3 text-2xl font-bold text-white uppercase">
          <Camera className="text-emerald-400" size={24} />
          {isAdmin ? "Gallery Control Room" : "Session Gallery"}
        </h3>
        {isAdmin ? (
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-500 transition-all hover:bg-emerald-500/20"
          >
            {showUpload ? <X size={14} /> : <Upload size={14} />}
            {showUpload ? "Cancel" : "Upload Moment"}
          </button>
        ) : null}
      </div>

      <AnimatePresence>
        {showUpload && isAdmin && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="glass-pane relative mb-6 rounded-2xl p-8 border border-white/5 bg-black/40">
              <input
                type="file"
                accept="image/*"
                onChange={handleUpload}
                className="absolute inset-0 cursor-pointer opacity-0"
                disabled={uploading}
              />
              <div className="flex flex-col items-center justify-center gap-4 text-center">
                {uploading ? (
                  <>
                    <Loader2 size={32} className="animate-spin text-emerald-500" />
                    <p className="text-sm font-bold text-white">Optimizing Image (1080p)...</p>
                  </>
                ) : message?.type === "success" ? (
                  <>
                    <CheckCircle2 size={32} className="text-emerald-500" />
                    <p className="text-sm font-bold text-emerald-500">{message.text}</p>
                  </>
                ) : (
                  <>
                    <div className="rounded-full bg-emerald-500/10 p-4">
                      <ImageIcon size={32} className="text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white uppercase tracking-wider">
                        Click or drag to share a moment
                      </p>
                      <p className="mt-1 text-xs text-white/40 uppercase font-bold tracking-[0.1em]">
                        Cloudinary Optimized HD • Max 10MB
                      </p>
                    </div>
                  </>
                )}
                {message?.type === "error" && (
                  <div className="flex items-center gap-2 rounded-lg bg-rose-500/10 px-3 py-1.5 text-[10px] font-bold text-rose-500 uppercase tracking-wider ring-1 ring-rose-500/20">
                    <AlertCircle size={12} />
                    {message.text}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {photoList.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-white/10 py-12 text-center text-white/20">
            <ImageIcon size={32} className="mx-auto mb-2 opacity-10" />
            <p className="text-xs uppercase font-bold tracking-widest">No moments captured yet</p>
          </div>
        ) : (
          photoList.map((photo: PhotoItem, idx: number) => (
            <motion.div
              key={photo._id ?? `${photo.publicId ?? photo.url}-${idx}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ scale: 1.02, zIndex: 10 }}
              className="group relative aspect-video cursor-zoom-in overflow-hidden rounded-2xl bg-black/40 ring-1 ring-white/10 hover:ring-emerald-500/30 transition-all shadow-xl hover:shadow-emerald-500/5"
              onClick={() => setSelectedPhoto(photo)}
            >
              {isAdmin ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(photo);
                  }}
                  disabled={deletingId === (photo._id || photo.publicId)}
                  className="absolute right-2 top-2 z-20 rounded-full bg-black/70 p-2 text-rose-300 hover:bg-rose-500/20 disabled:opacity-60"
                  title="Delete image"
                  aria-label="Delete image"
                >
                  {deletingId === (photo._id || photo.publicId) ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                </button>
              ) : null}

              <img
                src={photo.url}
                alt="Match Moment"
                className="h-full w-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-500"
                loading="lazy"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white/70">
                Tap to view
              </div>
            </motion.div>
          ))
        )}
      </div>

      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="relative max-h-[90vh] w-full max-w-6xl"
            >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(selectedPhoto.url);
                  }}
                disabled={downloading}
                  className="absolute right-3 top-14 z-20 flex items-center gap-2 rounded-full bg-white/95 px-3 py-2 text-xs font-bold text-black shadow-xl ring-1 ring-black/30 backdrop-blur disabled:opacity-70"
                aria-label="Download image"
              >
                <Download size={14} />
                {downloading ? "Downloading" : "Download"}
              </button>

              {isAdmin ? (
                <button
                  type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(selectedPhoto);
                    }}
                    className="absolute right-3 top-25 z-20 flex items-center gap-2 rounded-full bg-rose-500/95 px-3 py-2 text-xs font-bold text-black shadow-xl ring-1 ring-black/30 backdrop-blur"
                  aria-label="Delete image"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              ) : null}

                <div
                  className="absolute left-3 top-3 z-20 flex items-center gap-1 rounded-full bg-black/80 p-1 ring-1 ring-white/15 backdrop-blur"
                  onClick={(e) => e.stopPropagation()}
                >
                <button
                  type="button"
                  onClick={() => setZoomLevel((prev) => Math.max(1, Number((prev - 0.2).toFixed(2))))}
                  className="rounded-full p-2 text-white hover:bg-white/10"
                  aria-label="Zoom out"
                >
                  <ZoomOut size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel(1)}
                  className="rounded-full p-2 text-white hover:bg-white/10"
                  aria-label="Reset zoom"
                >
                  <RotateCcw size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel((prev) => Math.min(4, Number((prev + 0.2).toFixed(2))))}
                  className="rounded-full p-2 text-white hover:bg-white/10"
                  aria-label="Zoom in"
                >
                  <ZoomIn size={14} />
                </button>
                <span className="px-2 text-[10px] font-bold text-white/80">{Math.round(zoomLevel * 100)}%</span>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeModal();
                }}
                className="absolute right-3 top-3 z-20 rounded-full bg-black/85 p-2 text-white shadow-xl ring-1 ring-white/20"
                aria-label="Close preview"
              >
                <X size={16} />
              </button>
              <div
                className="max-h-[90vh] overflow-auto rounded-2xl bg-black/40"
                onClick={(e) => e.stopPropagation()}
                onWheel={(e) => {
                  if (!e.ctrlKey) return;
                  e.preventDefault();
                  setZoomLevel((prev) => {
                    const next = e.deltaY > 0 ? prev - 0.1 : prev + 0.1;
                    return Math.min(4, Math.max(1, Number(next.toFixed(2))));
                  });
                }}
              >
                <img
                  src={selectedPhoto.url}
                  alt="Gallery preview"
                  className="mx-auto max-h-[90vh] w-full rounded-2xl object-contain transition-transform duration-200"
                  style={{ transform: `scale(${zoomLevel})`, transformOrigin: "center center" }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
