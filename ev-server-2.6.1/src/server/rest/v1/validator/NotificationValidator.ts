import { HttpEndUserReportErrorRequest, HttpNotificationRequest } from '../../../../types/requests/HttpNotificationRequest';

import Schema from '../../../../types/validator/Schema';
import SchemaValidator from '../../../../validator/SchemaValidator';
import fs from 'fs';
import global from '../../../../types/GlobalType';

export default class NotificationValidator extends SchemaValidator {
  private static instance: NotificationValidator|null = null;
  private notificationsGet: Schema = JSON.parse(fs.readFileSync(`${global.appRoot}/assets/server/rest/v1/schemas/notification/notifications-get.json`, 'utf8'));
  private notificationsEndUserErrorReport: Schema = JSON.parse(fs.readFileSync(`${global.appRoot}/assets/server/rest/v1/schemas/notification/notifications-end-user-error-report.json`, 'utf8'));

  private constructor() {
    super('NotificationValidator');
  }

  public static getInstance(): NotificationValidator {
    if (!NotificationValidator.instance) {
      NotificationValidator.instance = new NotificationValidator();
    }
    return NotificationValidator.instance;
  }

  public validateNotificationsGetReq(data: Record<string, unknown>): HttpNotificationRequest {
    return this.validate(this.notificationsGet, data);
  }

  public validateEndUserErrorReportReq(data: Record<string, unknown>): HttpEndUserReportErrorRequest {
    return this.validate(this.notificationsEndUserErrorReport, data);
  }
}
