import { AuthorizationActions } from './Authorization';
import CreatedUpdatedProps from './CreatedUpdatedProps';

export interface CarCatalog extends CreatedUpdatedProps, AuthorizationActions {
  id: number;
  vehicleMake: string;
  vehicleModel: string;
  vehicleModelVersion?: string;
  availabilityStatus: string;
  availabilityDateFrom: Date;
  availabilityDateTo?: Date;
  priceFromDE?: number;
  priceFromDEEstimate: boolean;
  priceFromNL?: number;
  priceFromNLEstimate: boolean;
  priceFromUK?: number;
  priceGrantPICGUK: number;
  priceFromUKEstimate: boolean;
  drivetrainType: string;
  drivetrainFuel: string;
  drivetrainPropulsion: string;
  drivetrainPower?: number;
  drivetrainPowerHP?: number;
  drivetrainTorque?: number;
  performanceAcceleration: number;
  performanceTopspeed: number;
  rangeWLTP?: number;
  rangeWLTPEstimate?: boolean;
  rangeNEDC?: number;
  rangeNEDCEstimate?: boolean;
  rangeReal: number;
  rangeRealMode?: string;
  rangeRealWHwy?: number;
  rangeRealWCmb?: number;
  rangeRealWCty?: number;
  rangeRealBHwy?: number;
  rangeRealBCmb?: number;
  rangeRealBCty?: number;
  efficiencyWLTP?: number;
  efficiencyWLTPFuelEq?: number;
  efficiencyWLTPV?: number;
  efficiencyWLTPFuelEqV?: number;
  efficiencyWLTPCO2?: number;
  efficiencyNEDC?: number;
  efficiencyNEDCFuelEq?: number;
  efficiencyNEDCV?: number;
  efficiencyNEDCFuelEqV?: number;
  efficiencyNEDCCO2?: number;
  efficiencyReal: number;
  efficiencyRealFuelEqV?: number;
  efficiencyRealCO2?: number;
  efficiencyRealWHwy?: number;
  efficiencyRealWCmb?: number;
  efficiencyRealWCty?: number;
  efficiencyRealBHwy?: number;
  efficiencyRealBCmb?: number;
  efficiencyRealBCty?: number;
  chargePlug?: string;
  chargePlugEstimate?: boolean;
  chargePlugLocation?: string;
  chargeStandardPower: number;
  chargeStandardPhase: number;
  chargeStandardPhaseAmp: number;
  chargeStandardChargeTime: number;
  chargeStandardChargeSpeed: number;
  chargeStandardEstimate?: boolean;
  chargeStandardTables: CarCatalogConverter[];
  chargeAlternativePower: number;
  chargeAlternativePhase: number;
  chargeAlternativePhaseAmp: number;
  chargeAlternativeChargeTime: number;
  chargeAlternativeChargeSpeed: number;
  chargeAlternativeTables: CarCatalogConverter[];
  chargeOptionPower?: number;
  chargeOptionPhase?: number;
  chargeOptionPhaseAmp?: number;
  chargeOptionChargeTime?: number;
  chargeOptionChargeSpeed?: number;
  chargeOptionTables: CarCatalogConverter[];
  fastChargePlug?: string;
  fastChargePlugEstimate?: boolean;
  fastChargePlugLocation?: string;
  fastChargePowerMax?: number;
  fastChargePowerAvg?: number;
  fastChargeTime?: number;
  fastChargeSpeed?: number;
  fastChargeOptional?: boolean;
  fastChargeEstimate?: boolean;
  batteryCapacityUseable: number;
  batteryCapacityFull: number;
  batteryCapacityEstimate: string;
  dimsLength?: number;
  dimsWidth?: number;
  dimsHeight?: number;
  dimsWheelbase?: number;
  dimsWeight?: number;
  dimsBootspace?: number;
  dimsBootspaceMax?: number;
  dimsTowWeightUnbraked?: number;
  dimsTowWeightBraked?: number;
  dimsRoofLoadMax?: number;
  miscBody?: string;
  miscSegment?: string;
  miscSeats?: number;
  miscRoofrails?: boolean;
  miscIsofix?: boolean;
  miscIsofixSeats?: number;
  miscTurningCircle?: number;
  euroNCAPRating?: number;
  euroNCAPYear?: number;
  euroNCAPAdult?: number;
  euroNCAPChild?: number;
  euroNCAPVRU?: number;
  euroNCAPSA?: number;
  relatedVehicleIDSuccessor?: number;
  eVDBDetailURL?: string;
  imageURLs?: string[];
  images?: string[];
  image?: string;
  videos?: string[];
  hash?: string;
  imagesHash?: string;
}

export enum CarType {
  PRIVATE = 'P',
  COMPANY = 'C',
  POOL_CAR = 'PC',
}

export interface Car extends CreatedUpdatedProps, AuthorizationActions {
  id?: string;
  vin: string;
  licensePlate: string;
  carCatalogID: number;
  carCatalog?: CarCatalog;
  userID: string;
  default: boolean;
  type?: CarType;
  converter?: CarConverter;
  carConnectorData?: CarConnectorData;
}

export interface CarConverter {
  powerWatts: number;
  amperagePerPhase: number;
  numberOfPhases: number;
  type: CarConverterType;
}

export enum CarConverterType {
  STANDARD = 'S',
  OPTION = 'O',
  ALTERNATIVE = 'A',
}
export interface CarMaker {
  carMaker: string;
}

export interface CarCatalogConverter {
  type: string;
  evsePhaseVolt: number;
  evsePhaseVoltCalculated?: number;
  evsePhaseAmp: number;
  evsePhase: number;
  chargePhaseVolt: number;
  chargePhaseAmp: number;
  chargePhase: number;
  chargePower: number;
  chargeTime: number;
  chargeSpeed: number;
}

export interface CarConnectorData {
  carConnectorID?: string;
  carConnectorMeterID?: string;
}
