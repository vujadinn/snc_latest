import { Action, Entity } from '../../../../types/Authorization';
import { NextFunction, Request, Response } from 'express';
import PricingDefinition, { PricingEntity } from '../../../../types/Pricing';

import AppAuthError from '../../../../exception/AppAuthError';
import AuthorizationService from './AuthorizationService';
import ChargingStation from '../../../../types/ChargingStation';
import Constants from '../../../../utils/Constants';
import { HTTPAuthError } from '../../../../types/HTTPError';
import Logging from '../../../../utils/Logging';
import { PricingDefinitionDataResult } from '../../../../types/DataResult';
import PricingStorage from '../../../../storage/mongodb/PricingStorage';
import PricingValidator from '../validator/PricingValidator';
import { ServerAction } from '../../../../types/Server';
import Site from '../../../../types/Site';
import SiteArea from '../../../../types/SiteArea';
import { TenantComponents } from '../../../../types/Tenant';
import UtilsService from './UtilsService';

const MODULE_NAME = 'PricingService';

export default class PricingService {

  public static async handleGetPricingDefinition(action: ServerAction, req: Request, res: Response, next: NextFunction): Promise<void> {
    // Check if component is active
    UtilsService.assertComponentIsActiveFromToken(req.user, TenantComponents.PRICING,
      Action.READ, Entity.PRICING_DEFINITION, MODULE_NAME, 'handleGetPricingDefinition');
    // Filter
    const filteredRequest = PricingValidator.getInstance().validatePricingDefinitionGet(req.query);
    UtilsService.assertIdIsProvided(action, filteredRequest.ID, MODULE_NAME, 'handleGetPricingDefinition', req.user);
    // Check and get pricing
    const pricingDefinition = await UtilsService.checkAndGetPricingDefinitionAuthorization(
      req.tenant, req.user, filteredRequest.ID, Action.READ, action, null, { withEntityInformation: filteredRequest.WithEntityInformation }, true);
    res.json(pricingDefinition);
    next();
  }

  public static async handleGetPricingDefinitions(action: ServerAction, req: Request, res: Response, next: NextFunction): Promise<void> {
    // Check if component is active
    UtilsService.assertComponentIsActiveFromToken(req.user, TenantComponents.PRICING,
      Action.LIST, Entity.PRICING_DEFINITION, MODULE_NAME, 'handleGetPricingDefinitions');
    // Filter
    const filteredRequest = PricingValidator.getInstance().validatePricingDefinitionsGet(req.query);
    // Check dynamic auth
    const authorizationPricingDefinitionsFilter = await AuthorizationService.checkAndGetPricingDefinitionsAuthorizations(
      req.tenant, req.user, filteredRequest);
    if (!authorizationPricingDefinitionsFilter.authorized) {
      UtilsService.sendEmptyDataResult(res, next);
      return;
    }
    // Get the pricing definitions
    const pricingDefinitions = await PricingStorage.getPricingDefinitions(req.tenant,
      {
        entityID: filteredRequest.EntityID || null,
        entityType: filteredRequest.EntityType || null,
        withEntityInformation: filteredRequest?.WithEntityInformation,
        ...authorizationPricingDefinitionsFilter.filters
      }, {
        limit: filteredRequest.Limit,
        skip: filteredRequest.Skip,
        sort: UtilsService.httpSortFieldsToMongoDB(filteredRequest.SortFields),
        onlyRecordCount: filteredRequest.OnlyRecordCount
      },
      authorizationPricingDefinitionsFilter.projectFields
    ) as PricingDefinitionDataResult;
    // Assign projected fields
    if (authorizationPricingDefinitionsFilter.projectFields) {
      pricingDefinitions.projectFields = authorizationPricingDefinitionsFilter.projectFields;
    }
    // Add Auth flags
    await AuthorizationService.addPricingDefinitionsAuthorizations(req.tenant, req.user, pricingDefinitions, authorizationPricingDefinitionsFilter);
    // Alter the canCreate flag according to the pricing definition context
    pricingDefinitions.canCreate = await PricingService.alterCanCreate(req, action, filteredRequest.EntityType, filteredRequest.EntityID, pricingDefinitions.canCreate);
    res.json(pricingDefinitions);
    next();
  }

  public static async handleCreatePricingDefinition(action: ServerAction, req: Request, res: Response, next: NextFunction): Promise<void> {
    // Check if component is active
    UtilsService.assertComponentIsActiveFromToken(req.user, TenantComponents.PRICING,
      Action.CREATE, Entity.PRICING_DEFINITION, MODULE_NAME, 'handleCreatePricingDefinition');
    // Filter
    const filteredRequest = PricingValidator.getInstance().validatePricingDefinitionCreate(req.body);
    UtilsService.checkIfPricingDefinitionValid(filteredRequest, req);
    // Get dynamic auth
    const authorizationFilter = await AuthorizationService.checkAndGetPricingDefinitionAuthorizations(
      req.tenant, req.user, {}, Action.CREATE, filteredRequest);
    if (!authorizationFilter.authorized) {
      throw new AppAuthError({
        errorCode: HTTPAuthError.FORBIDDEN,
        user: req.user,
        action: Action.CREATE, entity: Entity.PRICING_DEFINITION,
        module: MODULE_NAME, method: 'handleCreatePricingDefinition'
      });
    }
    // Check authorization and get the site ID depending on the entity type
    const siteID = await PricingService.checkAuthorizationAndGetSiteID(req, action, filteredRequest.entityType, filteredRequest.entityID);
    // Check that the pricing definitions can be changed for that site
    if (siteID) {
      await UtilsService.checkAndGetSiteAuthorization(req.tenant, req.user, siteID, Action.MAINTAIN_PRICING_DEFINITIONS, action);
    }
    // Create pricing
    const newPricingDefinition: PricingDefinition = {
      ...filteredRequest,
      siteID,
      issuer: true,
      createdBy: { id: req.user.id },
      createdOn: new Date()
    } as PricingDefinition;
    // Save
    newPricingDefinition.id = await PricingStorage.savePricingDefinition(req.tenant, newPricingDefinition);
    // Log
    await Logging.logInfo({
      tenantID: req.user.tenantID,
      user: req.user, module: MODULE_NAME, method: 'handleCreatePricingDefinition',
      message: `Pricing model '${newPricingDefinition.id}' has been created successfully`,
      action: action,
      detailedMessages: { pricingDefinition: newPricingDefinition }
    });
    res.json(Object.assign({ id: newPricingDefinition.id }, Constants.REST_RESPONSE_SUCCESS));
    next();
  }

  public static async handleUpdatePricingDefinition(action: ServerAction, req: Request, res: Response, next: NextFunction): Promise<void> {
    // Check if component is active
    UtilsService.assertComponentIsActiveFromToken(req.user, TenantComponents.PRICING,
      Action.UPDATE, Entity.PRICING_DEFINITION, MODULE_NAME, 'handleUpdatePricingDefinition');
    // Filter
    const filteredRequest = PricingValidator.getInstance().validatePricingDefinitionUpdate(req.body);
    // Check Mandatory fields
    UtilsService.checkIfPricingDefinitionValid(filteredRequest, req);
    // Check and Get Pricing
    let pricingDefinition = await UtilsService.checkAndGetPricingDefinitionAuthorization(
      req.tenant, req.user, filteredRequest.id, Action.UPDATE, action, filteredRequest);
    // Update timestamp
    const lastChangedBy = { id: req.user.id };
    const lastChangedOn = new Date();
    // Check authorization and get the site ID depending on the entity type
    const siteID = await PricingService.checkAuthorizationAndGetSiteID(req, action, filteredRequest.entityType, filteredRequest.entityID);
    // Check that the pricing definitions can be changed for that site
    if (siteID) {
      await UtilsService.checkAndGetSiteAuthorization(req.tenant, req.user, siteID, Action.MAINTAIN_PRICING_DEFINITIONS, action);
    }
    // Update
    pricingDefinition = {
      ...pricingDefinition,
      ...filteredRequest,
      lastChangedBy,
      lastChangedOn,
      siteID
    };
    // Update Pricing
    await PricingStorage.savePricingDefinition(req.tenant, pricingDefinition);
    // Log
    await Logging.logInfo({
      tenantID: req.user.tenantID,
      user: req.user, module: MODULE_NAME, method: 'handleUpdatePricingDefinition',
      message: `Pricing model '${pricingDefinition.id}' has been updated successfully`,
      action: action,
      detailedMessages: { pricingDefinition }
    });
    res.json(Constants.REST_RESPONSE_SUCCESS);
    next();
  }

  public static async handleDeletePricingDefinition(action: ServerAction, req: Request, res: Response, next: NextFunction): Promise<void> {
    // Check if component is active
    UtilsService.assertComponentIsActiveFromToken(req.user, TenantComponents.PRICING,
      Action.DELETE, Entity.PRICING_DEFINITION, MODULE_NAME, 'handleDeletePricingDefinition');
    // Filter
    const pricingDefinitionID = PricingValidator.getInstance().validatePricingDefinitionGet(req.query).ID.toString();
    // Check and Get Pricing
    const pricingDefinition = await UtilsService.checkAndGetPricingDefinitionAuthorization(
      req.tenant, req.user, pricingDefinitionID, Action.DELETE, action);
    // Check authorization and get the site ID depending on the entity type
    const siteID = await PricingService.checkAuthorizationAndGetSiteID(req, action, pricingDefinition.entityType, pricingDefinition.entityID);
    // Check that the pricing definitions can be changed for that site
    if (siteID) {
      await UtilsService.checkAndGetSiteAuthorization(req.tenant, req.user, siteID, Action.MAINTAIN_PRICING_DEFINITIONS, action);
    }
    // Delete
    await PricingStorage.deletePricingDefinition(req.tenant, pricingDefinition.id);
    // Log
    await Logging.logInfo({
      tenantID: req.user.tenantID,
      user: req.user, module: MODULE_NAME, method: 'handleDeletePricingDefinition',
      message: `Pricing model '${pricingDefinitionID}' has been deleted successfully`,
      action: action,
      detailedMessages: { pricingDefinition }
    });
    res.json(Constants.REST_RESPONSE_SUCCESS);
    next();
  }

  private static async checkAuthorizationAndGetSiteID(req: Request, action: ServerAction, entityType: PricingEntity, entityID: string): Promise<string> {
    let siteID: string;
    let site: Site, siteArea: SiteArea, chargingStation: ChargingStation;
    switch (entityType) {
      case PricingEntity.COMPANY:
        await UtilsService.checkAndGetCompanyAuthorization(req.tenant, req.user, entityID, Action.READ, action);
        siteID = null;
        break;
      case PricingEntity.SITE:
        site = await UtilsService.checkAndGetSiteAuthorization(req.tenant, req.user, entityID, Action.READ, action);
        siteID = site.id;
        break;
      case PricingEntity.SITE_AREA:
        siteArea = await UtilsService.checkAndGetSiteAreaAuthorization(req.tenant, req.user, entityID, Action.READ, action);
        siteID = siteArea.siteID;
        break;
      case PricingEntity.CHARGING_STATION:
        chargingStation = await UtilsService.checkAndGetChargingStationAuthorization(req.tenant, req.user, entityID, action);
        siteID = chargingStation.siteID;
        break;
      default:
        siteID = null;
    }
    return siteID;
  }

  private static async alterCanCreate(req: Request, action: ServerAction, entityType: PricingEntity, entityID: string, canCreate: boolean): Promise<boolean> {
    if (canCreate) {
      try {
        // Get the site ID for the current entity
        const siteID = await PricingService.checkAuthorizationAndGetSiteID(req, action, entityType, entityID);
        if (siteID) {
          await UtilsService.checkAndGetSiteAuthorization(req.tenant, req.user, siteID, Action.MAINTAIN_PRICING_DEFINITIONS, action);
        }
      } catch (error) {
        canCreate = false;
        if (!(error instanceof AppAuthError)) {
          await Logging.logError({
            tenantID: req.user.tenantID,
            user: req.user, module: MODULE_NAME, method: 'alterCanCreate',
            message: 'Unexpected error while checking site access permissions',
            action: action,
            detailedMessages: { error: error.stack }
          });
        }
      }
    }
    return canCreate;
  }
}

