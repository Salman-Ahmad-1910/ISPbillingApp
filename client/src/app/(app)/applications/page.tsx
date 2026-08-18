import { SharedFileManager } from '@/components/shared-file-manager';

export default function ApplicationsPage() {
  return (
    <SharedFileManager
      title="Application"
      description="Upload your application file and let other users download it from this page."
      kind="application"
      uploadEndpoint="/upload/application"
      listEndpoint="/applications"
      acceptLabel="Application"
    />
  );
}
