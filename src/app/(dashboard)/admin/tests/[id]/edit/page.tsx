'use client';

import { useParams } from 'next/navigation';
import CreateTestForm from '../../create/CreateTestForm';

// Re-use the create page in edit mode by passing the test ID
export default function EditTestPage() {
  const params = useParams();
  const testId = params.id as string;

  return <CreateTestForm editId={testId} />;
}
