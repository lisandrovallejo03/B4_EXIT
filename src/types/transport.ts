/** CABA GTFS Realtime: vehicle position */
export interface CabaVehiclePosition {
  latitude?: number;
  _latitude?: number;
  longitude?: number;
  _longitude?: number;
  bearing?: number;
  _bearing?: number;
}

/** CABA GTFS Realtime: trip descriptor */
export interface CabaTripDescriptor {
  route_id?: string;
  _route_id?: string;
}

/** CABA GTFS Realtime: vehicle descriptor (nested label) */
export interface CabaVehicleDescriptor {
  label?: string;
  _label?: string;
}

export interface CabaVehicle {
  position?: CabaVehiclePosition;
  _position?: CabaVehiclePosition;
  trip?: CabaTripDescriptor;
  _trip?: CabaTripDescriptor;
  vehicle?: CabaVehicleDescriptor;
  _vehicle?: CabaVehicleDescriptor;
  occupancy_status?: number;
  _occupancy_status?: number;
}

export interface CabaEntity {
  id?: string;
  _id?: string;
  vehicle?: CabaVehicle;
  _vehicle?: CabaVehicle;
}

export interface CabaFeedResponse {
  entity?: CabaEntity[];
  _entity?: CabaEntity[];
}

/** Service alert: informed entity */
export interface CabaInformedEntity {
  route_id?: string;
  _route_id?: string;
}

export interface CabaTranslatedString {
  translation?: Array<{ text?: string; _text?: string }>;
  _translation?: Array<{ text?: string; _text?: string }>;
}

export interface CabaAlert {
  informed_entity?: CabaInformedEntity[];
  _informed_entity?: CabaInformedEntity[];
  header_text?: CabaTranslatedString;
  _header_text?: CabaTranslatedString;
  effect?: string;
  _effect?: string;
}

export interface CabaAlertEntity {
  id?: string;
  _id?: string;
  alert?: CabaAlert;
  _alert?: CabaAlert;
}

export interface CabaAlertsResponse {
  entity?: CabaAlertEntity[];
  _entity?: CabaAlertEntity[];
}
