import { GlobalSearch } from "@/components/search";

export function HomepageSearch() {
  return (
    <section id="search" className="scroll-mt-24">
      <div className="premium-panel rounded-md p-3 sm:p-4">
        <GlobalSearch showCity />
      </div>
    </section>
  );
}
