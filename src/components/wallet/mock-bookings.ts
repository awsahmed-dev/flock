/**
 * Mock booking data for the Wallet preview. Hardcoded for now — once the
 * forwarded-email parser is live, these come from a `parsed_bookings`
 * table joined to trips + members.
 *
 * The shape covers every type the wallet renders. New types can be added
 * without touching the rendering layer if we extend the `type` union and
 * add a meta entry in wallet-card.tsx.
 */
export type BookingType = "flight" | "hotel" | "train" | "bus" | "esim" | "activity";

/** Who can see this booking. "crew" means every trip member; "private"
 *  means only the user who added it. eSIMs default to private; flights
 *  and hotels default to crew. The user picks at add-time. */
export type Visibility = "crew" | "private";

export interface MockBooking {
  id: string;
  type: BookingType;
  /** Short label shown as the prominent card title. */
  title: string;
  /** Optional logo URL or partner name shown as a chip. */
  partner: string;
  /** Free-form sub-text under the title — varies per type. */
  subtitle: string;
  /** Display price + currency. */
  price: number;
  currency: string;
  /** Confirmation code shown in the detail view. */
  reference: string;
  /** ISO date (or date-time) used for the date-chip filter at the top. */
  date: string;
  visibility: Visibility;
  addedBy: { displayName: string; userId: string };
  /** Type-specific extra fields rendered in the detail view. */
  flight?: {
    fromCode: string;
    toCode: string;
    fromCity: string;
    toCity: string;
    depTime: string; // "02:15"
    arrTime: string; // "16:40"
    durationLabel: string;
    airlineName: string;
    flightNumber: string;
    seat?: string;
    cabin?: string;
    passenger: string;
  };
  hotel?: {
    address: string;
    checkIn: string;
    checkOut: string;
    nights: number;
    guests: number;
    roomType: string;
  };
  train?: {
    fromStation: string;
    toStation: string;
    depTime: string;
    arrTime: string;
    durationLabel: string;
    operator: string;
    trainNumber: string;
    car: string;
    seat: string;
    passenger: string;
  };
  bus?: {
    fromCode: string;
    toCode: string;
    fromCity: string;
    toCity: string;
    depTime: string;
    arrTime: string;
    durationLabel: string;
    operator: string;
    seat?: string;
    rating?: number;
  };
  esim?: {
    country: string;
    dataAllowance: string;
    validity: string;
    activationCode: string;
  };
  activity?: {
    venue: string;
    startTime: string;
    duration: string;
    guests: number;
  };
}

export const MOCK_BOOKINGS: MockBooking[] = [
  {
    id: "bk-flight-1",
    type: "flight",
    title: "RUH → KUL",
    partner: "Saudia",
    subtitle: "Saudia SV848 · Economy",
    price: 1280,
    currency: "SAR",
    reference: "PNR · JKQ9XR",
    date: "2026-07-10",
    visibility: "crew",
    addedBy: { displayName: "You", userId: "u1" },
    flight: {
      fromCode: "RUH",
      toCode: "KUL",
      fromCity: "Riyadh",
      toCity: "Kuala Lumpur",
      depTime: "02:15",
      arrTime: "16:40",
      durationLabel: "8h 25m",
      airlineName: "Saudia",
      flightNumber: "SV848",
      seat: "23A",
      cabin: "Economy",
      passenger: "Aws Al Selwi",
    },
  },
  {
    id: "bk-hotel-1",
    type: "hotel",
    title: "Mandarin Oriental KL",
    partner: "Booking.com",
    subtitle: "Jul 10 – Jul 13 · 3 nights",
    price: 540,
    currency: "SAR",
    reference: "4129-8821-XX",
    date: "2026-07-10",
    visibility: "crew",
    addedBy: { displayName: "You", userId: "u1" },
    hotel: {
      address: "Kuala Lumpur City Centre, KL 50088, Malaysia",
      checkIn: "Jul 10, 2026 · 15:00",
      checkOut: "Jul 13, 2026 · 12:00",
      nights: 3,
      guests: 2,
      roomType: "Deluxe King · City view",
    },
  },
  {
    id: "bk-train-1",
    type: "train",
    title: "KL Sentral → Butterworth",
    partner: "KTM ETS",
    subtitle: "Jul 12 · 08:45 → 13:05",
    price: 79,
    currency: "SAR",
    reference: "TRN-2026-789458",
    date: "2026-07-12",
    visibility: "crew",
    addedBy: { displayName: "You", userId: "u1" },
    train: {
      fromStation: "KL Sentral",
      toStation: "Butterworth (Penang)",
      depTime: "08:45",
      arrTime: "13:05",
      durationLabel: "4h 20m",
      operator: "KTM ETS Gold",
      trainNumber: "EG9214",
      car: "C5",
      seat: "12",
      passenger: "Aws Al Selwi",
    },
  },
  {
    id: "bk-bus-1",
    type: "bus",
    title: "FliXBus · KL → Penang",
    partner: "FliXBus",
    subtitle: "Jul 13 · 05:30 → 13:15",
    price: 18,
    currency: "SAR",
    reference: "FLB9804220",
    date: "2026-07-13",
    visibility: "crew",
    addedBy: { displayName: "You", userId: "u1" },
    bus: {
      fromCode: "KUL",
      toCode: "PEN",
      fromCity: "Kuala Lumpur",
      toCity: "Penang",
      depTime: "05:30",
      arrTime: "13:15",
      durationLabel: "7h 45m",
      operator: "FliXBus",
      seat: "A-04",
      rating: 7.8,
    },
  },
  {
    id: "bk-esim-1",
    type: "esim",
    title: "Airalo · Malaysia 5GB",
    partner: "Airalo",
    subtitle: "30 days · activates Jul 10",
    price: 34,
    currency: "SAR",
    reference: "AIR-2026-04412",
    date: "2026-07-10",
    visibility: "private",
    addedBy: { displayName: "You", userId: "u1" },
    esim: {
      country: "Malaysia",
      dataAllowance: "5 GB",
      validity: "30 days",
      activationCode: "LPA:1$prod.ondemandconnectivity.com$YXJOLN-PAX-04412",
    },
  },
  {
    id: "bk-activity-1",
    type: "activity",
    title: "Batu Caves + Temple tour",
    partner: "GetYourGuide",
    subtitle: "Jul 11 · 09:00 · 4 hours",
    price: 68,
    currency: "SAR",
    reference: "GYG-PAX-77123",
    date: "2026-07-11",
    visibility: "crew",
    addedBy: { displayName: "You", userId: "u1" },
    activity: {
      venue: "Batu Caves Meeting Point, Jalan Batu Caves",
      startTime: "Jul 11, 2026 · 09:00",
      duration: "4 hours",
      guests: 4,
    },
  },
];
