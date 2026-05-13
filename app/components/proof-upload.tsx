'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, Image as ImageIcon, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { ProcessedTask } from '@/lib/task-engine';

interface ProofUploadProps {
  task: ProcessedTask;
  onUploadSuccess?: (task: ProcessedTask) => void;
  onClose?: () => void;
}

export function ProofUpload({ task, onUploadSuccess, onClose }: ProofUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selectedFile: File) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/zip',
      'application/x-zip-compressed'
    ];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(selectedFile.type)) {
      setError('Invalid file type. Allowed: images, PDF, DOC, DOCX, or ZIP');
      return;
    }

    if (selectedFile.size > maxSize) {
      setError('File too large. Maximum size: 10MB');
      return;
    }

    setFile(selectedFile);
    setError(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('taskId', task.id);
      formData.append('proof', file);

      const response = await fetch(`/api/tasks/${task.id}/proof`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setSuccess(true);
      if (onUploadSuccess) {
        onUploadSuccess({ ...task, proofUrl: data.proofUrl, status: 'WAITING_APPROVAL' });
      }

      // Auto close after success
      setTimeout(() => {
        if (onClose) onClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <ImageIcon size={20} />;
    return <FileText size={20} />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 20 }}
        animate={{ y: 0 }}
        className="w-full max-w-md rounded-[2rem] border border-white/10 bg-slate-950/95 p-6 shadow-2xl backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Upload Proof</h3>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:text-white transition-colors dark:text-slate-300"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-slate-300 mb-2 dark:text-slate-200">Task: {task.title}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Upload proof of completion to request admin approval
          </p>
        </div>

        {!file && !success && (
          <div
            className="border-2 border-dashed border-slate-600 rounded-2xl p-8 text-center transition-colors hover:border-violet-400/50 cursor-pointer"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={32} className="mx-auto mb-4 text-slate-400" />
            <p className="text-sm text-slate-300 mb-2">
              Drop your proof file here, or click to browse
            </p>
            <p className="text-xs text-slate-500">
              Images, PDF, DOC, DOCX, or ZIP up to 10MB
            </p>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.zip"
              onChange={(e) => {
                const selectedFile = e.target.files?.[0];
                if (selectedFile) handleFileSelect(selectedFile);
              }}
            />
          </div>
        )}

        {file && !success && (
          <div className="rounded-2xl bg-slate-900/50 p-4 mb-4">
            <div className="flex items-center gap-3">
              {getFileIcon(file.type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{file.name}</p>
                <p className="text-xs text-slate-400">{formatFileSize(file.size)}</p>
              </div>
              <button
                onClick={() => setFile(null)}
                className="text-slate-400 hover:text-red-400 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {success && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="rounded-2xl bg-violet-500/10 border border-violet-500/20 p-4 mb-4"
          >
            <div className="flex items-center gap-3">
              <CheckCircle size={20} className="text-violet-400" />
              <div>
                <p className="text-sm font-medium text-violet-200">Upload Successful</p>
                <p className="text-xs text-violet-300/70">Proof submitted for admin approval</p>
              </div>
            </div>
          </motion.div>
        )}

        {error && (
          <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-4 mb-4">
            <div className="flex items-center gap-3">
              <AlertCircle size={20} className="text-red-400" />
              <p className="text-sm text-red-200">{error}</p>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl border border-white/10 bg-slate-900/50 py-3 text-sm font-medium text-slate-300 hover:bg-slate-900/70 transition-colors"
          >
            Cancel
          </button>
          {file && !success && (
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="flex-1 rounded-2xl bg-violet-400 py-3 text-sm font-medium text-slate-950 hover:bg-violet-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload size={16} />
                  Upload
                </>
              )}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

