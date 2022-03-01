import BillingFactory from '../../integration/billing/BillingFactory';
import LockingHelper from '../../locking/LockingHelper';
import LockingManager from '../../locking/LockingManager';
import Logging from '../../utils/Logging';
import NotificationHandler from '../../notification/NotificationHandler';
import { ServerAction } from '../../types/Server';
import Tenant from '../../types/Tenant';
import TenantSchedulerTask from '../TenantSchedulerTask';
import Utils from '../../utils/Utils';

export default class BillingPeriodicOperationTask extends TenantSchedulerTask {
  public async processTenant(tenant: Tenant, /* taskConfig: BillingPeriodicOperationTaskConfig */): Promise<void> {
    // Get the lock
    const billingLock = await LockingHelper.acquireBillingPeriodicOperationLock(tenant.id);
    if (billingLock) {
      try {
        const billingImpl = await BillingFactory.getBillingImpl(tenant);
        if (billingImpl) {
          // Attempt to finalize and pay invoices
          const chargeActionResults = await billingImpl.chargeInvoices();
          if (chargeActionResults.inError > 0) {
            void NotificationHandler.sendBillingPeriodicOperationFailed(
              tenant,
              {
                nbrInvoicesInError: chargeActionResults.inError,
                evseDashboardURL: Utils.buildEvseURL(tenant.subdomain),
                evseDashboardBillingURL: Utils.buildEvseBillingSettingsURL(tenant.subdomain)
              }
            );
          }
        }
      } catch (error) {
        // Log error
        await Logging.logActionExceptionMessage(tenant.id, ServerAction.BILLING_PERFORM_OPERATIONS, error);
      } finally {
        // Release the lock
        await LockingManager.release(billingLock);
      }
    }
  }
}
