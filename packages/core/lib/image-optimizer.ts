import { IncomingMessage, ServerResponse } from 'http';

import { ImageConfig } from 'next/dist/server/image-config';
import {
  imageOptimizer as nextImageOptimizer,
  ImageOptimizerCache,
} from 'next/dist/server/image-optimizer';
import { NextUrlWithParsedQuery } from 'next/dist/server/request-meta';
import { NextConfigComplete } from 'next/dist/server/config-shared';
import nodeFetch from 'node-fetch';
import { UrlWithParsedQuery } from 'url';
import { defaultConfig } from 'next/dist/server/config-shared';

/* -----------------------------------------------------------------------------
 * Types
 * ---------------------------------------------------------------------------*/

type NodeFetch = typeof nodeFetch;

type OriginCacheControl = string | null;

type RequestHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  url?: NextUrlWithParsedQuery
) => Promise<void>;

type PixelOptions = {
  /**
   * Handler that is called for absolute URIs, e.g. `/my/image.png`.
   * You can implement custom fetch logic here, such as downloading the image
   * from a custom file server etc.
   * The result should be written back as stream using res.end(<buffer>).
   */
  requestHandler: RequestHandler;

  /**
   * The Next.js image configuration object.
   * Please see the Next.js documentation for all available options:
   * https://nextjs.org/docs/api-reference/next/image#configuration-options
   */
  imageConfig?: Omit<ImageConfig, 'loader'> & { loader: 'default' };

  /**
   * Path where the processed images should be temporarily stored.
   * Defaults to /tmp.
   */
  distDir?: string;
};

type ImageOptimizerResult = {
  originCacheControl: OriginCacheControl;
};

/* -----------------------------------------------------------------------------
 * globals
 * ---------------------------------------------------------------------------*/

let originCacheControl: OriginCacheControl;

/**
 * fetch polyfill to intercept the request to the external resource
 * to get the Cache-Control header from the origin
 */
const fetchPolyfill: NodeFetch = (url, init) => {
  return nodeFetch(url, init).then((result) => {
    originCacheControl = result.headers.get('Cache-Control');
    return result;
  });
};

// @ts-ignore
fetchPolyfill.isRedirect = nodeFetch.isRedirect;

// Polyfill for fetch that is used by nextImageOptimizer
// https://github.com/vercel/next.js/blob/canary/packages/next/server/image-optimizer.ts#L223

// @ts-ignore
global.fetch = fetchPolyfill;

/* -----------------------------------------------------------------------------
 * Pixel
 * ---------------------------------------------------------------------------*/

const defaultImageConfig = defaultConfig.images;

class Pixel {
  /**
   * Directory where the images should be saved to.
   */
  distDir: string;
  /**
   * Instance of local image caching service.
   */
  // imageResponseCache: ResponseCache;
  /**
   * Next.js config object that is forwarded to the image optimizer.
   */
  nextConfig: NextConfigComplete;
  /**
   * Request handler that is called to retrieve images for absolute URIs.
   */
  requestHandler: RequestHandler;

  constructor(options: PixelOptions) {
    this.distDir = options.distDir ?? '/tmp';

    // Create next config mock
    this.nextConfig = {
      images:
        {
          ...defaultImageConfig,
          ...options.imageConfig,
        } ?? defaultImageConfig,
    } as unknown as NextConfigComplete;

    // this.imageResponseCache = new ResponseCache(
    //   new ImageOptimizerCache({
    //     distDir: this.distDir,
    //     nextConfig: this.nextConfig,
    //   })
    // );

    this.requestHandler = options.requestHandler;
  }

  async imageOptimizer(
    req: IncomingMessage,
    res: ServerResponse,
    parsedUrl: UrlWithParsedQuery
  ): Promise<ImageOptimizerResult> {
    const paramsResult = ImageOptimizerCache.validateParams(
      req,
      parsedUrl.query,
      this.nextConfig,
      false
    );

    if ('errorMessage' in paramsResult) {
      throw new Error(paramsResult.errorMessage);
    }

    const result = await nextImageOptimizer(
      req,
      res,
      paramsResult,
      this.nextConfig,
      this.requestHandler
    );

    // Write response
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Cache-Control', `max-age: ${result.maxAge}`);
    res.end(result.buffer);

    return {
      originCacheControl,
    };
  }
}

export type { PixelOptions };
export { Pixel };
