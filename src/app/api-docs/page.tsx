'use client';

import dynamic from 'next/dynamic';
import 'swagger-ui-react/swagger-ui.css';
import spec from '@/lib/swagger/spec';

const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

export default function ApiDocsPage() {
  return (
    <div className="space-y-lg">
      <h1 className="text-h1 text-text-primary">API Documentation</h1>
      <div className="rounded-md border border-border-light bg-surface-white overflow-hidden [&_.swagger-ui]:font-poppins [&_.swagger-ui_.topbar]:hidden">
        <SwaggerUI spec={spec} />
      </div>
    </div>
  );
}
