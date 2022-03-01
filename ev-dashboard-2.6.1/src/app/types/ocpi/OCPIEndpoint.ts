import { TableData } from '../Table';

export interface OcpiEndpoint extends TableData {
  id: string;
  name: string;
  role: string;
  baseUrl: string;
  countryCode: string;
  partyId: string;
  version?: string;
  status?: OcpiEndpointStatus;
  localToken: string;
  token: string;
  backgroundPatchJob: boolean;
  lastPatchJobOn: Date;
  lastPatchJobResult?: any;
}

export interface OcpiEndpointDetail extends TableData {
  id: string;
  ocpiendpoint: OcpiEndpoint;
  status: string;
  backgroundPatchJob: boolean;
  lastPatchJobOn: Date;
  successNbr: number;
  failureNbr: number;
  totalNbr: number;
}

export enum OcpiButtonAction {
  PUSH_TOKENS = 'push_tokens',
  PUSH_EVSE_STATUSES = 'push_evse_statuses',
  CHECK_CDRS = 'check_cdrs',
  CHECK_LOCATIONS = 'check_locations',
  CHECK_SESSIONS = 'check_sessions',
  PULL_CDRS = 'pull_cdrs',
  PULL_LOCATIONS = 'pull_locations',
  PULL_SESSIONS = 'pull_sessions',
  PULL_TOKENS = 'pull_tokens',
  START_JOB = 'stop_start_job',
}

export enum OcpiEndpointStatus {
  NEW = 'new',
  REGISTERED = 'registered',
  UNREGISTERED = 'unregistered',
}

export enum OcpiRole {
  CPO = 'CPO',
  EMSP = 'EMSP',
}

export enum OcpiEndpointPatchJobStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}
