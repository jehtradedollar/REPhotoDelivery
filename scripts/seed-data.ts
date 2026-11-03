// Seed data for the demo. Dates are generated relative to "today" so the
// dashboard and calendar always look populated.

import type {
  ActivityEvent,
  Client,
  Invoice,
  MediaItem,
  Package,
  Project,
  Service,
  Shoot,
} from "./seed-types";

const DAY = 86_400_000;

function at(dayOffset: number, hour = 10, minute = 0): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const t = new Date(d.getTime() + dayOffset * DAY);
  t.setHours(hour, minute, 0, 0);
  return t.toISOString();
}

export const services: Service[] = [
  { id: "svc_photo", name: "HDR Photography", kind: "photo", description: "Interior and exterior photos, color corrected.", price: 17500, durationMin: 60 },
  { id: "svc_drone", name: "Aerial Drone", kind: "drone", description: "Up to 10 aerial stills of property and surroundings.", price: 12500, durationMin: 30 },
  { id: "svc_video", name: "Cinematic Walkthrough", kind: "video", description: "60 to 90 second edited listing video with music.", price: 29500, durationMin: 60 },
  { id: "svc_floor", name: "2D Floor Plan", kind: "floorplan", description: "Measured floor plan with room dimensions.", price: 9500, durationMin: 30 },
  { id: "svc_tour", name: "3D Virtual Tour", kind: "tour", description: "Interactive walkthrough hosted with a shareable link.", price: 19500, durationMin: 45 },
  { id: "svc_twilight", name: "Twilight Exterior", kind: "twilight", description: "Dusk exteriors with lights on.", price: 15000, durationMin: 45 },
];

export const packages: Package[] = [
  { id: "pkg_essentials", name: "Essentials", description: "Photos for a standard listing.", serviceIds: ["svc_photo"], price: 17500 },
  { id: "pkg_signature", name: "Signature", description: "Photos, aerials and a floor plan.", serviceIds: ["svc_photo", "svc_drone", "svc_floor"], price: 34900, popular: true },
  { id: "pkg_showcase", name: "Showcase", description: "Everything for a premium listing launch.", serviceIds: ["svc_photo", "svc_drone", "svc_video", "svc_floor", "svc_tour"], price: 74900 },
];

export const clients: Client[] = [
  { id: "cli_maya", name: "Maya Okafor", email: "maya@summitrealty.com", phone: "(530) 555-0142", brokerage: "Summit Realty Group", hue: 168, createdAt: at(-240), notes: "Prefers twilight add-on for listings over $700k." },
  { id: "cli_daniel", name: "Daniel Reyes", email: "daniel@northvalleyhomes.com", phone: "(530) 555-0187", brokerage: "North Valley Homes", hue: 24, createdAt: at(-180) },
  { id: "cli_priya", name: "Priya Shah", email: "priya@shastaproperties.com", phone: "(530) 555-0119", brokerage: "Shasta Properties", hue: 280, createdAt: at(-150) },
  { id: "cli_tom", name: "Tom Lindqvist", email: "tom@riverbendre.com", phone: "(530) 555-0163", brokerage: "Riverbend Real Estate", hue: 210, createdAt: at(-90) },
  { id: "cli_alicia", name: "Alicia Moreno", email: "alicia@keystonebrokers.com", phone: "(530) 555-0128", brokerage: "Keystone Brokers", hue: 340, createdAt: at(-40) },
  { id: "cli_ben", name: "Ben Carter", email: "ben@carterteam.com", phone: "(530) 555-0174", brokerage: "The Carter Team", hue: 95, createdAt: at(-6) },
];

interface ProjectSeed {
  p: Omit<Project, "createdAt" | "coverSeed"> & { createdDay: number };
  shoot?: { day: number; hour: number; status: Shoot["status"]; minutes: number; notes?: string };
  invoice?: { status: Invoice["status"]; issuedDay: number; paidDay?: number };
  media?: { photos: number; video?: boolean; floorplan?: boolean; tour?: boolean };
}

const seeds: ProjectSeed[] = [
  {
    p: { id: "prj_1", clientId: "cli_maya", address: "1840 Lake Boulevard", city: "Redding", state: "CA", zip: "96003", beds: 4, baths: 3, sqft: 2860, status: "delivered", serviceIds: ["svc_photo", "svc_drone", "svc_floor"], createdDay: -12, deliveredAt: at(-8, 17) },
    shoot: { day: -9, hour: 9, status: "completed", minutes: 120 },
    invoice: { status: "paid", issuedDay: -8, paidDay: -7 },
    media: { photos: 24, floorplan: true },
  },
  {
    p: { id: "prj_2", clientId: "cli_maya", address: "77 Hilltop Drive", city: "Redding", state: "CA", zip: "96002", beds: 3, baths: 2, sqft: 1940, status: "delivered", serviceIds: ["svc_photo", "svc_twilight"], createdDay: -6, deliveredAt: at(-2, 16) },
    shoot: { day: -3, hour: 17, status: "completed", minutes: 105 },
    invoice: { status: "sent", issuedDay: -2 },
    media: { photos: 18 },
  },
  {
    p: { id: "prj_3", clientId: "cli_daniel", address: "4120 Placer Road", city: "Redding", state: "CA", zip: "96001", beds: 5, baths: 4, sqft: 3650, status: "delivered", serviceIds: ["svc_photo", "svc_drone", "svc_video", "svc_floor", "svc_tour"], createdDay: -20, deliveredAt: at(-15, 15) },
    shoot: { day: -17, hour: 10, status: "completed", minutes: 210 },
    invoice: { status: "overdue", issuedDay: -15 },
    media: { photos: 32, video: true, floorplan: true, tour: true },
  },
  {
    p: { id: "prj_4", clientId: "cli_priya", address: "925 Churn Creek Court", city: "Redding", state: "CA", zip: "96002", beds: 3, baths: 2, sqft: 1720, status: "editing", serviceIds: ["svc_photo", "svc_drone"], createdDay: -4 },
    shoot: { day: -1, hour: 11, status: "completed", minutes: 90 },
    invoice: { status: "draft", issuedDay: -1 },
  },
  {
    p: { id: "prj_5", clientId: "cli_tom", address: "310 Riverside Way", city: "Anderson", state: "CA", zip: "96007", beds: 2, baths: 2, sqft: 1280, status: "scheduled", serviceIds: ["svc_photo"], createdDay: -3 },
    shoot: { day: 0, hour: 13, status: "confirmed", minutes: 60, notes: "Lockbox on side gate, code 4471." },
  },
  {
    p: { id: "prj_6", clientId: "cli_alicia", address: "2200 Oasis Road", city: "Redding", state: "CA", zip: "96003", beds: 4, baths: 3, sqft: 2410, status: "scheduled", serviceIds: ["svc_photo", "svc_drone", "svc_floor"], createdDay: -2 },
    shoot: { day: 1, hour: 9, status: "confirmed", minutes: 120, notes: "Sellers home until 9:30. Dogs in backyard." },
  },
  {
    p: { id: "prj_7", clientId: "cli_daniel", address: "15 Shasta View Lane", city: "Shasta Lake", state: "CA", zip: "96019", beds: 3, baths: 2, sqft: 2050, status: "scheduled", serviceIds: ["svc_photo", "svc_twilight"], createdDay: -1 },
    shoot: { day: 3, hour: 16, status: "confirmed", minutes: 105 },
  },
  {
    p: { id: "prj_8", clientId: "cli_ben", address: "608 Eureka Way", city: "Redding", state: "CA", zip: "96001", beds: 3, baths: 1, sqft: 1360, status: "scheduled", serviceIds: ["svc_photo", "svc_floor"], createdDay: 0 },
    shoot: { day: 5, hour: 10, status: "requested", minutes: 90 },
  },
  {
    p: { id: "prj_9", clientId: "cli_priya", address: "4500 Bechelli Lane", city: "Redding", state: "CA", zip: "96002", beds: 5, baths: 3, sqft: 3100, status: "scheduled", serviceIds: ["svc_photo", "svc_drone", "svc_video"], createdDay: 0 },
    shoot: { day: 8, hour: 9, status: "confirmed", minutes: 150 },
  },
  {
    p: { id: "prj_10", clientId: "cli_tom", address: "1209 Victor Avenue", city: "Redding", state: "CA", zip: "96003", beds: 3, baths: 2, sqft: 1650, status: "archived", serviceIds: ["svc_photo"], createdDay: -60, deliveredAt: at(-55, 14) },
    shoot: { day: -57, hour: 10, status: "completed", minutes: 60 },
    invoice: { status: "paid", issuedDay: -55, paidDay: -54 },
    media: { photos: 20 },
  },
  {
    p: { id: "prj_11", clientId: "cli_alicia", address: "88 Canyon Creek Road", city: "Redding", state: "CA", zip: "96001", beds: 4, baths: 3, sqft: 2780, status: "delivered", serviceIds: ["svc_photo", "svc_drone"], createdDay: -30, deliveredAt: at(-26, 12) },
    shoot: { day: -27, hour: 10, status: "completed", minutes: 90 },
    invoice: { status: "paid", issuedDay: -26, paidDay: -1 },
    media: { photos: 22 },
  },
];

function priceFor(serviceIds: string[]) {
  return serviceIds.map((id) => services.find((s) => s.id === id)!);
}

const photoRooms = [
  "front-exterior", "entry", "living-room", "kitchen", "kitchen-detail", "dining", "family-room",
  "primary-bedroom", "primary-bath", "bedroom-2", "bedroom-3", "bath-2", "office", "laundry",
  "backyard", "patio", "rear-exterior", "aerial-front", "aerial-rear", "aerial-neighborhood",
  "garage", "pool", "view", "street",
];

export function buildSeed() {
  const projects: Project[] = [];
  const shoots: Shoot[] = [];
  const invoices: Invoice[] = [];
  const media: MediaItem[] = [];
  let invoiceNo = 1041;

  seeds.forEach((s, i) => {
    const { createdDay, ...rest } = s.p;
    const project: Project = { ...rest, createdAt: at(createdDay, 9), coverSeed: i * 7 + 3 };

    if (s.shoot) {
      const shootId = `sht_${i + 1}`;
      const start = at(s.shoot.day, s.shoot.hour);
      shoots.push({
        id: shootId,
        projectId: project.id,
        clientId: project.clientId,
        start,
        end: new Date(new Date(start).getTime() + s.shoot.minutes * 60_000).toISOString(),
        status: s.shoot.status,
        photographer: "Jonathan",
        accessNotes: s.shoot.notes,
        calendarEventId: s.shoot.status === "requested" ? undefined : `gcal_mock_${i + 1}`,
      });
      project.shootId = shootId;
    }

    if (s.invoice) {
      const invId = `inv_${i + 1}`;
      const svc = priceFor(project.serviceIds);
      invoices.push({
        id: invId,
        number: `INV-${invoiceNo++}`,
        projectId: project.id,
        clientId: project.clientId,
        status: s.invoice.status,
        lines: svc.map((x) => ({ description: x.name, quantity: 1, unitPrice: x.price })),
        taxRate: 0,
        issuedAt: at(s.invoice.issuedDay, 17),
        dueAt: at(s.invoice.issuedDay + 7, 17),
        paidAt: s.invoice.paidDay !== undefined ? at(s.invoice.paidDay, 12) : undefined,
        paymentRef: s.invoice.paidDay !== undefined ? `pi_mock_${i + 1}` : undefined,
      });
      project.invoiceId = invId;
    }

    if (s.media) {
      const uploadedAt = project.deliveredAt ?? at(0);
      for (let n = 0; n < s.media.photos; n++) {
        const room = photoRooms[n % photoRooms.length];
        const filename = `${String(n + 1).padStart(2, "0")}-${room}.jpg`;
        media.push({
          id: `med_${project.id}_${n}`,
          projectId: project.id,
          kind: "photo",
          filename,
          storageKey: `projects/${project.id}/photos/${filename}`,
          sizeBytes: 2_400_000 + ((n * 7919) % 1_800_000),
          width: 4096,
          height: 2731,
          seed: i * 31 + n,
          uploadedAt,
        });
      }
      if (s.media.video) {
        media.push({ id: `med_${project.id}_v`, projectId: project.id, kind: "video", filename: "walkthrough-branded.mp4", storageKey: `projects/${project.id}/video/walkthrough-branded.mp4`, sizeBytes: 412_000_000, durationSec: 84, seed: i * 31 + 99, uploadedAt });
        media.push({ id: `med_${project.id}_v2`, projectId: project.id, kind: "video", filename: "walkthrough-unbranded.mp4", storageKey: `projects/${project.id}/video/walkthrough-unbranded.mp4`, sizeBytes: 405_000_000, durationSec: 84, seed: i * 31 + 98, uploadedAt });
      }
      if (s.media.floorplan) {
        media.push({ id: `med_${project.id}_f`, projectId: project.id, kind: "floorplan", filename: "floor-plan.pdf", storageKey: `projects/${project.id}/floorplan/floor-plan.pdf`, sizeBytes: 1_200_000, seed: i * 31 + 97, uploadedAt });
      }
      if (s.media.tour) {
        media.push({ id: `med_${project.id}_t`, projectId: project.id, kind: "tour", filename: "3D Tour", storageKey: "", externalUrl: "https://example.com/tour", sizeBytes: 0, seed: i * 31 + 96, uploadedAt });
      }
    }

    projects.push(project);
  });

  const activity: ActivityEvent[] = [
    { id: "act_1", at: at(0, 8, 12), kind: "booking", text: "Ben Carter requested a shoot at 608 Eureka Way", projectId: "prj_8", clientId: "cli_ben" },
    { id: "act_2", at: at(0, 7, 40), kind: "booking", text: "Priya Shah booked a shoot at 4500 Bechelli Lane", projectId: "prj_9", clientId: "cli_priya" },
    { id: "act_3", at: at(-1, 19, 5), kind: "download", text: "Maya Okafor downloaded 24 photos from 1840 Lake Boulevard", projectId: "prj_1", clientId: "cli_maya" },
    { id: "act_4", at: at(-2, 16, 30), kind: "delivery", text: "Delivered 18 photos for 77 Hilltop Drive", projectId: "prj_2", clientId: "cli_maya" },
    { id: "act_5", at: at(-6, 9, 0), kind: "client", text: "Ben Carter joined as a new client", clientId: "cli_ben" },
    { id: "act_6", at: at(-7, 12, 0), kind: "payment", text: "Payment received for INV-1041 ($395.00)", projectId: "prj_1", clientId: "cli_maya" },
  ];

  return { clients, services, packages, projects, shoots, invoices, media, activity };
}

/** Paid revenue (cents) for the five months before the current one, newest last. */
export const revenueHistory = [612000, 748500, 905000, 821500, 1047000];
