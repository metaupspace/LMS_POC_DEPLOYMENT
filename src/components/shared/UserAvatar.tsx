import Image from 'next/image';

interface UserAvatarProps {
  name: string;
  image?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export default function UserAvatar({ name, image, size = 'md', className = '' }: UserAvatarProps) {
  const sizeClass = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base', xl: 'w-16 h-16 text-lg' }[size];

  if (image) {
    return (
      <Image src={image} alt={name} width={48} height={48}
        className={`${sizeClass} rounded-full object-cover ${className}`} unoptimized />
    );
  }

  return (
    <div className={`${sizeClass} rounded-full bg-primary-light flex items-center justify-center font-semibold text-primary-main ${className}`}>
      {name?.charAt(0)?.toUpperCase() || '?'}
    </div>
  );
}
