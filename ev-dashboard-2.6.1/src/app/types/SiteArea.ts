import { Address } from './Address';
import { SiteAreaAuthorizationActions } from './Authorization';
import { ChargingStation, Voltage } from './ChargingStation';
import Consumption from './Consumption';
import { Site } from './Site';
import { TableData } from './Table';

export interface SiteArea extends TableData, SiteAreaAuthorizationActions {
  id: string;
  name: string;
  image: string;
  address: Address;
  maximumPower: number;
  numberOfPhases: number;
  voltage: Voltage;
  accessControl: boolean;
  smartCharging: boolean;
  siteID: string;
  site: Site;
  issuer: boolean;
  chargingStations: ChargingStation[];
  tariffID?: string;
}

export enum SiteAreaValueTypes {
  ASSET_CONSUMPTIONS = 'AssetConsumptions',
  ASSET_CONSUMPTION_WATTS = 'AssetConsumptionWatts',
  ASSET_CONSUMPTION_AMPS = 'AssetConsumptionAmps',
  ASSET_PRODUCTIONS = 'AssetProductions',
  ASSET_PRODUCTION_WATTS = 'AssetProductionWatts',
  ASSET_PRODUCTION_AMPS = 'AssetProductionAmps',
  CHARGING_STATION_CONSUMPTIONS = 'ChargingStationConsumptions',
  CHARGING_STATION_CONSUMPTION_WATTS = 'ChargingStationConsumptionWatts',
  CHARGING_STATION_CONSUMPTION_AMPS = 'ChargingStationConsumptionAmps',
  NET_CONSUMPTIONS = 'NetConsumptions',
  NET_CONSUMPTION_WATTS = 'NetConsumptionWatts',
  NET_CONSUMPTION_AMPS = 'NetConsumptionAmps',
}

export interface SiteAreaConsumption {
  siteAreaId: string;
  values: Consumption[];
}

export enum SiteAreaButtonAction {
  VIEW_SITE_AREA = 'view_site_area',
  EDIT_SITE_AREA = 'edit_site_area',
  CREATE_SITE_AREA = 'create_site_area',
  DELETE_SITE_AREA = 'delete_site_area',
  ASSIGN_CHARGING_STATIONS_TO_SITE_AREA = 'assign_charging_stations_to_site_area',
  VIEW_CHARGING_STATIONS_OF_SITE_AREA = 'view_charging_stations_of_site_area',
  ASSIGN_ASSETS_TO_SITE_AREA = 'assign_assets_to_site_area',
  VIEW_ASSETS_OF_SITE_AREA = 'view_assets_of_site_area',
}
