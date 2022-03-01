import ChargingStation, { Voltage } from '../types/ChargingStation';

import Address from './Address';
import ConnectorStats from './ConnectorStats';
import Consumption from './Consumption';
import CreatedUpdatedProps from './CreatedUpdatedProps';
import { OCPILocation } from './ocpi/OCPILocation';
import { OpeningTimes } from './OpeningTimes';
import Site from '../types/Site';
import { SiteAreaAuthorizationActions } from './Authorization';

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

export default interface SiteArea extends CreatedUpdatedProps, SiteAreaAuthorizationActions {
  id: string;
  name: string;
  issuer: boolean;
  maximumPower: number;
  voltage: Voltage;
  numberOfPhases: number;
  address: Address;
  image: string;
  siteID: string;
  site: Site;
  smartCharging: boolean;
  accessControl: boolean;
  chargingStations: ChargingStation[];
  connectorStats: ConnectorStats;
  values: Consumption[];
  distanceMeters?: number;
  openingTimes?: OpeningTimes;
  tariffID?: string;
  ocpiData?: SiteAreaOcpiData;
}

export interface SiteAreaOcpiData {
  location: OCPILocation;
}
