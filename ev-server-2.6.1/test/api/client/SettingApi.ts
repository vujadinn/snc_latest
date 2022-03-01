import AuthenticatedBaseApi from './utils/AuthenticatedBaseApi';
import CrudApi from './utils/CrudApi';
import { ServerRoute } from '../../../src/types/Server';
import TestConstants from './utils/TestConstants';

export default class SettingApi extends CrudApi {
  public constructor(authenticatedApi: AuthenticatedBaseApi) {
    super(authenticatedApi);
  }

  public async readById(id) {
    return super.readById(id, this.buildRestEndpointUrl(ServerRoute.REST_SETTING, { id }));
  }

  public async readByIdentifier(params?) {
    return super.read(params, this.buildRestEndpointUrl(ServerRoute.REST_SETTINGS));
  }

  public async readAll(params?, paging = TestConstants.DEFAULT_PAGING, ordering = TestConstants.DEFAULT_ORDERING) {
    return super.readAll(params, paging, ordering, this.buildRestEndpointUrl(ServerRoute.REST_SETTINGS));
  }

  public async create(data) {
    return super.create(data, this.buildRestEndpointUrl(ServerRoute.REST_SETTINGS));
  }

  public async update(data) {
    return super.update(data, this.buildRestEndpointUrl(ServerRoute.REST_SETTING, { id: data.id }));
  }

  public async delete(id) {
    return super.delete(id, this.buildRestEndpointUrl(ServerRoute.REST_SETTING, { id }));
  }
}

