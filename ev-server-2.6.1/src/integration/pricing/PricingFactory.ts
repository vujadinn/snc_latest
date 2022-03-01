import { PricingSetting, PricingSettingsType } from '../../types/Setting';
import Tenant, { TenantComponents } from '../../types/Tenant';

import BuiltInPricingIntegration from './simple-pricing/BuiltInPricingIntegration';
import PricingIntegration from './PricingIntegration';
import SapConvergentChargingPricingIntegration from './sap-convergent-charging/SapConvergentChargingPricingIntegration';
import SettingStorage from '../../storage/mongodb/SettingStorage';
import Utils from '../../utils/Utils';

export default class PricingFactory {
  public static async getPricingImpl(tenant: Tenant): Promise<PricingIntegration<PricingSetting>> {
    // Check if the Pricing is active
    if (Utils.isTenantComponentActive(tenant, TenantComponents.PRICING)) {
      // Get the pricing settings
      const pricingSetting = await SettingStorage.getPricingSettings(tenant);
      if (pricingSetting) {
        let pricingIntegrationImpl = null;
        switch (pricingSetting.type) {
          // SAP Convergent Charging
          case PricingSettingsType.CONVERGENT_CHARGING:
            pricingIntegrationImpl = new SapConvergentChargingPricingIntegration(tenant, pricingSetting.convergentCharging);
            break;
          // Simple Pricing
          case PricingSettingsType.SIMPLE:
            // Simple Pricing implementation
            pricingIntegrationImpl = new BuiltInPricingIntegration(tenant, pricingSetting.simple);
            break;
        }
        return pricingIntegrationImpl;
      }
    }
    return null;
  }
}

