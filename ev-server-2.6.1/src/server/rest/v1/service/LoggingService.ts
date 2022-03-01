import { DataResult, LogDataResult } from '../../../../types/DataResult';
import { NextFunction, Request, Response } from 'express';

import { Action } from '../../../../types/Authorization';
import AuthorizationService from './AuthorizationService';
import Constants from '../../../../utils/Constants';
import { HttpLogsRequest } from '../../../../types/requests/HttpLoggingRequest';
import { Log } from '../../../../types/Log';
import LoggingStorage from '../../../../storage/mongodb/LoggingStorage';
import LoggingValidator from '../validator/LoggingValidator';
import { ServerAction } from '../../../../types/Server';
import Utils from '../../../../utils/Utils';
import UtilsService from './UtilsService';
import moment from 'moment';

const MODULE_NAME = 'LoggingService';

export default class LoggingService {
  public static async handleGetLogs(action: ServerAction, req: Request, res: Response, next: NextFunction): Promise<void> {
    // Filter
    const filteredRequest = LoggingValidator.getInstance().validateLoggingsGetReq(req.query);
    // Get Logs
    res.json(await LoggingService.getLogs(req, filteredRequest));
    next();
  }

  public static async handleExportLogs(action: ServerAction, req: Request, res: Response, next: NextFunction): Promise<void> {
    // Force params
    req.query.Limit = Constants.EXPORT_PAGE_SIZE.toString();
    // Filter
    const filteredRequest = LoggingValidator.getInstance().validateLoggingsGetReq(req.query);
    // Export
    await UtilsService.exportToCSV(req, res, 'exported-logs.csv', filteredRequest,
      LoggingService.getLogs.bind(this),
      LoggingService.convertToCSV.bind(this));
  }

  public static async handleGetLog(action: ServerAction, req: Request, res: Response, next: NextFunction): Promise<void> {
    // Filter
    const filteredRequest = LoggingValidator.getInstance().validateLoggingGetReq(req.query);
    // Check and Get Log
    const log = await UtilsService.checkAndGetLogAuthorization(
      req.tenant, req.user, filteredRequest.ID, Action.READ, action, null, null, true);
    res.json(log);
    next();
  }

  private static convertToCSV(req: Request, loggings: Log[], writeHeader = true): string {
    let headers = null;
    // Header
    if (writeHeader) {
      headers = [
        'level',
        'date',
        'time',
        'host',
        'source',
        'action',
        'siteID',
        'chargingStationID',
        'module',
        'method',
        'message',
      ].join(Constants.CSV_SEPARATOR);
    }
    // Content
    const rows = loggings.map((log) => {
      const row = [
        log.level,
        moment(log.timestamp).format('YYYY-MM-DD'),
        moment(log.timestamp).format('HH:mm:ss'),
        log.host,
        log.source,
        log.action,
        log.siteID,
        log.chargingStationID,
        log.module,
        log.method,
        log.message,
      ].map((value) => Utils.escapeCsvValue(value));
      return row;
    }).join(Constants.CR_LF);
    return Utils.isNullOrUndefined(headers) ? Constants.CR_LF + rows : [headers, rows].join(Constants.CR_LF);
  }

  private static async getLogs(req: Request, filteredRequest: HttpLogsRequest): Promise<DataResult<Log>> {
    // Check dynamic auth
    const authorizationSitesFilter = await AuthorizationService.checkAndGetLoggingsAuthorizations(
      req.tenant, req.user, filteredRequest);
    if (!authorizationSitesFilter.authorized) {
      return Constants.DB_EMPTY_DATA_RESULT;
    }
    // Get Logs
    const logs = await LoggingStorage.getLogs(req.tenant, {
      search: filteredRequest.Search,
      startDateTime: filteredRequest.StartDateTime,
      endDateTime: filteredRequest.EndDateTime,
      userIDs: filteredRequest.UserID ? filteredRequest.UserID.split('|') : null,
      siteIDs: filteredRequest.SiteID ? filteredRequest.SiteID.split('|') : null,
      chargingStationIDs: filteredRequest.ChargingStationID ? filteredRequest.ChargingStationID.split('|') : null,
      hosts: filteredRequest.Host ? filteredRequest.Host.split('|') : null,
      levels: filteredRequest.Level ? filteredRequest.Level.split('|') : null,
      sources: filteredRequest.Source ? filteredRequest.Source.split('|') : null,
      actions: filteredRequest.Action ? filteredRequest.Action.split('|') : null,
      ...authorizationSitesFilter.filters
    }, {
      limit: filteredRequest.Limit,
      skip: filteredRequest.Skip,
      sort: UtilsService.httpSortFieldsToMongoDB(filteredRequest.SortFields),
      onlyRecordCount: filteredRequest.OnlyRecordCount
    },
    authorizationSitesFilter.projectFields);
    // Assign projected fields
    if (authorizationSitesFilter.projectFields) {
      logs.projectFields = authorizationSitesFilter.projectFields;
    }
    // Add Auth flags
    await AuthorizationService.addLogsAuthorizations(req.tenant, req.user, logs as LogDataResult, authorizationSitesFilter);
    return logs;
  }
}
