import { Action, Entity } from '../../../../types/Authorization';
import { CryptoSettings, CryptoSettingsType, SettingDB, TechnicalSettings, UserSettings, UserSettingsType } from '../../../../types/Setting';
import { HTTPAuthError, HTTPError } from '../../../../types/HTTPError';
import { NextFunction, Request, Response } from 'express';
import Tenant, { TenantComponents, TenantLogo } from '../../../../types/Tenant';
import User, { UserRole } from '../../../../types/User';

import AppAuthError from '../../../../exception/AppAuthError';
import AppError from '../../../../exception/AppError';
import Authorizations from '../../../../authorization/Authorizations';
import Constants from '../../../../utils/Constants';
import { LockEntity } from '../../../../types/Locking';
import LockingManager from '../../../../locking/LockingManager';
import Logging from '../../../../utils/Logging';
import NotificationHandler from '../../../../notification/NotificationHandler';
import OCPIEndpointStorage from '../../../../storage/mongodb/OCPIEndpointStorage';
import OICPEndpointStorage from '../../../../storage/mongodb/OICPEndpointStorage';
import { OICPRole } from '../../../../types/oicp/OICPRole';
import OICPUtils from '../../../oicp/OICPUtils';
import { ServerAction } from '../../../../types/Server';
import SettingStorage from '../../../../storage/mongodb/SettingStorage';
import SiteAreaStorage from '../../../../storage/mongodb/SiteAreaStorage';
import { StatusCodes } from 'http-status-codes';
import TenantStorage from '../../../../storage/mongodb/TenantStorage';
import TenantValidator from '../validator/TenantValidator';
import UserStorage from '../../../../storage/mongodb/UserStorage';
import Utils from '../../../../utils/Utils';
import UtilsService from './UtilsService';

const MODULE_NAME = 'TenantService';

export default class TenantService {

  public static async handleDeleteTenant(action: ServerAction, req: Request, res: Response, next: NextFunction): Promise<void> {
    // Validate
    const filteredRequest = TenantValidator.getInstance().validateTenantGetReq(req.query);
    UtilsService.assertIdIsProvided(action, filteredRequest.ID, MODULE_NAME, 'handleDeleteTenant', req.user);
    // Check auth
    if (!await Authorizations.canDeleteTenant(req.user)) {
      throw new AppAuthError({
        errorCode: HTTPAuthError.FORBIDDEN,
        user: req.user,
        action: Action.DELETE, entity: Entity.TENANT,
        module: MODULE_NAME, method: 'handleDeleteTenant',
        value: filteredRequest.ID
      });
    }
    // Get
    const tenant = await TenantStorage.getTenant(filteredRequest.ID);
    UtilsService.assertObjectExists(action, tenant, `Tenant ID '${filteredRequest.ID}' does not exist`,
      MODULE_NAME, 'handleDeleteTenant', req.user);
    // Check if current tenant
    if (tenant.id === req.user.tenantID) {
      throw new AppError({
        errorCode: HTTPError.OBJECT_DOES_NOT_EXIST_ERROR,
        message: `Your own tenant with id '${tenant.id}' cannot be deleted`,
        module: MODULE_NAME, method: 'handleDeleteTenant',
        user: req.user,
        action: action
      });
    }
    // Delete
    await TenantStorage.deleteTenant(tenant.id);
    // Remove collection
    await TenantStorage.deleteTenantDB(tenant.id);
    // Log
    await Logging.logInfo({
      tenantID: req.user.tenantID, user: req.user,
      module: MODULE_NAME, method: 'handleDeleteTenant',
      message: `Tenant '${tenant.name}' has been deleted successfully`,
      action: action,
      detailedMessages: { tenant }
    });
    res.json(Constants.REST_RESPONSE_SUCCESS);
    next();
  }

  public static async handleGetTenantLogo(action: ServerAction, req: Request, res: Response, next: NextFunction): Promise<void> {
    // Validate
    const filteredRequest = TenantValidator.getInstance().validateLogoGetReq(req.query);
    // Get Logo
    let tenantLogo: TenantLogo;
    // Get the logo using ID
    if (filteredRequest.ID) {
      const tenant = await TenantStorage.getTenant(filteredRequest.ID);
      if (tenant) {
        tenantLogo = await TenantStorage.getTenantLogo(tenant);
      }
    // Get the logo using Subdomain
    } else if (filteredRequest.Subdomain) {
      const tenant = await TenantStorage.getTenantBySubdomain(filteredRequest.Subdomain, ['id']);
      if (tenant) {
        tenantLogo = await TenantStorage.getTenantLogo(tenant);
      }
    }
    if (tenantLogo?.logo) {
      let header = 'image';
      let encoding: BufferEncoding = 'base64';
      // Remove encoding header
      if (tenantLogo.logo.startsWith('data:image/')) {
        header = tenantLogo.logo.substring(5, tenantLogo.logo.indexOf(';'));
        encoding = tenantLogo.logo.substring(tenantLogo.logo.indexOf(';') + 1, tenantLogo.logo.indexOf(',')) as BufferEncoding;
        tenantLogo.logo = tenantLogo.logo.substring(tenantLogo.logo.indexOf(',') + 1);
      }
      res.setHeader('content-type', header);
      res.send(tenantLogo.logo ? Buffer.from(tenantLogo.logo, encoding) : null);
    } else {
      res.send(null);
    }
    next();
  }

  public static async handleGetTenant(action: ServerAction, req: Request, res: Response, next: NextFunction): Promise<void> {
    // Validate
    const filteredRequest = TenantValidator.getInstance().validateTenantGetReq(req.query);
    UtilsService.assertIdIsProvided(action, filteredRequest.ID, MODULE_NAME, 'handleGetTenant', req.user);
    // Check auth
    if (!await Authorizations.canReadTenant(req.user)) {
      throw new AppAuthError({
        errorCode: HTTPAuthError.FORBIDDEN,
        user: req.user,
        action: Action.READ, entity: Entity.TENANT,
        module: MODULE_NAME, method: 'handleGetTenant',
        value: filteredRequest.ID
      });
    }
    let projectFields = [
      'id', 'name', 'email', 'subdomain', 'components', 'address', 'logo'
    ];
    // Check projection
    const httpProjectFields = UtilsService.httpFilterProjectToArray(filteredRequest.ProjectFields);
    if (!Utils.isEmptyArray(httpProjectFields)) {
      projectFields = projectFields.filter((projectField) => httpProjectFields.includes(projectField));
    }
    // Get it
    const tenant = await TenantStorage.getTenant(filteredRequest.ID,
      { withLogo: true },
      projectFields
    );
    UtilsService.assertObjectExists(action, tenant, `Tenant ID '${filteredRequest.ID}' does not exist`,
      MODULE_NAME, 'handleGetTenant', req.user);
    res.json(tenant);
    next();
  }

  public static async handleGetTenants(action: ServerAction, req: Request, res: Response, next: NextFunction): Promise<void> {
    // Validate
    const filteredRequest = TenantValidator.getInstance().validateTenantsGetReq(req.query);
    // Check auth
    if (!await Authorizations.canListTenants(req.user)) {
      throw new AppAuthError({
        errorCode: HTTPAuthError.FORBIDDEN,
        user: req.user,
        action: Action.LIST, entity: Entity.TENANT,
        module: MODULE_NAME, method: 'handleGetTenants'
      });
    }
    // Filter
    let projectFields = [
      'id', 'name', 'email', 'subdomain', 'logo', 'createdOn', 'createdBy', 'lastChangedOn', 'lastChangedBy'
    ];
    if (filteredRequest.WithComponents) {
      projectFields.push('components');
    }
    // Check projection
    const httpProjectFields = UtilsService.httpFilterProjectToArray(filteredRequest.ProjectFields);
    if (!Utils.isEmptyArray(httpProjectFields)) {
      projectFields = projectFields.filter((projectField) => httpProjectFields.includes(projectField));
    }
    // Get the tenants
    const tenants = await TenantStorage.getTenants(
      {
        search: filteredRequest.Search,
        withLogo: filteredRequest.WithLogo,
      },
      { limit: filteredRequest.Limit, skip: filteredRequest.Skip, sort: UtilsService.httpSortFieldsToMongoDB(filteredRequest.SortFields) },
      projectFields);
    res.json(tenants);
    next();
  }

  public static async createInitialSettingsForTenant(tenant: Tenant): Promise<void> {
    await this.createInitialCryptoSettings(tenant);
    await this.createInitialUserSettings(tenant);
  }

  public static async createInitialCryptoSettings(tenant: Tenant): Promise<void> {
    // Check for settings in db
    const keySettings = await SettingStorage.getCryptoSettings(tenant);
    // Create Crypto Key Settings
    if (!keySettings) {
      const keySettingToSave: CryptoSettings = {
        identifier: TechnicalSettings.CRYPTO,
        type: CryptoSettingsType.CRYPTO,
        crypto: {
          key: Utils.generateRandomKey(Utils.getDefaultKeyProperties()),
          keyProperties: Utils.getDefaultKeyProperties()
        }
      } as CryptoSettings;
      // Save Crypto Key Settings
      await SettingStorage.saveCryptoSettings(tenant, keySettingToSave);
    }
  }

  public static async createInitialUserSettings(tenant: Tenant): Promise<void> {
    // Check for settings in db
    const userSettings = await SettingStorage.getUserSettings(tenant);
    // Create new user settings
    if (!userSettings) {
      const settingsToSave: UserSettings = {
        identifier: TechnicalSettings.USER,
        type: UserSettingsType.USER,
        user: {
          autoActivateAccountAfterValidation: true
        },
        createdOn: new Date(),
      };
      await SettingStorage.saveUserSettings(tenant, settingsToSave);
    }
  }

  public static async handleCreateTenant(action: ServerAction, req: Request, res: Response, next: NextFunction): Promise<void> {
    // Validate
    const filteredRequest = TenantValidator.getInstance().validateTenantCreateReq(req.body);
    // Check auth
    if (!await Authorizations.canCreateTenant(req.user)) {
      throw new AppAuthError({
        errorCode: HTTPAuthError.FORBIDDEN,
        user: req.user,
        action: Action.CREATE, entity: Entity.TENANT,
        module: MODULE_NAME, method: 'handleCreateTenant'
      });
    }
    // Check Tenant
    UtilsService.checkIfTenantValid(filteredRequest, req);
    // Get the Tenant with ID (subdomain)
    const foundTenant = await TenantStorage.getTenantBySubdomain(filteredRequest.subdomain);
    if (foundTenant) {
      throw new AppError({
        errorCode: HTTPError.TENANT_ALREADY_EXIST,
        message: `The tenant with subdomain '${filteredRequest.subdomain}' already exists`,
        module: MODULE_NAME, method: 'handleCreateTenant',
        user: req.user,
        action: action
      });
    }
    // Update timestamp
    filteredRequest.createdBy = { 'id': req.user.id };
    filteredRequest.createdOn = new Date();
    // Save
    filteredRequest.id = await TenantStorage.saveTenant(filteredRequest);
    // OICP
    await TenantService.checkOICPStatus(filteredRequest);
    // Update with components
    await TenantService.updateSettingsWithComponents(filteredRequest, req);
    // Create DB collections
    // Database creation Lock
    const createDatabaseLock = LockingManager.createExclusiveLock(filteredRequest.id, LockEntity.DATABASE, 'create-database');
    if (await LockingManager.acquire(createDatabaseLock)) {
      try {
        await TenantStorage.createTenantDB(filteredRequest.id);
        // Create initial settings for tenant
        await TenantService.createInitialSettingsForTenant(filteredRequest);
      } finally {
        // Release the database creation Lock
        await LockingManager.release(createDatabaseLock);
      }
    }
    // Create Admin user in tenant
    const tenantUser: User = UserStorage.createNewUser() as User;
    tenantUser.name = filteredRequest.name;
    tenantUser.firstName = 'Admin';
    tenantUser.email = filteredRequest.email;
    // Get Tenant
    const tenant = await TenantStorage.getTenant(filteredRequest.id);
    // Save User
    tenantUser.id = await UserStorage.saveUser(tenant, tenantUser);
    // Save User Role
    await UserStorage.saveUserRole(tenant, tenantUser.id, UserRole.ADMIN);
    // Save User Status
    await UserStorage.saveUserStatus(tenant, tenantUser.id, tenantUser.status);
    // Save User Account Verification
    const verificationToken = Utils.generateToken(filteredRequest.email);
    await UserStorage.saveUserAccountVerification(tenant, tenantUser.id, { verificationToken });
    const resetHash = Utils.generateUUID();
    // Init Password info
    await UserStorage.saveUserPassword(tenant, tenantUser.id, { passwordResetHash: resetHash });
    // Send activation link
    const evseDashboardVerifyEmailURL = Utils.buildEvseURL(filteredRequest.subdomain) +
      '/verify-email?VerificationToken=' + verificationToken + '&Email=' +
      tenantUser.email + '&ResetToken=' + resetHash;
    // Notify
    void NotificationHandler.sendNewRegisteredUser(
      tenant,
      Utils.generateUUID(),
      tenantUser,
      {
        'tenant': filteredRequest.name,
        'user': tenantUser,
        'evseDashboardURL': Utils.buildEvseURL(filteredRequest.subdomain),
        'evseDashboardVerifyEmailURL': evseDashboardVerifyEmailURL
      }
    );
    // Log
    await Logging.logInfo({
      tenantID: req.user.tenantID, user: req.user,
      module: MODULE_NAME, method: 'handleCreateTenant',
      message: `Tenant '${filteredRequest.name}' has been created successfully`,
      action: action,
      detailedMessages: { params: filteredRequest }
    });
    res.status(StatusCodes.OK).json(Object.assign({ id: filteredRequest.id }, Constants.REST_RESPONSE_SUCCESS));
    next();
  }

  public static async handleUpdateTenant(action: ServerAction, req: Request, res: Response, next: NextFunction): Promise<void> {
    const filteredRequest = TenantValidator.getInstance().validateTenantUpdateReq(req.body);
    // Check auth
    if (!await Authorizations.canUpdateTenant(req.user)) {
      throw new AppAuthError({
        errorCode: HTTPAuthError.FORBIDDEN,
        user: req.user,
        action: Action.UPDATE, entity: Entity.TENANT,
        module: MODULE_NAME, method: 'handleUpdateTenant',
        value: filteredRequest.id
      });
    }
    // Check Tenant
    UtilsService.checkIfTenantValid(filteredRequest, req);
    // Get
    const tenant = await TenantStorage.getTenant(filteredRequest.id);
    UtilsService.assertObjectExists(action, tenant, `Tenant ID '${filteredRequest.id}' does not exist`,
      MODULE_NAME, 'handleUpdateTenant', req.user);
    // Check subdomain
    const foundTenant = await TenantStorage.getTenantBySubdomain(filteredRequest.subdomain);
    if (filteredRequest.subdomain !== tenant.subdomain && foundTenant) {
      throw new AppError({
        errorCode: HTTPError.TENANT_ALREADY_EXIST,
        message: `The tenant with subdomain '${filteredRequest.subdomain}' already exists`,
        module: MODULE_NAME, method: 'handleCreateTenant',
        user: req.user,
        action: action
      });
    }
    // Check if smart charging is deactivated in all site areas when deactivated in super tenant
    if (filteredRequest.components && filteredRequest.components.smartCharging &&
        tenant.components && tenant.components.smartCharging &&
        !filteredRequest.components.smartCharging.active && tenant.components.smartCharging.active) {
      const siteAreas = await SiteAreaStorage.getSiteAreas(tenant, { smartCharging: true }, Constants.DB_PARAMS_MAX_LIMIT);
      if (siteAreas.count !== 0) {
        throw new AppError({
          errorCode: HTTPError.SMART_CHARGING_STILL_ACTIVE_FOR_SITE_AREA,
          message: 'Site Area(s) is/are still enabled for Smart Charging. Please deactivate it/them to disable Smart Charging in Tenant',
          module: MODULE_NAME,
          method: 'handleUpdateSetting',
          user: req.user,
          detailedMessages: { siteAreas: siteAreas.result.map((siteArea) => `${siteArea.name} (${siteArea.id})`) },
        });
      }
    }
    tenant.name = filteredRequest.name;
    tenant.address = filteredRequest.address;
    tenant.components = filteredRequest.components;
    tenant.email = filteredRequest.email;
    tenant.subdomain = filteredRequest.subdomain;
    if (Utils.objectHasProperty(filteredRequest, 'logo')) {
      tenant.logo = filteredRequest.logo;
    }
    // Update timestamp
    tenant.lastChangedBy = { 'id': req.user.id };
    tenant.lastChangedOn = new Date();
    // Update Tenant
    await TenantStorage.saveTenant(tenant, Utils.objectHasProperty(filteredRequest, 'logo') ? true : false);
    // OICP
    await TenantService.checkOICPStatus(tenant);
    // Update with components
    await TenantService.updateSettingsWithComponents(filteredRequest, req);
    // Log
    await Logging.logInfo({
      tenantID: req.user.tenantID, user: req.user,
      module: MODULE_NAME, method: 'handleUpdateTenant',
      message: `Tenant '${filteredRequest.name}' has been updated successfully`,
      action: action,
      detailedMessages: { tenant }
    });
    res.json(Constants.REST_RESPONSE_SUCCESS);
    next();
  }

  private static async updateSettingsWithComponents(tenant: Tenant, req: Request): Promise<void> {
    // Create settings
    for (const componentName in tenant.components) {
      // Get the settings
      const currentSetting = await SettingStorage.getSettingByIdentifier(tenant, componentName);
      // Check if Component is active
      if (!tenant.components[componentName] || !tenant.components[componentName].active) {
        // Delete settings
        if (currentSetting) {
          await SettingStorage.deleteSetting(tenant, currentSetting.id);
          // Delete deps
          switch (componentName) {
            case TenantComponents.OCPI:
              await OCPIEndpointStorage.deleteOcpiEndpoints(tenant);
              break;
            case TenantComponents.OICP:
              await OICPEndpointStorage.deleteOicpEndpoints(tenant);
              break;
          }
        }
        continue;
      }
      // Create
      const newSettingContent = Utils.createDefaultSettingContent(
        componentName, tenant.components[componentName], currentSetting?.content);
      if (newSettingContent) {
        // Create & Save
        if (!currentSetting) {
          const newSetting = {
            identifier: componentName,
            content: newSettingContent
          } as SettingDB;
          newSetting.createdOn = new Date();
          newSetting.createdBy = { 'id': req.user.id };
          // Save Setting
          await SettingStorage.saveSettings(tenant, newSetting);
        } else {
          currentSetting.content = newSettingContent;
          currentSetting.lastChangedOn = new Date();
          currentSetting.lastChangedBy = { 'id': req.user.id };
          // Save Setting
          await SettingStorage.saveSettings(tenant, currentSetting);
        }
      }
    }
  }

  private static async checkOICPStatus(tenant: Tenant): Promise<void> {
    // OICP
    if (tenant.components && tenant.components.oicp) {
      // Virtual user needed for unknown roaming user
      const virtualOICPUser = await UserStorage.getUserByEmail(tenant, Constants.OICP_VIRTUAL_USER_EMAIL);
      // Activate or deactivate virtual user depending on the oicp component status
      if (tenant.components.oicp.active) {
        // Create OICP user
        if (!virtualOICPUser) {
          await OICPUtils.createOICPVirtualUser(tenant);
        }
      } else if (virtualOICPUser) {
        // Clean up user
        if (virtualOICPUser) {
          await UserStorage.deleteUser(tenant, virtualOICPUser.id);
        }
        // Delete Endpoints if component is inactive
        const oicpEndpoints = await OICPEndpointStorage.getOicpEndpoints(tenant, { role: OICPRole.CPO }, Constants.DB_PARAMS_MAX_LIMIT);
        for (const oicpEndpoint of oicpEndpoints.result) {
          await OICPEndpointStorage.deleteOicpEndpoint(tenant, oicpEndpoint.id);
        }
      }
    }
  }
}
