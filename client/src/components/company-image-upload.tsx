'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, X, Camera, User, Trash2 } from 'lucide-react';
import { useCompany } from '@/context/company-context';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';

interface CompanyImageUploadProps {
  currentImage?: string;
  onImageChange?: (imageUrl: string) => void;
  className?: string;
  companyId?: string;
}

export function CompanyImageUpload({
  currentImage,
  onImageChange,
  className = "",
  companyId
}: CompanyImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [cropData, setCropData] = useState({ x: 0, y: 0, width: 100, height: 100, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState('');
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [cropStart, setCropStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Use passed companyId or fallback to context
  const contextCompanyId = useCompany();
  const finalCompanyId = companyId || contextCompanyId.companyId;
  const { toast } = useToast();

  // Construct image URL - use company ID endpoint
  const getImageUrl = () => {
    if (!finalCompanyId) return null;
    return `${api.defaults.baseURL}/uploads/company_images/${finalCompanyId}`;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      toast({
        variant: 'destructive',
        title: 'Invalid file type',
        description: 'Please select a JPG, JPEG, or PNG file.',
      });
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: 'Please select an image smaller than 5MB.',
      });
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
      setSelectedFile(file);
      setShowCropDialog(true);
    };
    reader.readAsDataURL(file);
  };

  const handleImageLoad = () => {
    if (!imageRef.current) return;

    const img = imageRef.current;
    const containerWidth = 400;
    const containerHeight = 400;

    // Get the actually displayed dimensions of the image
    const displayedWidth = img.clientWidth;
    const displayedHeight = img.clientHeight;

    // Calculate scale between displayed image and natural image
    const scale = img.naturalWidth / displayedWidth;

    // Calculate crop area in natural pixels (start with 80% of smaller dimension)
    const minNaturalDimension = Math.min(img.naturalWidth, img.naturalHeight);
    const cropSize = Math.min(minNaturalDimension * 0.8, 400); // 400 natural px

    // Center the crop area in natural coordinates
    const x = (img.naturalWidth - cropSize) / 2;
    const y = (img.naturalHeight - cropSize) / 2;

    setCropData({
      x,
      y,
      width: cropSize,
      height: cropSize,
      scale // This is natural/displayed
    });
  };

  const handleMouseDown = (e: React.MouseEvent, handle?: string) => {
    e.preventDefault();
    e.stopPropagation();

    console.log('Mouse down:', handle || 'drag', e.clientX, e.clientY);

    if (handle) {
      // Resizing
      setIsResizing(true);
      setResizeHandle(handle);
    } else {
      // Dragging
      setIsDragging(true);
    }

    setDragStart({ x: e.clientX, y: e.clientY });
    setCropStart({
      x: cropData.x,
      y: cropData.y,
      width: cropData.width,
      height: cropData.height
    });
  };

  const handleMouseMove = (e: React.MouseEvent | MouseEvent) => {
    if (!imageRef.current) return;

    const img = imageRef.current;
    const deltaX = (e.clientX - dragStart.x) * cropData.scale;
    const deltaY = (e.clientY - dragStart.y) * cropData.scale;

    if (isResizing) {
      // Handle resizing
      let newX = cropStart.x;
      let newY = cropStart.y;
      let newWidth = cropStart.width;
      let newHeight = cropStart.height;

      switch (resizeHandle) {
        case 'nw':
          newWidth = Math.max(50, cropStart.width - deltaX);
          newHeight = Math.max(50, cropStart.height - deltaY);
          const sizeNW = Math.min(newWidth, newHeight);
          newX = cropStart.x + cropStart.width - sizeNW;
          newY = cropStart.y + cropStart.height - sizeNW;
          newWidth = sizeNW;
          newHeight = sizeNW;
          break;
        case 'ne':
          newWidth = Math.max(50, cropStart.width + deltaX);
          newHeight = Math.max(50, cropStart.height - deltaY);
          const sizeNE = Math.min(newWidth, newHeight);
          newY = cropStart.y + cropStart.height - sizeNE;
          newWidth = sizeNE;
          newHeight = sizeNE;
          break;
        case 'sw':
          newWidth = Math.max(50, cropStart.width - deltaX);
          newHeight = Math.max(50, cropStart.height + deltaY);
          const sizeSW = Math.min(newWidth, newHeight);
          newX = cropStart.x + cropStart.width - sizeSW;
          newWidth = sizeSW;
          newHeight = sizeSW;
          break;
        case 'se':
          newWidth = Math.max(50, cropStart.width + deltaX);
          newHeight = Math.max(50, cropStart.height + deltaY);
          const sizeSE = Math.min(newWidth, newHeight);
          newWidth = sizeSE;
          newHeight = sizeSE;
          break;
      }

      // Multi-step constraint check to handle bounds
      if (newX < 0) {
        const diff = -newX;
        newX = 0;
        newWidth -= diff;
        newHeight -= diff;
      }
      if (newY < 0) {
        const diff = -newY;
        newY = 0;
        newWidth -= diff;
        newHeight -= diff;
      }
      if (newX + newWidth > img.naturalWidth) {
        const diff = (newX + newWidth) - img.naturalWidth;
        newWidth -= diff;
        newHeight -= diff;
      }
      if (newY + newHeight > img.naturalHeight) {
        const diff = (newY + newHeight) - img.naturalHeight;
        newWidth -= diff;
        newHeight -= diff;
      }

      setCropData(prev => ({
        ...prev,
        x: newX,
        y: newY,
        width: Math.max(50, newWidth),
        height: Math.max(50, newHeight)
      }));

    } else if (isDragging) {
      // Handle dragging
      const maxX = img.naturalWidth - cropData.width;
      const maxY = img.naturalHeight - cropData.height;

      const newX = Math.max(0, Math.min(cropStart.x + deltaX, maxX));
      const newY = Math.max(0, Math.min(cropStart.y + deltaY, maxY));

      setCropData(prev => ({
        ...prev,
        x: newX,
        y: newY
      }));
    }
  };

  const handleMouseUp = () => {
    console.log('Mouse up - stopping drag/resize');
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle('');
  };

  const handleCropConfirm = async () => {
    if (!selectedFile || !canvasRef.current) return;

    setIsUploading(true);
    try {
      // Create cropped square image
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.onload = async () => {
        canvas.width = 200;
        canvas.height = 200;

        // Draw cropped portion (square)
        ctx.drawImage(
          img,
          cropData.x,
          cropData.y,
          cropData.width,
          cropData.height,
          0,
          0,
          200,
          200
        );

        // Convert to blob and upload
        canvas.toBlob(async (blob) => {
          if (!blob) return;

          const formData = new FormData();
          formData.append('image', blob, 'cropped-logo.png');

          const response = await api.post('/upload/company-image', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });

          const imageUrl = response.data.data.imageUrl;
          const filename = response.data.data.filename;

          // Update preview with server URL
          setPreviewUrl(getImageUrl());

          // Notify parent component
          if (onImageChange) {
            onImageChange(filename);
          }

          toast({
            title: 'Success',
            description: 'Company image uploaded successfully.',
          });
          window.location.reload();
        }, 'image/png');
      };
      img.src = previewUrl!;
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: error.response?.data?.message || 'Failed to upload image.',
      });
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
      setShowCropDialog(false);
      setSelectedFile(null);
    }
  };

  const handleCropCancel = () => {
    setShowCropDialog(false);
    setSelectedFile(null);
    setPreviewUrl(null);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemovePicture = async () => {
    try {
      await api.delete('/upload/company-image');
      setPreviewUrl(null);
      setImageExists(false);
      if (onImageChange) {
        onImageChange('');
      }

      toast({
        title: 'Success',
        description: 'Company image removed successfully.',
      });
      window.location.reload();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || 'Failed to remove image.',
      });
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const imageUrl = `${api?.defaults?.baseURL}/uploads/company_images/${finalCompanyId}`

  const [imageExists, setImageExists] = useState(false);

  // Add global mouse event listeners
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging || isResizing) {
        handleMouseUp();
      }
    };

    if (isDragging || isResizing) {
      document.addEventListener('mouseup', handleGlobalMouseUp);

      return () => {
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDragging, isResizing]);

  useEffect(() => {
    const check = async () => {
      const url = `${api?.defaults?.baseURL}/uploads/company_images/${finalCompanyId}`;
      const exists = await checkImageExists(url);
      setImageExists(exists);
    };

    check();
  }, [finalCompanyId]);

  const checkImageExists = (imageUrl: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();

      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);

      img.src = imageUrl;
    });
  };

  return (
    <>
      <div className={`relative ${className}`}>
        {/* Circular Image Container */}
        {/* <div className="relative w-20 h-20 overflow-hidden rounded-full border-2 border-dashed border-gray-300 bg-gray-50 hover:border-gray-400 transition-colors">
          {imageExists  ? (
            <>
              <img
                // src={companyId ? `/api/companies/${companyId}/image` : ''}
                src={`${api?.defaults?.baseURL}/uploads/company_images/${finalCompanyId}`}
                alt="Company"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 transition-opacity hover:bg-opacity-50 rounded-full">
                <div className="flex h-full items-center justify-center opacity-0 transition-opacity hover:opacity-100">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={triggerFileInput}
                    disabled={isUploading}
                    className="rounded-full w-8 h-8 p-0"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div 
              className="flex h-full items-center justify-center cursor-pointer"
              onClick={triggerFileInput}
            >
              <div className="relative">
                <Upload className="h-8 w-8 text-gray-400" />
              </div>
            </div>
          )}
        </div>
        
        */}
        <div className="relative w-15 h-15 overflow-hidden rounded-full border-2 border-dashed border-gray-300 bg-gray-50 hover:border-gray-400 transition-colors">
          {imageExists ? (
            <>
              <img
                src={`${api?.defaults?.baseURL}/uploads/company_images/${finalCompanyId}`}
                alt="Company"
                className="w-full h-full object-cover"
                onLoad={() => setImageExists(true)}
                onError={() => setImageExists(false)}
              />

              <div className="absolute inset-0 bg-black bg-opacity-0 transition-opacity hover:bg-opacity-50 rounded-full">
                <div className="flex h-full items-center justify-center gap-2 opacity-0 transition-opacity hover:opacity-100">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={triggerFileInput}
                    disabled={isUploading}
                    className="rounded-full w-8 h-8 p-0"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemovePicture();
                    }}
                    disabled={isUploading}
                    className="rounded-full w-8 h-8 p-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div
              className="flex h-full items-center justify-center cursor-pointer"
              onClick={triggerFileInput}
            >
              <Upload className="h-8 w-8 text-gray-400" />
            </div>
          )}
        </div>

        {/* Loading Overlay */}
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-full">
            <div className="flex flex-col items-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            </div>
          </div>
        )}

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Crop Dialog */}
      {showCropDialog && previewUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Crop Company Logo</h3>
            <div className="mb-4">
              <div
                className="relative bg-gray-100 rounded-lg overflow-hidden mx-auto flex items-center justify-center"
                style={{ width: '400px', height: '400px' }}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                <img
                  ref={imageRef}
                  src={previewUrl}
                  alt="Crop preview"
                  className="max-w-full max-h-full object-contain"
                  onLoad={handleImageLoad}
                />
                <div
                  className="absolute border-2 border-blue-500 bg-blue-500 bg-opacity-10 cursor-move"
                  style={{
                    left: `calc(50% + ${(cropData.x - imageRef.current?.naturalWidth! / 2) / cropData.scale}px)`,
                    top: `calc(50% + ${(cropData.y - imageRef.current?.naturalHeight! / 2) / cropData.scale}px)`,
                    width: `${cropData.width / cropData.scale}px`,
                    height: `${cropData.height / cropData.scale}px`
                  }}
                  onMouseDown={(e) => handleMouseDown(e)}
                >
                  {/* Resize handles */}
                  <div
                    className="absolute w-3 h-3 bg-blue-500 border border-white cursor-nw-resize"
                    style={{ top: '-6px', left: '-6px' }}
                    onMouseDown={(e) => handleMouseDown(e, 'nw')}
                  />
                  <div
                    className="absolute w-3 h-3 bg-blue-500 border border-white cursor-ne-resize"
                    style={{ top: '-6px', right: '-6px' }}
                    onMouseDown={(e) => handleMouseDown(e, 'ne')}
                  />
                  <div
                    className="absolute w-3 h-3 bg-blue-500 border border-white cursor-sw-resize"
                    style={{ bottom: '-6px', left: '-6px' }}
                    onMouseDown={(e) => handleMouseDown(e, 'sw')}
                  />
                  <div
                    className="absolute w-3 h-3 bg-blue-500 border border-white cursor-se-resize"
                    style={{ bottom: '-6px', right: '-6px' }}
                    onMouseDown={(e) => handleMouseDown(e, 'se')}
                  />
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Drag the blue box to select the area for your company logo. Use the corner handles to resize the box. The image will be cropped to a square format.
            </p>
            <canvas ref={canvasRef} className="hidden" />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={handleCropCancel}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCropConfirm}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Cropping & Uploading...
                  </>
                ) : (
                  'Crop & Upload'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
