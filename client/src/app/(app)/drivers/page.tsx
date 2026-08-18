import { SharedFileManager } from '@/components/shared-file-manager';

export default function DriversPage() {
  return (
    <SharedFileManager
      title="Drivers"
      description="Upload driver/installer (.exe) files and let other users download them from this page."
      kind="driver"
      uploadEndpoint="/upload/driver"
      listEndpoint="/drivers"
      acceptLabel="Driver"
    />
  );
}
