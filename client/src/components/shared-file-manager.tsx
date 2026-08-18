'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Upload, Download, Trash2, ArrowLeft, FileBox, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';

interface SharedFileItem {
  id: string;
  originalName: string;
  storedName: string;
  size: number;
  createdAt: string;
  downloadUrl: string;
}

interface SharedFileManagerProps {
  title: string;
  description: string;
  kind: 'driver' | 'application';
  uploadEndpoint: string;
  listEndpoint: string;
  acceptLabel: string;
}

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function SharedFileManager({
  title,
  description,
  uploadEndpoint,
  listEndpoint,
  acceptLabel,
}: SharedFileManagerProps) {
  const [files, setFiles] = useState<SharedFileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  async function fetchFiles() {
    setLoading(true);
    try {
      const response = await api.get(listEndpoint);
      const data = response.data.data as { files?: SharedFileItem[] };
      setFiles(data.files ?? []);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to load files',
        description: error?.response?.data?.message || 'Please try again.',
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;
    const ext = file.name.toLowerCase().split('.').pop();
    if (!['exe', 'msi', 'zip'].includes(ext || '')) {
      toast({
        variant: 'destructive',
        title: 'Invalid file type',
        description: 'Only .exe, .msi, or .zip files are allowed.',
      });
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: 'Maximum size is 100MB.',
      });
      return;
    }
    handleUpload(file);
  }

  async function handleUpload(file: File) {
    setSelectedFile(file);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post(uploadEndpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast({
        title: 'Upload successful',
        description: response.data.message || 'File uploaded successfully.',
      });
      setSelectedFile(null);
      fetchFiles();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: error?.response?.data?.message || 'Please try again.',
      });
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/files/${id}`);
      toast({ title: 'Deleted', description: 'File removed successfully.' });
      setFiles((prev) => prev.filter((f) => f.id !== id));
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: error?.response?.data?.message || 'Please try again.',
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard">
          <Button variant="outline" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload {acceptLabel}</CardTitle>
          <CardDescription>
            Allowed types: .exe, .msi, .zip (max 100MB). Click the button to choose a file and upload it. Once uploaded, other users can download it from this page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".exe,.msi,.zip"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? 'Uploading...' : `Choose & Upload ${acceptLabel}`}
          </Button>
          {selectedFile && !uploading && (
            <p className="text-xs text-muted-foreground">Selected: {selectedFile.name}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Available Files</CardTitle>
          <CardDescription>Download or remove uploaded files.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading...
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
              <FileBox className="h-8 w-8" />
              <p className="text-sm">No files uploaded yet.</p>
            </div>
          ) : (
            <ul className="divide-y">
              {files.map((file) => (
                <li key={file.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{file.originalName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(file.size)} · {new Date(file.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <a href={file.downloadUrl} download>
                      <Button size="sm" variant="outline" className="gap-1">
                        <Download className="h-4 w-4" /> Download
                      </Button>
                    </a>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="gap-1"
                      onClick={() => handleDelete(file.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
