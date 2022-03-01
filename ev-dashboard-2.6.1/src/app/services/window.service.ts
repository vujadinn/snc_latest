import { Inject, Injectable } from '@angular/core';
import { parse } from 'tldts';

import { WINDOW } from '../providers/window.provider';

@Injectable()
export class WindowService {
  // eslint-disable-next-line no-useless-constructor
  public constructor(
    @Inject(WINDOW) private window: Window) {}

  public getHostname(): string {
    return this.window.location.hostname;
  }

  public getHost(): string {
    return this.window.location.host;
  }

  public getProtocol(): string {
    return this.window.location.protocol;
  }

  public getPath(): string {
    return this.window.location.pathname;
  }

  public getOrigin(): string {
    return this.window.location.origin;
  }

  public getHash(): string {
    return this.window.location.hash.includes('?') ? this.window.location.hash.substring(1, this.window.location.hash.indexOf('?')) :
      this.window.location.hash.substring(1);
  }

  public getSubdomain(): string {
    const urlParsed = parse(this.window.location.host);
    return urlParsed.publicSuffix === 'localhost' ? urlParsed.domainWithoutSuffix : urlParsed.subdomain;
  }

  public getLocalStorage(): Storage {
    return this.window.localStorage;
  }

  public rewriteHashUrl(): boolean {
    if (this.window.location.href.includes('/#/')) {
      const rewrittenUrl = this.window.location.href.replace('/#/', '/');
      this.window.location.replace(rewrittenUrl);
      return true;
    }
    return false;
  }

  public setHash(hash: string): void {
    if (this.getHash() !== hash) {
      this.window.history.replaceState({}, '', `${this.getPath()}#${hash}`);
    }
  }

  public getSearch(name: string): string {
    let search = '';
    if (window.location.search) {
      search = new URLSearchParams(window.location.search).get(name);
    } else if (window.location.hash) {
      search = new URLSearchParams(window.location.hash.slice(this.window.location.hash.indexOf('?'))).get(name);
    }
    return search;
  }

  public getSearches(name: string): string[] {
    return new URLSearchParams(window.location.search).getAll(name);
  }

  public appendSearch(name: string, value: string) {
    // Parse the query string
    const urlSearchParams = new URLSearchParams(window.location.search);
    // Add
    urlSearchParams.append(name, value);
    // Set it back
    this.setSearchQueryParams(urlSearchParams.toString());
  }

  public setSearch(name: string, value: string): void {
    // Parse the query string
    const urlSearchParams = new URLSearchParams(window.location.search);
    // Set
    urlSearchParams.set(name, value);
    // Set it back
    this.setSearchQueryParams(urlSearchParams.toString());
  }

  public deleteSearch(name: string): void {
    // Parse the query string
    const urlSearchParams = new URLSearchParams(window.location.search);
    // Delete
    urlSearchParams.delete(name);
    // Set it back
    this.setSearchQueryParams(urlSearchParams.toString());
  }

  public clearSearch() {
    this.setSearchQueryParams(null);
  }

  private setSearchQueryParams(queryParams: string | null) {
    // Set the Query params
    if (history.pushState) {
      // Without page reload
      // eslint-disable-next-line max-len
      const newURL = `${window.location.protocol}//${window.location.host}${window.location.pathname}${queryParams ? '?' + queryParams : ''}${window.location.hash}`;
      window.history.pushState({ path: newURL }, '', newURL);
    } else {
      // With page reload
      this.window.location.search = queryParams ? queryParams : '';
    }
  }
}
