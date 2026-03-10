'use client';

import { useParams } from 'next/navigation';
import CreateTestPage from '../../create/page';

// Re-use the create page in edit mode by passing the test ID
export default function EditTestPage() {
  const params = useParams();
  const testId = params.id as string;

  return <CreateTestPage editId={testId} />;
}
