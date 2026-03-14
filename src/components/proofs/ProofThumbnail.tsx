import Image from 'next/image';

interface ProofThumbnailProps {
  fileUrl: string;
  fileType?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export default function ProofThumbnail({
  fileUrl,
  fileType,
  size = 'sm',
  className = '',
}: ProofThumbnailProps) {
  const sizeClass = size === 'sm' ? 'w-14 h-14' : 'w-20 h-20';
  const isPdf = fileType?.includes('pdf') || fileUrl.toLowerCase().includes('.pdf');
  const isImage = fileUrl.match(/\.(jpg|jpeg|png|webp|gif)/i);

  if (isPdf) {
    return (
      <div className={`${sizeClass} bg-red-50 rounded-sm border border-red-200 flex flex-col items-center justify-center ${className}`}>
        <span className="text-red-500 text-lg font-bold">PDF</span>
        <span className="text-red-400 text-[10px]">Click to view</span>
      </div>
    );
  }

  if (isImage) {
    return (
      <Image
        src={fileUrl}
        alt="Proof"
        width={56}
        height={56}
        className={`${sizeClass} object-cover rounded-sm border border-border-light ${className}`}
        unoptimized
      />
    );
  }

  return (
    <div className={`${sizeClass} bg-surface-background rounded-sm border border-border-light flex items-center justify-center ${className}`}>
      <span className="text-caption text-text-secondary">File</span>
    </div>
  );
}
