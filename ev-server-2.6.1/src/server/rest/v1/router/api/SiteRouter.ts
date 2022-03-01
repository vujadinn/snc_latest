/* eslint-disable @typescript-eslint/no-misused-promises */
import { ServerAction, ServerRoute } from '../../../../../types/Server';
import express, { NextFunction, Request, Response } from 'express';

import RouterUtils from '../RouterUtils';
import SiteService from '../../service/SiteService';
import sanitize from 'mongo-sanitize';

export default class SiteRouter {
  private router: express.Router;

  public constructor() {
    this.router = express.Router();
  }

  public buildRoutes(): express.Router {
    this.buildRouteSites();
    this.buildRouteSite();
    this.buildRouteCreateSite();
    this.buildRouteSiteAssignUsers();
    this.buildRouteSiteUnassignUsers();
    this.buildRouteSiteGetUsers();
    this.buildRouteSetSiteAdmin();
    this.buildRouteSetSiteOwner();
    this.buildRouteUpdateSite();
    this.buildRouteDeleteSite();
    return this.router;
  }

  private buildRouteSites(): void {
    this.router.get(`/${ServerRoute.REST_SITES}`, async (req: Request, res: Response, next: NextFunction) => {
      await RouterUtils.handleServerAction(SiteService.handleGetSites.bind(this), ServerAction.SITES, req, res, next);
    });
  }

  private buildRouteSite(): void {
    this.router.get(`/${ServerRoute.REST_SITE}`, async (req: Request, res: Response, next: NextFunction) => {
      req.query.ID = sanitize(req.params.id);
      await RouterUtils.handleServerAction(SiteService.handleGetSite.bind(this), ServerAction.SITE, req, res, next);
    });
  }

  private buildRouteCreateSite(): void {
    this.router.post(`/${ServerRoute.REST_SITES}`, async (req: Request, res: Response, next: NextFunction) => {
      await RouterUtils.handleServerAction(SiteService.handleCreateSite.bind(this), ServerAction.SITE_CREATE, req, res, next);
    });
  }

  private buildRouteSiteAssignUsers(): void {
    this.router.put(`/${ServerRoute.REST_SITE_ADD_USERS}`, async (req: Request, res: Response, next: NextFunction) => {
      req.body.siteID = req.params.id;
      await RouterUtils.handleServerAction(SiteService.handleAssignUsersToSite.bind(this), ServerAction.ADD_USERS_TO_SITE, req, res, next);
    });
  }

  private buildRouteSiteUnassignUsers(): void {
    this.router.put(`/${ServerRoute.REST_SITE_REMOVE_USERS}`, async (req: Request, res: Response, next: NextFunction) => {
      req.body.siteID = req.params.id;
      await RouterUtils.handleServerAction(SiteService.handleAssignUsersToSite.bind(this), ServerAction.REMOVE_USERS_FROM_SITE, req, res, next);
    });
  }

  private buildRouteSiteGetUsers(): void {
    this.router.get(`/${ServerRoute.REST_SITE_USERS}`, async (req: Request, res: Response, next: NextFunction) => {
      req.query.SiteID = req.params.id;
      await RouterUtils.handleServerAction(SiteService.handleGetUsers.bind(this), ServerAction.SITE_USERS, req, res, next);
    });
  }

  private buildRouteSetSiteAdmin(): void {
    this.router.put(`/${ServerRoute.REST_SITE_ADMIN}`, async (req: Request, res: Response, next: NextFunction) => {
      req.body.siteID = req.params.id;
      await RouterUtils.handleServerAction(SiteService.handleUpdateSiteUserAdmin.bind(this), ServerAction.SITE_USER_ADMIN, req, res, next);
    });
  }

  private buildRouteSetSiteOwner(): void {
    this.router.put(`/${ServerRoute.REST_SITE_OWNER}`, async (req: Request, res: Response, next: NextFunction) => {
      req.body.siteID = req.params.id;
      await RouterUtils.handleServerAction(SiteService.handleUpdateSiteOwner.bind(this), ServerAction.SITE_OWNER, req, res, next);
    });
  }

  private buildRouteUpdateSite(): void {
    this.router.put(`/${ServerRoute.REST_SITE}`, async (req: Request, res: Response, next: NextFunction) => {
      req.body.id = req.params.id;
      await RouterUtils.handleServerAction(SiteService.handleUpdateSite.bind(this), ServerAction.SITE_UPDATE, req, res, next);
    });
  }

  private buildRouteDeleteSite(): void {
    this.router.delete(`/${ServerRoute.REST_SITE}`, async (req: Request, res: Response, next: NextFunction) => {
      req.query.ID = req.params.id;
      await RouterUtils.handleServerAction(SiteService.handleDeleteSite.bind(this), ServerAction.SITE_DELETE, req, res, next);
    });
  }
}
