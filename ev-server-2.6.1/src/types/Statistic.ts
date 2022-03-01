import User from './User';

export default interface StatisticFilter {
  year?: number;
  startDateTime?: Date;
  endDateTime?: Date;
  siteID?: string;
  siteIDs?: string[];
  periodInMonth?: string|number;
  siteAreaID?: string;
  siteAreaIDs?: string[];
  chargeBoxID?: string;
  chargeBoxIDs?: string[];
  userID?: string;
  userIDs?: string[];
  dataType?: string;
  dataCategory?: string;
  dataScope?: string;
  stop: {
    $exists: boolean;
  };
}

export enum StatsGroupBy {
  CONSUMPTION = 'C',
  USAGE = 'U',
  INACTIVITY = 'I',
  TRANSACTIONS = 'T',
  PRICING = 'P',
}

export enum StatsDataCategory {
  CHARGING_STATION = 'C',
  USER = 'U',
}

export enum StatsDataType {
  CONSUMPTION = 'Consumption',
  USAGE = 'Usage',
  INACTIVITY = 'Inactivity',
  TRANSACTION = 'Transactions',
  PRICING = 'Pricing',
}

export enum StatsDataScope {
  YEAR = 'year',
  MONTH = 'month',
}

export interface ChargingStationStats {
  chargeBox: string;
  month: number;
  total: number;
  unit: string;
}

export interface UserStats {
  userID: string;
  user?: User;
  month: number;
  total: number;
  unit: string;
}
