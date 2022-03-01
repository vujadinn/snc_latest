import CentralSystemConfiguration from '../../types/configuration/CentralSystemConfiguration';
import ChargingStationConfiguration from '../../types/configuration/ChargingStationConfiguration';
import OCPPService from './services/OCPPService';
import { OCPPVersion } from '../../types/ocpp/OCPPServer';

export default abstract class CentralSystemServer {
  private static chargingStationService: OCPPService | null = null;
  protected centralSystemConfig: CentralSystemConfiguration;
  protected chargingStationConfig: ChargingStationConfiguration;

  // Common constructor for Central System Server
  constructor(centralSystemConfig: CentralSystemConfiguration, chargingStationConfig: ChargingStationConfiguration) {
    // Init
    this.centralSystemConfig = centralSystemConfig;
    this.chargingStationConfig = chargingStationConfig;
  }

  public getChargingStationService(ocppVersion: OCPPVersion): OCPPService {
    switch (ocppVersion) {
      case OCPPVersion.VERSION_15:
      case OCPPVersion.VERSION_16:
      default:
        if (!CentralSystemServer.chargingStationService) {
          CentralSystemServer.chargingStationService = new OCPPService(this.chargingStationConfig);
        }
        return CentralSystemServer.chargingStationService;
    }
  }

  public abstract start(): void;
}

