import { NextFunction, Request, Response } from 'express';

import AbstractOCPIService from './AbstractOCPIService';
import CPOService211 from './ocpi-services-impl/ocpi-2.1.1/CPOService';
import EMSPCPOService200 from './ocpi-services-impl/ocpi-2.0/OCPIService';
import EMSPService211 from './ocpi-services-impl/ocpi-2.1.1/EMSPService';
import OCPIServiceConfiguration from '../../types/configuration/OCPIServiceConfiguration';
import OCPIUtils from '../ocpi/OCPIUtils';

export default class OCPIServices {

  private cpoServices: AbstractOCPIService[] = [];
  private emspServices: AbstractOCPIService[] = [];

  // Create OCPI Service
  constructor(ocpiRestConfig: OCPIServiceConfiguration) {
    // Add available OCPI services
    // version 2.1.1
    this.cpoServices.push(new CPOService211(ocpiRestConfig));
    this.emspServices.push(new EMSPService211(ocpiRestConfig));
    // pragma version 2.0
    this.cpoServices.push(new EMSPCPOService200(ocpiRestConfig, CPOService211.PATH));
    this.emspServices.push(new EMSPCPOService200(ocpiRestConfig, EMSPService211.PATH));
  }

  /**
   * Get all implemented versions of OCPI
   *
   * @param req
   * @param res
   * @param next
   */
  public getCPOVersions(req: Request, res: Response, next: NextFunction): void {
    try {
      // Get all the versions
      const versions = this.cpoServices.map((ocpiService) => ({ 'version': ocpiService.getVersion(), 'url': ocpiService.getServiceUrl(req) }));
      // Send available versions
      res.json(OCPIUtils.success(versions));
    } catch (error) {
      next(error);
    }
  }

  public getEMSPVersions(req: Request, res: Response, next: NextFunction): void {
    try {
      // Get all the versions
      const versions = this.emspServices.map((ocpiService) => ({ 'version': ocpiService.getVersion(), 'url': ocpiService.getServiceUrl(req) }));
      // Send available versions
      res.json(OCPIUtils.success(versions));
    } catch (error) {
      next(error);
    }
  }

  // Return all OCPI Service Implementation
  public getOCPIServiceImplementations(): AbstractOCPIService[] {
    return this.cpoServices.concat(this.emspServices);
  }
}
