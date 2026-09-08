export type ConnectorStatus = "connected" | "not_configured" | "error";

export interface ConnectorInfo {
  id: string;
  label: string;
  status: ConnectorStatus;
  detail: string;
}

export interface CalendarEvent {
  title: string;
  start: Date;
  end?: Date;
  location?: string;
}
