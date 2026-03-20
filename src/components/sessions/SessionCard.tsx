import Image from 'next/image';
import { CalendarDays, MapPin, Video, ExternalLink } from 'lucide-react';
import { Card, Badge } from '@/components/ui';
import SessionStatusBadge from './SessionStatusBadge';
import SessionTimeDisplay from './SessionTimeDisplay';
import type { SessionData } from '@/store/slices/api/sessionApi';

type SessionDisplayStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';

interface SessionCardProps {
  session: SessionData;
  displayStatus: SessionDisplayStatus;
  showInstructor?: boolean;
  onClick?: () => void;
  statusLabel?: string;
  children?: React.ReactNode;
}

export default function SessionCard({
  session,
  displayStatus,
  showInstructor = true,
  onClick,
  statusLabel,
  children,
}: SessionCardProps) {
  const isOngoing = displayStatus === 'ongoing';
  const isToday = (() => {
    const d = new Date(session.date);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  })();

  return (
    <Card
      noPadding
      className="overflow-hidden"
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="relative h-[140px] w-full bg-surface-background">
        {session.thumbnail ? (
          <Image
            src={session.thumbnail}
            alt={session.title}
            fill
            unoptimized
            className="object-cover"
            sizes="100vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-primary-light">
            <CalendarDays className="h-10 w-10 text-primary-main opacity-50" />
          </div>
        )}
        <div className="absolute top-sm right-sm">
          <SessionStatusBadge status={displayStatus} label={statusLabel} />
        </div>
      </div>

      {/* Content */}
      <div className="p-lg">
        <h3 className="text-h3 font-semibold text-text-primary line-clamp-2">
          {session.title}
        </h3>

        <SessionTimeDisplay
          date={session.date}
          timeSlot={session.timeSlot}
          duration={session.duration}
          className="mt-sm"
        />

        {/* Location / Online */}
        <div className="mt-xs flex items-center gap-xs text-body-md text-text-secondary">
          {session.mode === 'online' ? (
            <>
              <Video className="h-4 w-4 flex-shrink-0" />
              <Badge variant="info">Online</Badge>
            </>
          ) : (
            <>
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{session.location}</span>
            </>
          )}
        </div>

        {/* Coach */}
        {showInstructor && (
          <div className="mt-xs text-body-md text-text-secondary">
            Coach:{' '}
            {typeof session.instructor === 'object' && session.instructor !== null
              ? session.instructor.name
              : (session.instructor ?? 'TBD')}
          </div>
        )}

        {/* Join Now button for online sessions */}
        {session.mode === 'online' && session.meetingLink && (isOngoing || isToday) && (
          <a
            href={session.meetingLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="mt-md flex items-center justify-center gap-sm rounded-sm bg-blue-600 px-md py-[10px] text-body-md font-semibold text-white transition-colors hover:bg-blue-700 min-h-[48px]"
          >
            <ExternalLink className="h-4 w-4" />
            Join Now
          </a>
        )}

        {children}
      </div>
    </Card>
  );
}
