import { EvseIdComponents } from '../types/oicp/OICPEvse';

export default class RoamingUtils {

  public static buildOperatorName(countryCode: string, partyId: string): string {
    return `${countryCode}*${partyId}`;
  }

  public static buildEvseID(countryCode: string, partyId: string, chargingStationID: string, connectorID: number): string {
    // Format follows the eMI3 string format for EVSE: https://emi3group.com/wp-content/uploads/sites/5/2018/12/eMI3-standard-v1.0-Part-2.pdf
    const evseID = `${RoamingUtils.buildOperatorName(countryCode, partyId)}*E${chargingStationID}*${connectorID}`;
    return evseID.replace(/[\W_]+/g, '*').toUpperCase();
  }

  public static getEvseIdComponents(evseID: string): EvseIdComponents {
    // Problem: it is not safe to derive the chargingStationId from evseID because all characters that are not alphanumeric and underscores are replaced with '*'
    // also: evseId is set to upper case
    // see function buildEvseID()
    const evseIDComponents: EvseIdComponents = {} as EvseIdComponents;
    const evseIdList = evseID.split('*');
    evseIDComponents.countryCode = evseIdList[0];
    evseIDComponents.partyId = evseIdList[1];
    evseIDComponents.connectorId = evseIdList[evseIdList.length - 1];
    return evseIDComponents;
  }
}
