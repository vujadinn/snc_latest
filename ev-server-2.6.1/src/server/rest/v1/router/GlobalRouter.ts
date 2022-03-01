import AssetRouter from './api/AssetRouter';
import AuthRouter from './auth/AuthRouter';
import AuthService from '../service/AuthService';
import BillingRouter from './api/BillingRouter';
import CarRouter from './api/CarRouter';
import ChargingStationRouter from './api/ChargingStationRouter';
import CompanyRouter from './api/CompanyRouter';
import ConnectionRouter from './api/ConnectionRouter';
import Logging from '../../../../utils/Logging';
import LoggingRouter from './api/LoggingRouter';
import NotificationRouter from './api/NotificationRouter';
import OCPIEndpointRouter from './api/OCPIEndpointRouter';
import OICPEndpointRouter from './api/OICPEndpointRouter';
import PricingRouter from './api/PricingRouter';
import RegistrationTokenRouter from './api/RegistrationTokenRouter';
import SessionHashService from '../service/SessionHashService';
import SettingRouter from './api/SettingRouter';
import SiteAreaRouter from './api/SiteAreaRouter';
import SiteRouter from './api/SiteRouter';
import StatisticsRouter from './api/StatisticsRouter';
import SwaggerRouter from './doc/SwaggerRouter';
import TagRouter from './api/TagRouter';
import TenantRouter from './api/TenantRouter';
import TransactionRouter from './api/TransactionRouter';
import UserRouter from './api/UserRouter';
import UtilRouter from './util/UtilRouter';
import express from 'express';

export default class GlobalRouter {
  private router: express.Router;

  public constructor() {
    this.router = express.Router();
  }

  public buildRoutes(): express.Router {
    this.buildRouteAuth();
    this.buildRouteAPI();
    this.buildRouteUtil();
    this.buildRouteDocs();
    return this.router;
  }

  protected buildRouteAuth(): void {
    this.router.use('/auth', new AuthRouter().buildRoutes());
  }

  protected buildRouteAPI(): void {
    this.router.use('/api',
      AuthService.authenticate(),
      SessionHashService.checkUserAndTenantValidity.bind(this),
      Logging.traceExpressRequest.bind(this),
      [
        new AssetRouter().buildRoutes(),
        new BillingRouter().buildRoutes(),
        new CarRouter().buildRoutes(),
        new ChargingStationRouter().buildRoutes(),
        new CompanyRouter().buildRoutes(),
        new ConnectionRouter().buildRoutes(),
        new LoggingRouter().buildRoutes(),
        new NotificationRouter().buildRoutes(),
        new OCPIEndpointRouter().buildRoutes(),
        new OICPEndpointRouter().buildRoutes(),
        new PricingRouter().buildRoutes(),
        new RegistrationTokenRouter().buildRoutes(),
        new SiteAreaRouter().buildRoutes(),
        new SettingRouter().buildRoutes(),
        new SiteRouter().buildRoutes(),
        new StatisticsRouter().buildRoutes(),
        new TagRouter().buildRoutes(),
        new TenantRouter().buildRoutes(),
        new TransactionRouter().buildRoutes(),
        new UserRouter().buildRoutes(),
      ]);
  }

  protected buildRouteUtil(): void {
    this.router.use('/util', new UtilRouter().buildRoutes());
  }

  protected buildRouteDocs(): void {
    this.router.use('/docs', new SwaggerRouter().buildRoutes());
  }
}
