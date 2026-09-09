import { describeGoogleCalendar } from "./googleCalendar";
import { describeMagister } from "./icsCalendar";
import { describeSiteSearch } from "./siteSearch";
import { describeWebSearch } from "./webSearch";
import { describeNews } from "./news";
import { describeCrypto } from "./crypto";
import { ConnectorInfo } from "./types";

export function getAllConnectorInfo(): ConnectorInfo[] {
  return [
    describeSiteSearch(),
    describeGoogleCalendar(),
    describeMagister(),
    describeWebSearch(),
    describeNews(),
    describeCrypto(),
  ];
}

export * from "./types";
export {
  getUpcomingGoogleEvents,
  createGoogleEvent,
  isGoogleCalendarConfigured,
} from "./googleCalendar";
export {
  getUpcomingMagisterEvents,
  getUpcomingIcsEvents,
  isMagisterConfigured,
} from "./icsCalendar";
export { searchSite } from "./siteSearch";
export { searchWeb, isWebSearchConfigured } from "./webSearch";
export { getLatestNews } from "./news";
export type { NewsItem } from "./news";
export { getBitcoinSnapshot } from "./crypto";
export type { CryptoSnapshot } from "./crypto";
