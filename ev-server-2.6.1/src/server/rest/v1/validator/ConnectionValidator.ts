import { HttpConnectionRequest, HttpConnectionsRequest } from '../../../../types/requests/HttpConnectionRequest';

import Connection from '../../../../types/Connection';
import Schema from '../../../../types/validator/Schema';
import SchemaValidator from '../../../../validator/SchemaValidator';
import fs from 'fs';
import global from '../../../../types/GlobalType';

export default class ConnectionValidator extends SchemaValidator {
  private static instance: ConnectionValidator|null = null;
  private connectionCreate: Schema = JSON.parse(fs.readFileSync(`${global.appRoot}/assets/server/rest/v1/schemas/connections/connection-create.json`, 'utf8'));
  private connectionsGet: Schema = JSON.parse(fs.readFileSync(`${global.appRoot}/assets/server/rest/v1/schemas/connections/connections-get.json`, 'utf8'));
  private connectionGet: Schema = JSON.parse(fs.readFileSync(`${global.appRoot}/assets/server/rest/v1/schemas/connections/connection-get.json`, 'utf8'));

  private constructor() {
    super('ConnectionValidator');
  }

  public static getInstance(): ConnectionValidator {
    if (!ConnectionValidator.instance) {
      ConnectionValidator.instance = new ConnectionValidator();
    }
    return ConnectionValidator.instance;
  }

  validateConnectionCreateReq(data: Record<string, unknown>): Connection {
    return this.validate(this.connectionCreate, data);
  }

  validateConnectionsGetReq(data: Record<string, unknown>): HttpConnectionsRequest {
    return this.validate(this.connectionsGet, data);
  }

  validateConnectionGetReq(data: Record<string, unknown>): HttpConnectionRequest {
    return this.validate(this.connectionGet, data);
  }
}

