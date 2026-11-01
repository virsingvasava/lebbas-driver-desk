export type Stop = {
  seq: number | null;
  id: number;
  order_id: string;
  name: string | null;
  phone: string | null;
  area: string | null;
  slot: string | null;
  eta: string | null;
  late: boolean;
  status: string | null;
  lat: number | null;
  lng: number | null;
  emirate: string | null;
  maps_url: string | null;
};

export type RouteResponse = {
  driver: string;
  date: string;
  load: number;
  max: number;
  stops: Stop[];
};

export type RoadInfo = { km: number; minutes: number };
