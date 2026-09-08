import { describeGoogleCalendar } from "./googleCalendar";
import { describeMagister } from "./icsCalendar";
import { describeSiteSearch } from "./siteSearch";
import { describeWebSearch } from "./webSearch";
import { ConnectorInfo } from "./types";

export function getAllConnectorInfo(): ConnectorInfo[] {
  return [
    describeSiteSearch(),
    describeGoogleCalendar(),
    describeMagister(),
    describeWebSearch(),
  ];
}

export * from "./types";
export { getUpcomingGoogleEvents, createGoogleEvent } from "./googleCalendar";
export { getUpcomingMagisterEvents, getUpcomingIcsEvents } from "./icsCalendar";
export { searchSite } from "./siteSearch";
export { searchWeb } from "./webSearch";
