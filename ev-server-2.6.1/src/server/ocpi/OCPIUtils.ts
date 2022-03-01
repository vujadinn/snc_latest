import ChargingStation, { Connector, ConnectorType } from '../../types/ChargingStation';
import { OCPIConnector, OCPIConnectorType } from '../../types/ocpi/OCPIConnector';
import { OCPIEvse, OCPIEvseStatus } from '../../types/ocpi/OCPIEvse';
import { OCPITariff, OCPITariffDimensionType } from '../../types/ocpi/OCPITariff';
import { OCPIToken, OCPITokenType } from '../../types/ocpi/OCPIToken';

import AppError from '../../exception/AppError';
import BackendError from '../../exception/BackendError';
import { ChargePointStatus } from '../../types/ocpp/OCPPServer';
import ChargingStationStorage from '../../storage/mongodb/ChargingStationStorage';
import Company from '../../types/Company';
import CompanyStorage from '../../storage/mongodb/CompanyStorage';
import Constants from '../../utils/Constants';
import Logging from '../../utils/Logging';
import LoggingHelper from '../../utils/LoggingHelper';
import OCPIEndpoint from '../../types/ocpi/OCPIEndpoint';
import { OCPILocation } from '../../types/ocpi/OCPILocation';
import { OCPIResponse } from '../../types/ocpi/OCPIResponse';
import { OCPIStatusCode } from '../../types/ocpi/OCPIStatusCode';
import { Request } from 'express';
import { ServerAction } from '../../types/Server';
import { SimplePricingSetting } from '../../types/Setting';
import Site from '../../types/Site';
import SiteArea from '../../types/SiteArea';
import SiteAreaStorage from '../../storage/mongodb/SiteAreaStorage';
import SiteStorage from '../../storage/mongodb/SiteStorage';
import Tenant from '../../types/Tenant';
import Utils from '../../utils/Utils';
import _ from 'lodash';
import moment from 'moment';

const MODULE_NAME = 'OCPIUtils';

export default class OCPIUtils {
  public static getConnectorIDFromEvseID(evseID: string): string {
    return evseID.split(Constants.OCPI_SEPARATOR).pop();
  }

  public static getConnectorIDFromEvseUID(evseUID: string): string {
    return evseUID.split(Constants.OCPI_SEPARATOR).pop();
  }

  public static success(data?: any): OCPIResponse {
    return {
      data: data,
      status_code: OCPIStatusCode.CODE_1000_SUCCESS.status_code,
      status_message: OCPIStatusCode.CODE_1000_SUCCESS.status_message,
      timestamp: new Date().toISOString()
    };
  }

  public static toErrorResponse(error: Error): OCPIResponse {
    return {
      status_message: error.message,
      timestamp: new Date().toISOString(),
      status_code: error instanceof AppError && error.params.ocpiError ?
        error.params.ocpiError.status_code : OCPIStatusCode.CODE_3000_GENERIC_SERVER_ERROR.status_code
    };
  }

  public static buildNextUrl(req: Request, baseUrl: string, offset: number, limit: number, total: number): string | undefined {
    // Check if next link should be generated
    if (offset + limit < total) {
      // Build url
      const query = req.query;
      query.offset = (offset + limit).toString();
      query.limit = limit.toString();
      let queryString: string;
      for (const param in query) {
        queryString = queryString ? `${queryString}&${param}=${query[param] as string}` : `${param}=${query[param] as string}`;
      }
      return `${baseUrl + req.originalUrl.split('?')[0]}?${queryString}`;
    }
  }

  public static getNextUrl(link: string): string | undefined {
    if (link) {
      const match = /<(.*)>;rel="next"/.exec(link.replace(/ /g, ''));
      if (match) {
        return match[1];
      }
    }
  }

  public static buildLocationUrl(req: Request, baseUrl: string, id: string): string {
    // Build url
    return `${baseUrl + req.originalUrl.split('?')[0]}/${id}`;
  }

  public static buildChargingStationId(locationId: string, evseId: string): string {
    return `${locationId}-${evseId}`;
  }

  public static buildOperatorName(countryCode: string, partyId: string): string {
    return `${countryCode}*${partyId}`;
  }

  public static buildSiteAreaName(countryCode: string, partyId: string, locationId: string): string {
    return `${countryCode}*${partyId}-${locationId}`;
  }

  public static buildEvseUID(chargingStation: ChargingStation, connector: Connector): string {
    // connectors are grouped in the same evse when the connectors cannot charge in parallel
    if (connector.chargePointID) {
      const chargePoint = Utils.getChargePointFromID(chargingStation, connector.chargePointID);
      if (chargePoint && chargePoint.cannotChargeInParallel) {
        return `${chargingStation.id}*${chargePoint.chargePointID}`;
      }
    }
    return `${chargingStation.id}*${connector.connectorId}`;
  }

  public static buildEvseUIDs(chargingStation: ChargingStation): string[] {
    const evseUIDs: string[] = [];
    for (const _connector of chargingStation.connectors) {
      if (_connector) {
        evseUIDs.push(OCPIUtils.buildEvseUID(chargingStation, _connector));
      }
    }
    return evseUIDs;
  }

  public static buildEmspEmailFromOCPIToken(token: OCPIToken, countryCode: string, partyId: string): string {
    if (token?.issuer) {
      return `${token.issuer}@${partyId}.${countryCode}`.toLowerCase();
    }
  }

  public static atob(base64: string): string {
    return Buffer.from(base64, 'base64').toString('binary');
  }

  public static btoa(str: string): string {
    return Buffer.from(str).toString('base64');
  }

  public static getOCPITokenTypeFromID(tagID: string): OCPITokenType {
    // Virtual badges handling
    return tagID.length % 8 === 0 ? OCPITokenType.RFID : OCPITokenType.OTHER;
  }

  public static getOCPIEmspLocationIDFromSiteAreaName(siteAreaName: string): string {
    const siteParts = siteAreaName.split(Constants.OCPI_SEPARATOR);
    return siteParts.pop();
  }

  public static generateLocalToken(tenantSubdomain: string): string {
    const newToken: any = {};
    // Generate random
    newToken.ak = Utils.getRandomInt(100);
    // Fill new Token with tenant subdomain
    newToken.tid = tenantSubdomain;
    // Generate random
    newToken.zk = Utils.getRandomInt(100);
    // Return in Base64
    return OCPIUtils.btoa(JSON.stringify(newToken));
  }

  public static isAuthorizationValid(authorizationDate: Date): boolean {
    return authorizationDate && moment(authorizationDate).isAfter(moment().subtract(
      Constants.ROAMING_AUTHORIZATION_TIMEOUT_MINS, 'minutes'));
  }

  public static async checkAndGetEMSPCompany(tenant: Tenant, ocpiEndpoint: OCPIEndpoint): Promise<Company> {
    let company = await CompanyStorage.getCompany(tenant, ocpiEndpoint.id);
    if (!company) {
      company = {
        id: ocpiEndpoint.id,
        name: `${ocpiEndpoint.name} (${ocpiEndpoint.role})`,
        issuer: false,
        createdOn: new Date()
      } as Company;
      await CompanyStorage.saveCompany(tenant, company, false);
    }
    return company;
  }

  public static async processEMSPLocationChargingStations(tenant: Tenant, location: OCPILocation, site: Site,
      siteArea: SiteArea, evses: OCPIEvse[], action: ServerAction): Promise<void> {
    // Process Charging Stations
    if (!Utils.isEmptyArray(evses)) {
      for (const evse of evses) {
        try {
          await OCPIUtils.processEMSPLocationChargingStation(tenant, location, site, siteArea, evse, action);
        } catch (error) {
          await Logging.logError({
            tenantID: tenant.id,
            action, module: MODULE_NAME, method: 'processEMSPLocationChargingStations',
            message: `Error while processing the EVSE UID '${evse.uid}' (ID '${evse.evse_id}') in Location '${location.name}'`,
            detailedMessages: { error: error.stack, evse, location, site, siteArea }
          });
        }
      }
    }
  }

  public static async processEMSPLocationChargingStation(tenant: Tenant, location: OCPILocation, site: Site,
      siteArea: SiteArea, evse: OCPIEvse, action: ServerAction): Promise<void> {
    if (!evse.uid) {
      throw new BackendError({
        action, module: MODULE_NAME, method: 'processEMSPLocationChargingStation',
        message: `Missing Charging Station EVSE UID in Location '${location.name}' with ID '${location.id}'`,
        detailedMessages:  { evse, location }
      });
    }
    // Get existing charging station
    const currentChargingStation = await ChargingStationStorage.getChargingStationByOcpiLocationEvseUid(
      tenant, location.id, evse.uid);
    // Delete Charging Station
    if (currentChargingStation && evse.status === OCPIEvseStatus.REMOVED) {
      await ChargingStationStorage.deleteChargingStation(tenant, currentChargingStation.id);
      await Logging.logDebug({
        ...LoggingHelper.getChargingStationProperties(currentChargingStation),
        tenantID: tenant.id,
        action, module: MODULE_NAME, method: 'processEMSPLocationChargingStation',
        message: `Deleted Charging Station ID '${currentChargingStation.id}' in Location '${location.name}' with ID '${location.id}'`,
        detailedMessages: { evse, location }
      });
    // Update/Create Charging Station
    } else {
      const chargingStation = OCPIUtils.convertEvseToChargingStation(
        currentChargingStation, evse, location, site, siteArea, action);
      await ChargingStationStorage.saveChargingStation(tenant, chargingStation);
      await ChargingStationStorage.saveChargingStationOcpiData(tenant, chargingStation.id, chargingStation.ocpiData);
      await Logging.logDebug({
        ...LoggingHelper.getChargingStationProperties(chargingStation),
        tenantID: tenant.id,
        action, module: MODULE_NAME, method: 'processEMSPLocationChargingStation',
        message: `${currentChargingStation ? 'Updated' : 'Created'} Charging Station ID '${chargingStation.id}' in Location '${location.name}' with ID '${location.id}'`,
        detailedMessages: location
      });
    }
  }

  public static convertEvseToChargingStation(chargingStation: ChargingStation, evse: OCPIEvse,
      location: OCPILocation, site: Site, siteArea: SiteArea, action: ServerAction): ChargingStation {
    if (!evse.evse_id) {
      throw new BackendError({
        action, module: MODULE_NAME, method: 'convertEvseToChargingStation',
        message: 'Cannot find Charging Station EVSE ID',
        detailedMessages:  { evse, location }
      });
    }
    if (!chargingStation) {
      chargingStation = {
        id: evse.evse_id,
        createdOn: new Date(),
        maximumPower: 0,
        issuer: false,
        connectors: [],
        companyID: site.companyID,
        siteID: site.id,
        siteAreaID: siteArea.id,
        ocpiData: {
          evses: [evse]
        }
      } as ChargingStation;
    } else {
      chargingStation = {
        ...chargingStation,
        maximumPower: 0,
        lastChangedOn: new Date(),
        connectors: [],
        ocpiData: {
          evses: [evse]
        }
      } as ChargingStation;
    }
    // Set the location ID
    evse.location_id = location.id;
    // Coordinates
    if (evse.coordinates?.latitude && evse.coordinates?.longitude) {
      chargingStation.coordinates = [
        Utils.convertToFloat(evse.coordinates.longitude),
        Utils.convertToFloat(evse.coordinates.latitude)
      ];
    } else if (location?.coordinates?.latitude && location?.coordinates?.longitude) {
      chargingStation.coordinates = [
        Utils.convertToFloat(location.coordinates.longitude),
        Utils.convertToFloat(location.coordinates.latitude)
      ];
    }
    if (!Utils.isEmptyArray(evse.connectors)) {
      let connectorID = 1;
      for (const evseConnector of evse.connectors) {
        const connector = OCPIUtils.convertEvseToChargingStationConnector(evse, evseConnector, connectorID++);
        chargingStation.connectors.push(connector);
        chargingStation.maximumPower = Math.max(chargingStation.maximumPower, connector.power);
      }
    }
    return chargingStation;
  }

  public static convertEvseToChargingStationConnector(evse: OCPIEvse, evseConnector: OCPIConnector, connectorID: number): Connector {
    return {
      id: evseConnector.id,
      status: OCPIUtils.convertOCPIStatus2Status(evse.status),
      amperage: evseConnector.amperage,
      voltage: evseConnector.voltage,
      connectorId: connectorID,
      currentInstantWatts: 0,
      power: evseConnector.amperage * evseConnector.voltage,
      type: OCPIUtils.convertOCPIConnectorType2ConnectorType(evseConnector.standard),
    };
  }

  public static convertOCPIConnectorType2ConnectorType(ocpiConnectorType: OCPIConnectorType): ConnectorType {
    switch (ocpiConnectorType) {
      case OCPIConnectorType.CHADEMO:
        return ConnectorType.CHADEMO;
      case OCPIConnectorType.IEC_62196_T2:
        return ConnectorType.TYPE_2;
      case OCPIConnectorType.IEC_62196_T2_COMBO:
        return ConnectorType.COMBO_CCS;
      case OCPIConnectorType.IEC_62196_T3:
      case OCPIConnectorType.IEC_62196_T3A:
        return ConnectorType.TYPE_3C;
      case OCPIConnectorType.IEC_62196_T1:
        return ConnectorType.TYPE_1;
      case OCPIConnectorType.IEC_62196_T1_COMBO:
        return ConnectorType.TYPE_1_CCS;
      case OCPIConnectorType.DOMESTIC_A:
      case OCPIConnectorType.DOMESTIC_B:
      case OCPIConnectorType.DOMESTIC_C:
      case OCPIConnectorType.DOMESTIC_D:
      case OCPIConnectorType.DOMESTIC_E:
      case OCPIConnectorType.DOMESTIC_F:
      case OCPIConnectorType.DOMESTIC_G:
      case OCPIConnectorType.DOMESTIC_H:
      case OCPIConnectorType.DOMESTIC_I:
      case OCPIConnectorType.DOMESTIC_J:
      case OCPIConnectorType.DOMESTIC_K:
      case OCPIConnectorType.DOMESTIC_L:
        return ConnectorType.DOMESTIC;
      default:
        return ConnectorType.UNKNOWN;
    }
  }

  public static convertOCPIStatus2Status(status: OCPIEvseStatus): ChargePointStatus {
    switch (status) {
      case OCPIEvseStatus.AVAILABLE:
        return ChargePointStatus.AVAILABLE;
      case OCPIEvseStatus.BLOCKED:
        return ChargePointStatus.OCCUPIED;
      case OCPIEvseStatus.CHARGING:
        return ChargePointStatus.CHARGING;
      case OCPIEvseStatus.INOPERATIVE:
      case OCPIEvseStatus.OUTOFORDER:
        return ChargePointStatus.FAULTED;
      case OCPIEvseStatus.PLANNED:
      case OCPIEvseStatus.RESERVED:
        return ChargePointStatus.RESERVED;
      default:
        return ChargePointStatus.UNAVAILABLE;
    }
  }

  public static convertStatus2OCPIStatus(status: ChargePointStatus): OCPIEvseStatus {
    switch (status) {
      case ChargePointStatus.AVAILABLE:
        return OCPIEvseStatus.AVAILABLE;
      case ChargePointStatus.OCCUPIED:
        return OCPIEvseStatus.BLOCKED;
      case ChargePointStatus.CHARGING:
        return OCPIEvseStatus.CHARGING;
      case ChargePointStatus.FAULTED:
      case ChargePointStatus.UNAVAILABLE:
        return OCPIEvseStatus.INOPERATIVE;
      case ChargePointStatus.PREPARING:
      case ChargePointStatus.SUSPENDED_EV:
      case ChargePointStatus.SUSPENDED_EVSE:
      case ChargePointStatus.FINISHING:
        return OCPIEvseStatus.BLOCKED;
      case ChargePointStatus.RESERVED:
        return OCPIEvseStatus.RESERVED;
      default:
        return OCPIEvseStatus.UNKNOWN;
    }
  }

  public static convertSimplePricingSetting2OCPITariff(simplePricingSetting: SimplePricingSetting): OCPITariff {
    const tariff = {} as OCPITariff;
    tariff.id = '1';
    tariff.currency = simplePricingSetting.currency;
    tariff.elements[0].price_components[0].type = OCPITariffDimensionType.TIME;
    tariff.elements[0].price_components[0].price = simplePricingSetting.price;
    tariff.elements[0].price_components[0].step_size = 60;
    tariff.last_updated = simplePricingSetting.last_updated;
    return tariff;
  }

  public static async processEMSPLocationSite(tenant: Tenant, location: OCPILocation, company: Company, site: Site, siteName?: string): Promise<Site> {
    // Create Site
    if (!site) {
      site = {
        name: siteName,
        createdOn: new Date(),
        companyID: company.id,
        issuer: false,
        address: {
          address1: location.address,
          postalCode: location.postal_code,
          city: location.city,
          country: location.country,
          coordinates: []
        }
      } as Site;
    } else {
      site = {
        ...site,
        lastChangedOn: new Date(),
        ocpiData: { location },
        address: {
          address1: location.address,
          postalCode: location.postal_code,
          city: location.city,
          country: location.country,
          coordinates: []
        }
      } as Site;
    }
    if (location.coordinates?.latitude && location.coordinates?.longitude) {
      site.address.coordinates = [
        Utils.convertToFloat(location.coordinates.longitude),
        Utils.convertToFloat(location.coordinates.latitude)
      ];
    }
    // Save Site
    site.id = await SiteStorage.saveSite(tenant, site);
    return site;
  }

  public static async processEMSPLocationSiteArea(tenant: Tenant, location: OCPILocation, site: Site, siteArea: SiteArea): Promise<SiteArea> {
    // Create Site Area
    if (!siteArea) {
      const siteAreaName = `${site.name}${Constants.OCPI_SEPARATOR}${location.id}`;
      siteArea = {
        name: siteAreaName,
        createdOn: new Date(),
        siteID: site.id,
        issuer: false,
        ocpiData: { location },
        address: {
          address1: location.address,
          address2: location.name,
          postalCode: location.postal_code,
          city: location.city,
          country: location.country,
          coordinates: []
        }
      } as SiteArea;
    } else {
      siteArea = {
        ...siteArea,
        lastChangedOn: new Date(),
        siteID: site.id,
        ocpiData: { location },
        address: {
          address1: location.address,
          address2: location.name,
          postalCode: location.postal_code,
          city: location.city,
          country: location.country,
          coordinates: []
        }
      } as SiteArea;
    }
    if (location.coordinates?.latitude && location.coordinates?.longitude) {
      siteArea.address.coordinates = [
        Utils.convertToFloat(location.coordinates.longitude),
        Utils.convertToFloat(location.coordinates.latitude)
      ];
    }
    // Save Site Area
    siteArea.id = await SiteAreaStorage.saveSiteArea(tenant, siteArea);
    await SiteAreaStorage.saveSiteAreaOcpiData(tenant, siteArea.id, siteArea.ocpiData);
    return siteArea;
  }
}
