import SchedulerConfiguration, { SchedulerTaskConfiguration } from '../types/configuration/SchedulerConfiguration';

import AssetGetConsumptionTask from './tasks/AssetGetConsumptionTask';
import AsyncTaskCheckTask from './tasks/AsyncTaskCheckTask';
import BillPendingTransactionTask from './tasks/BillPendingTransactionTask';
import BillingPeriodicOperationTask from './tasks/BillingPeriodicOperationTask';
import CheckAndComputeSmartChargingTask from './tasks/CheckAndComputeSmartChargingTask';
import CheckChargingStationTemplateTask from './tasks/CheckChargingStationTemplateTask';
import CheckOfflineChargingStationsTask from './tasks/CheckOfflineChargingStationsTask';
import CheckPreparingSessionNotStartedTask from './tasks/CheckPreparingSessionNotStartedTask';
import CheckSessionNotStartedAfterAuthorizeTask from './tasks/CheckSessionNotStartedAfterAuthorizeTask';
import CheckUserAccountInactivityTask from './tasks/CheckUserAccountInactivityTask';
import CloseTransactionsInProgressTask from './tasks/CloseTransactionsInProgressTask';
import Constants from '../utils/Constants';
import Logging from '../utils/Logging';
import LoggingDatabaseTableCleanupTask from './tasks/LoggingDatabaseTableCleanupTask';
import MigrateSensitiveDataTask from './tasks/MigrateSensitiveDataTask';
import OCPICheckCdrsTask from './tasks/ocpi/OCPICheckCdrsTask';
import OCPICheckLocationsTask from './tasks/ocpi/OCPICheckLocationsTask';
import OCPICheckSessionsTask from './tasks/ocpi/OCPICheckSessionsTask';
import OCPIGetCdrsTask from './tasks/ocpi/OCPIGetCdrsTask';
import OCPIGetLocationsTask from './tasks/ocpi/OCPIGetLocationsTask';
import OCPIGetSessionsTask from './tasks/ocpi/OCPIGetSessionsTask';
import OCPIGetTokensTask from './tasks/ocpi/OCPIGetTokensTask';
import OCPIPushCdrsTask from './tasks/ocpi/OCPIPushCdrsTask';
import OCPIPushEVSEStatusesTask from './tasks/ocpi/OCPIPushEVSEStatusesTask';
import OICPPushEvseDataTask from './tasks/oicp/OICPPushEvseDataTask';
import OICPPushEvseStatusTask from './tasks/oicp/OICPPushEvseStatusTask';
import SchedulerTask from './SchedulerTask';
import { ServerAction } from '../types/Server';
import SynchronizeCarsTask from './tasks/SynchronizeCarsTask';
import SynchronizeRefundTransactionsTask from './tasks/SynchronizeRefundTransactionsTask';
import cron from 'node-cron';

const MODULE_NAME = 'SchedulerManager';

export default class SchedulerManager {
  private static schedulerConfig: SchedulerConfiguration;

  public static async init(schedulerConfig: SchedulerConfiguration): Promise<void> {
    // Keep the conf
    SchedulerManager.schedulerConfig = schedulerConfig;
    // Log
    await Logging.logInfo({
      tenantID: Constants.DEFAULT_TENANT,
      action: ServerAction.SCHEDULER,
      module: MODULE_NAME, method: 'init',
      message: 'The Scheduler is active'
    });
    // Yes: init
    for (const task of SchedulerManager.schedulerConfig.tasks) {
      // Active?
      if (!task.active) {
        await Logging.logWarning({
          tenantID: Constants.DEFAULT_TENANT,
          action: ServerAction.SCHEDULER,
          module: MODULE_NAME, method: 'init',
          message: `The task '${task.name}' is inactive`
        });
        continue;
      }
      const schedulerTask = await SchedulerManager.createTask(task.name);
      if (schedulerTask) {
        // Register task to cron engine
        cron.schedule(task.periodicity, () => SchedulerManager.runTask(schedulerTask, task));
        await Logging.logInfo({
          tenantID: Constants.DEFAULT_TENANT,
          action: ServerAction.SCHEDULER,
          module: MODULE_NAME, method: 'init',
          message: `The task '${task.name}' has been scheduled with periodicity ''${task.periodicity}'`
        });
      }
    }
  }

  private static runTask(task: SchedulerTask, taskConfiguration: SchedulerTaskConfiguration): void {
    // Set default config
    if (!taskConfiguration.config) {
      taskConfiguration.config = {};
    }
    // Do not wait for the task result
    void task.run(taskConfiguration.name, taskConfiguration.config);
  }

  private static async createTask(name: string): Promise<SchedulerTask> {
    // Tasks
    switch (name) {
      case 'AsyncTaskCheckTask':
        return new AsyncTaskCheckTask();
      case 'LoggingDatabaseTableCleanupTask':
        return new LoggingDatabaseTableCleanupTask();
      case 'CheckUserAccountInactivityTask':
        return new CheckUserAccountInactivityTask();
      case 'CheckOfflineChargingStationsTask':
        // The task runs every five minutes
        return new CheckOfflineChargingStationsTask();
      case 'CheckPreparingSessionNotStartedTask':
        // The task runs every five minutes
        return new CheckPreparingSessionNotStartedTask();
      case 'OICPPushEVSEDataTask':
        return new OICPPushEvseDataTask();
      case 'OICPPushEvseStatusTask':
        return new OICPPushEvseStatusTask();
      case 'OCPIPushEVSEStatusesTask':
        return new OCPIPushEVSEStatusesTask();
      case 'OCPIGetCdrsTask':
        return new OCPIGetCdrsTask();
      case 'OCPIGetLocationsTask':
        return new OCPIGetLocationsTask();
      case 'OCPIGetSessionsTask':
        return new OCPIGetSessionsTask();
      case 'OCPICheckLocationsTask':
        return new OCPICheckLocationsTask();
      case 'OCPICheckSessionsTask':
        return new OCPICheckSessionsTask();
      case 'OCPICheckCdrsTask':
        return new OCPICheckCdrsTask();
      case 'OCPIGetTokensTask':
        return new OCPIGetTokensTask();
      case 'OCPIPushCdrsTask':
        return new OCPIPushCdrsTask();
      case 'SynchronizeRefundTransactionsTask':
        return new SynchronizeRefundTransactionsTask();
      case 'BillingPeriodicOperationTask':
        return new BillingPeriodicOperationTask();
      case 'BillPendingTransactionTask':
        return new BillPendingTransactionTask();
      case 'SynchronizeCarsTask':
        return new SynchronizeCarsTask();
      case 'CheckSessionNotStartedAfterAuthorizeTask':
        return new CheckSessionNotStartedAfterAuthorizeTask();
      case 'CheckAndComputeSmartChargingTask':
        return new CheckAndComputeSmartChargingTask();
      case 'AssetGetConsumptionTask':
        return new AssetGetConsumptionTask();
      case 'CheckChargingStationTemplateTask':
        return new CheckChargingStationTemplateTask();
      case 'MigrateSensitiveDataTask':
        return new MigrateSensitiveDataTask();
      case 'CloseTransactionsInProgressTask':
        return new CloseTransactionsInProgressTask();
      default:
        await Logging.logError({
          tenantID: Constants.DEFAULT_TENANT,
          action: ServerAction.SCHEDULER,
          module: MODULE_NAME, method: 'createTask',
          message: `The task '${name}' is unknown`
        });
    }
  }
}
