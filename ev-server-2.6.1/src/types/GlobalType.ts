import { Car, CarCatalog } from './Car';

import ChargingStation from './ChargingStation';
import Company from './Company';
import JsonCentralSystemServer from '../server/ocpp/json/JsonCentralSystemServer';
import { Log } from './Log';
import MongoDBStorage from '../storage/mongodb/MongoDBStorage';
import PricingDefinition from './Pricing';
import RegistrationToken from './RegistrationToken';
import { ServerType } from './Server';
import Site from './Site';
import SiteArea from './SiteArea';
import SoapCentralSystemServer from '../server/ocpp/soap/SoapCentralSystemServer';
import Tag from './Tag';
import User from './User';
import bluebird from 'bluebird';
import path from 'path';

declare global {
  interface Global {}
}

export interface Data {
  id: string;
}

export interface DatabaseCount {
  count?: number;
}

export enum DatabaseDocumentChange {
  INSERT = 'insert',
  UPDATE = 'update',
  REPLACE = 'replace',
  DELETE = 'delete',
  INVALIDATE = 'invalidate',
  DROP = 'drop',
  DROP_DATABASE = 'dropDatabase',
  RENAME = 'rename',
}

export interface KeyValue {
  key: string;
  value: string;
  objectRef?: any;
  readonly?: boolean;
}

export interface Image {
  id: string;
  image: string;
}

export interface Logo {
  id: string;
  logo: string;
}

export interface GroupParams {
  [param: string]: any | string[];
}

export interface FilterParams {
  [param: string]: any | string[];
}

export interface ActionsResponse {
  inSuccess: number;
  inError: number;
}

export enum ImportStatus {
  READY = 'R',
  ERROR = 'E',
}

export type EntityData = Car|User|Company|Site|SiteArea|Tag|CarCatalog|ChargingStation|PricingDefinition|Log|RegistrationToken;

interface TSGlobal extends Global {
  database: MongoDBStorage;
  appRoot: string;
  centralSystemJsonServer: JsonCentralSystemServer;
  centralSystemSoapServer: SoapCentralSystemServer;
  serverType: ServerType;
  Promise: any;
}


// Export global variables
declare const global: TSGlobal;
// Use bluebird Promise as default
global.Promise = bluebird as any;
// AppRoot full path
if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
  global.appRoot = path.resolve(__dirname, '../');
} else if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'development-build') {
  global.appRoot = path.resolve(__dirname, '../dist');
} else {
  console.error(`Unknown NODE_ENV '${process.env.NODE_ENV}' defined, exiting`);
  process.exit();
}

export default global;

