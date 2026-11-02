// Calendar sync. The UI only talks to this interface.
// Today: MockCalendarProvider returns fake event ids and a fixed set of busy blocks.
// Later: GoogleCalendarProvider using the Google Calendar API (OAuth for the
// owner's account), creating an event per confirmed shoot and reading
// free/busy so clients can only book open slots.

export interface CalendarEventInput {
  title: string;
  description?: string;
  location?: string;
  start: string; // ISO
  end: string; // ISO
  attendeeEmails?: string[];
}

export interface BusyBlock {
  start: string;
  end: string;
}

export interface CalendarProvider {
  readonly name: string;
  isConnected(): Promise<boolean>;
  createEvent(input: CalendarEventInput): Promise<{ eventId: string }>;
  updateEvent(eventId: string, input: Partial<CalendarEventInput>): Promise<void>;
  deleteEvent(eventId: string): Promise<void>;
  /** Busy time from the owner's other calendars, used to hide unavailable booking slots. */
  getBusy(rangeStart: string, rangeEnd: string): Promise<BusyBlock[]>;
}

export class MockCalendarProvider implements CalendarProvider {
  readonly name = "mock";
  async isConnected() {
    return false;
  }
  async createEvent() {
    return { eventId: `gcal_mock_${Date.now()}` };
  }
  async updateEvent() {}
  async deleteEvent() {}
  async getBusy(): Promise<BusyBlock[]> {
    return [];
  }
}
