/* eslint-disable @typescript-eslint/no-misused-promises */
import { ServerAction, ServerRoute } from '../../../../../types/Server';
import express, { NextFunction, Request, Response } from 'express';

import AssetService from '../../service/AssetService';
import RouterUtils from '../RouterUtils';

export default class AssetRouter {
  private router: express.Router;

  public constructor() {
    this.router = express.Router();
  }

  public buildRoutes(): express.Router {
    this.buildRouteCreateAssetConsumption();
    this.buildRouteCreateAsset();
    this.buildRouteGetAssets();
    this.buildRouteGetAsset();
    this.buildRouteGetAssetsInError();
    this.buildRouteCheckAssetConnection();
    this.buildRouteGetAssetLastConsumption();
    this.buildRouteGetAssetConsumptions();
    this.buildRouteUpdateAsset();
    this.buildRouteDeleteAsset();
    return this.router;
  }

  private buildRouteCreateAssetConsumption(): void {
    this.router.post(`/${ServerRoute.REST_ASSET_CONSUMPTIONS}`, async (req: Request, res: Response, next: NextFunction) => {
      req.query.assetID = req.params.id;
      await RouterUtils.handleServerAction(AssetService.handleCreateAssetConsumption.bind(this), ServerAction.ASSET_CONSUMPTION, req, res, next);
    });
  }

  private buildRouteCreateAsset(): void {
    this.router.post(`/${ServerRoute.REST_ASSETS}`, async (req: Request, res: Response, next: NextFunction) => {
      await RouterUtils.handleServerAction(AssetService.handleCreateAsset.bind(this), ServerAction.ASSET_CREATE, req, res, next);
    });
  }

  private buildRouteGetAssets(): void {
    this.router.get(`/${ServerRoute.REST_ASSETS}`, async (req: Request, res: Response, next: NextFunction) => {
      await RouterUtils.handleServerAction(AssetService.handleGetAssets.bind(this), ServerAction.ASSETS, req, res, next);
    });
  }

  private buildRouteGetAsset(): void {
    this.router.get(`/${ServerRoute.REST_ASSET}`, async (req: Request, res: Response, next: NextFunction) => {
      req.query.ID = req.params.id;
      await RouterUtils.handleServerAction(AssetService.handleGetAsset.bind(this), ServerAction.ASSET, req, res, next);
    });
  }

  private buildRouteGetAssetsInError(): void {
    this.router.get(`/${ServerRoute.REST_ASSETS_IN_ERROR}`, async (req: Request, res: Response, next: NextFunction) => {
      await RouterUtils.handleServerAction(AssetService.handleGetAssetsInError.bind(this), ServerAction.ASSETS_IN_ERROR, req, res, next);
    });
  }

  private buildRouteCheckAssetConnection(): void {
    this.router.get(`/${ServerRoute.REST_ASSET_CHECK_CONNECTION}`, async (req: Request, res: Response, next: NextFunction) => {
      req.query.ID = req.params.id;
      await RouterUtils.handleServerAction(AssetService.handleCheckAssetConnection.bind(this), ServerAction.CHECK_ASSET_CONNECTION, req, res, next);
    });
  }

  private buildRouteGetAssetLastConsumption(): void {
    this.router.get(`/${ServerRoute.REST_ASSET_RETRIEVE_CONSUMPTION}`, async (req: Request, res: Response, next: NextFunction) => {
      req.query.ID = req.params.id;
      await RouterUtils.handleServerAction(AssetService.handleRetrieveConsumption.bind(this), ServerAction.RETRIEVE_ASSET_CONSUMPTION, req, res, next);
    });
  }

  private buildRouteGetAssetConsumptions(): void {
    this.router.get(`/${ServerRoute.REST_ASSET_CONSUMPTIONS}`, async (req: Request, res: Response, next: NextFunction) => {
      req.query.AssetID = req.params.id;
      await RouterUtils.handleServerAction(AssetService.handleGetAssetConsumption.bind(this), ServerAction.ASSET_CONSUMPTION, req, res, next);
    });
  }

  private buildRouteUpdateAsset(): void {
    this.router.put(`/${ServerRoute.REST_ASSET}`, async (req: Request, res: Response, next: NextFunction) => {
      req.body.id = req.params.id;
      await RouterUtils.handleServerAction(AssetService.handleUpdateAsset.bind(this), ServerAction.ASSET_UPDATE, req, res, next);
    });
  }

  private buildRouteDeleteAsset(): void {
    this.router.delete(`/${ServerRoute.REST_ASSET}`, async (req: Request, res: Response, next: NextFunction) => {
      req.query.ID = req.params.id;
      await RouterUtils.handleServerAction(AssetService.handleDeleteAsset.bind(this), ServerAction.ASSET_DELETE, req, res, next);
    });
  }
}
