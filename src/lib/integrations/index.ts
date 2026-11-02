import { MockCalendarProvider, type CalendarProvider } from "./calendar";
import { MockPaymentProvider, type PaymentProvider } from "./payments";
import { MockStorageProvider, type StorageProvider } from "./storage";

// Single place to choose implementations. When a real provider is added,
// branch on process.env.STORAGE_PROVIDER / PAYMENT_PROVIDER / CALENDAR_PROVIDER.
export const storage: StorageProvider = new MockStorageProvider();
export const payments: PaymentProvider = new MockPaymentProvider();
export const calendar: CalendarProvider = new MockCalendarProvider();

export const integrationStatus = () => [
  { key: "storage", label: "Amazon S3", detail: "Media storage and downloads", provider: storage.name },
  { key: "payments", label: "Stripe", detail: "Invoice payments and download unlock", provider: payments.name },
  { key: "calendar", label: "Google Calendar", detail: "Two-way shoot scheduling", provider: calendar.name },
];
