import AuthenticatedBaseApi from './utils/AuthenticatedBaseApi';
import CrudApi from './utils/CrudApi';
import RegistrationToken from '../../../src/types/RegistrationToken';
import { ServerRoute } from '../../../src/types/Server';
import TestConstants from './utils/TestConstants';

export default class RegistrationTokenApi extends CrudApi {
  public constructor(authenticatedApi: AuthenticatedBaseApi) {
    super(authenticatedApi);
  }

  public async readById(id) {
    return await super.readById(id, this.buildRestEndpointUrl(ServerRoute.REST_REGISTRATION_TOKEN, { id }));
  }

  public async readAll(params, paging = TestConstants.DEFAULT_PAGING, ordering = TestConstants.DEFAULT_ORDERING) {
    return await super.readAll(params, paging, ordering, this.buildRestEndpointUrl(ServerRoute.REST_REGISTRATION_TOKENS));
  }

  public async create(data: Partial<RegistrationToken>) {
    return await super.create(data, this.buildRestEndpointUrl(ServerRoute.REST_REGISTRATION_TOKENS));
  }

  public async update(data) {
    return super.update(data, '/client/api/RegistrationTokenUpdate');
  }

  public async delete(id) {
    return super.delete(id, '/client/api/RegistrationTokenDelete');
  }

  public async revoke(id) {
    return super.delete(id, '/client/api/RegistrationTokenRevoke');
  }
}
