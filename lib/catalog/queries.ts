import { getMockHomepageCatalog } from "./mock-catalog";
import type { HomepageCatalog, HomepageCatalogRequest } from "./types";
export { getEventDetail } from "./event-details";
export type { EventDetail } from "./types";

export async function getHomepageCatalog(
  request: HomepageCatalogRequest = {},
): Promise<HomepageCatalog> {
  return getMockHomepageCatalog(request.cityId);
}
