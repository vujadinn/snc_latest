import CrudApi from './utils/CrudApi';
import { ServerRoute } from '../../../src/types/Server';
import TestConstants from './utils/TestConstants';

export default class SmartChargingApi extends CrudApi {
  public constructor(authenticatedApi) {
    super(authenticatedApi);
  }

  public async testConnection(params?, paging = TestConstants.DEFAULT_PAGING, ordering = TestConstants.DEFAULT_ORDERING) {
    return await super.readAll(params, paging, ordering, `/v1/api/${ServerRoute.REST_CHARGING_STATION_CHECK_SMART_CHARGING_CONNECTION}`);
  }

  public async getChargingProfiles(params?, paging = TestConstants.DEFAULT_PAGING, ordering = TestConstants.DEFAULT_ORDERING) {
    return await super.readAll(params, paging, ordering, `/v1/api/${ServerRoute.REST_CHARGING_PROFILES}`);
  }

  public async triggerSmartCharging(params?, paging = TestConstants.DEFAULT_PAGING, ordering = TestConstants.DEFAULT_ORDERING) {
    return await super.readAll(params, paging, ordering, `/v1/api/${ServerRoute.REST_CHARGING_STATION_TRIGGER_SMART_CHARGING}`);
  }
}
