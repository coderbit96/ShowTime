import { CatalogManager, SpaceManager } from "@/components/management";
export default function AdminManagementPage() {
  return (
    <>
      <CatalogManager />
      <SpaceManager role="ADMIN" />
    </>
  );
}
