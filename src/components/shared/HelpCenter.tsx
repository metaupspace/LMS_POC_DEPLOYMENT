import { Phone, MessageCircle, PlayCircle } from 'lucide-react';
import Card from '@/components/ui/Card';

interface ContactInfo {
  name: string;
  role: string;
  phone: string;
}

interface HelpCenterProps {
  supervisor?: ContactInfo;
  manager?: ContactInfo;
  helpVideoUrl?: string;
  className?: string;
}

function ContactRow({ contact }: { contact: ContactInfo }) {
  return (
    <div className="flex items-center justify-between py-sm">
      <div>
        <p className="text-body-md font-medium text-text-primary">{contact.name}</p>
        <p className="text-caption text-text-secondary">{contact.role}</p>
      </div>
      <div className="flex items-center gap-sm">
        <a
          href={`tel:${contact.phone}`}
          className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-success/10 text-success transition-colors hover:bg-success/20"
          aria-label={`Call ${contact.name}`}
        >
          <Phone className="h-4 w-4" />
        </a>
        <a
          href={`https://wa.me/${contact.phone.replace(/[^0-9]/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-success/10 text-success transition-colors hover:bg-success/20"
          aria-label={`WhatsApp ${contact.name}`}
        >
          <MessageCircle className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}

export default function HelpCenter({
  supervisor,
  manager,
  helpVideoUrl,
  className = '',
}: HelpCenterProps) {
  return (
    <Card className={className}>
      <h3 className="mb-md text-h3 text-text-primary">Help Center</h3>

      {supervisor && (
        <div className="border-b border-border-light">
          <ContactRow contact={supervisor} />
        </div>
      )}

      {manager && <ContactRow contact={manager} />}

      {helpVideoUrl && (
        <a
          href={helpVideoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-md flex items-center gap-sm rounded-sm bg-primary-light px-md py-sm text-body-md font-medium text-primary-main transition-colors hover:bg-primary-light/80"
        >
          <PlayCircle className="h-5 w-5" strokeWidth={1.5} />
          Watch Help Video
        </a>
      )}
    </Card>
  );
}
