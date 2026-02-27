import Image from 'next/image';

interface ProfileCardProps {
  name: string;
  empId: string;
  role: string;
  profileImage?: string;
  className?: string;
}

export default function ProfileCard({
  name,
  empId,
  role,
  profileImage,
  className = '',
}: ProfileCardProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className={`flex items-center gap-md ${className}`}>
      {profileImage ? (
        <Image
          src={profileImage}
          alt={name}
          width={40}
          height={40}
          className="h-[40px] w-[40px] rounded-full object-cover"
          unoptimized
        />
      ) : (
        <div className="flex h-[40px] w-[40px] items-center justify-center rounded-full bg-primary-light text-body-md font-semibold text-primary-main">
          {initials}
        </div>
      )}
      <div className="flex flex-col">
        <span className="text-body-md font-medium text-text-primary">{name}</span>
        <span className="text-caption text-text-secondary">
          {empId} &middot; {role.charAt(0).toUpperCase() + role.slice(1)}
        </span>
      </div>
    </div>
  );
}
