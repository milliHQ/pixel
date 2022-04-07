import * as http from 'http';
import { parse as parseUrl } from 'url';

import { Pixel, PixelOptions } from '@millihq/pixel-core';
import {
  ImageOptimizerCache,
  sendResponse,
  getHash,
} from 'next/dist/server/image-optimizer';
import ResponseCache from 'next/dist/server/response-cache';
import { getExtension } from 'next/dist/server/serve-static';

/* -----------------------------------------------------------------------------
 * Types
 * ---------------------------------------------------------------------------*/

type PixelMiddlewareOptions = {
  distDir?: string;
} & PixelOptions;

type NextFunction = {
  (err?: any): void;
  /**
   * "Break-out" of a router by calling {next('router')};
   * @see {https://expressjs.com/en/guide/using-middleware.html#middleware.router}
   */
  (deferToNext: 'router'): void;
  /**
   * "Break-out" of a route by calling {next('route')};
   * @see {https://expressjs.com/en/guide/using-middleware.html#middleware.application}
   */
  (deferToNext: 'route'): void;
};

type MiddlewareFunction = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  next: NextFunction
) => void;

/**
 * express middleware of Pixel for Next.js
 *
 * @param options
 * @returns
 */
function middlewareInitializer({
  distDir = '/tmp',
  ...pixelOptions
}: PixelMiddlewareOptions): MiddlewareFunction {
  const pixel = new Pixel(pixelOptions);
  const imageResponseCache = new ResponseCache(
    new ImageOptimizerCache({
      distDir,
      nextConfig: pixel.nextConfig,
    }),
    true
  );

  return async (req, res, next) => {
    const { nextConfig } = pixel;

    if (typeof req.url !== 'string') {
      return next(
        new Error(
          'Pixel: Required property `url` is missing from incoming request.'
        )
      );
    }

    const parsedUrl = parseUrl(req.url, true);
    const paramsResult = ImageOptimizerCache.validateParams(
      req,
      parsedUrl.query,
      nextConfig,
      false
    );

    try {
      if ('errorMessage' in paramsResult) {
        throw new Error(paramsResult.errorMessage);
      }

      const cacheKey = ImageOptimizerCache.getCacheKey(paramsResult);

      const cacheEntry = await imageResponseCache.get(
        cacheKey,
        async () => {
          const pixelResponse = await pixel.imageOptimizer(
            req,
            res,
            parsedUrl,
            paramsResult
          );
          if ('error' in pixelResponse) {
            throw new Error(pixelResponse.error);
          }

          const { buffer, contentType, maxAge } = pixelResponse;
          const etag = getHash([buffer]);

          return {
            value: {
              kind: 'IMAGE',
              buffer,
              etag,
              extension: getExtension(contentType) as string,
            },
            revalidate: maxAge,
          };
        },
        {}
      );

      if (cacheEntry?.value?.kind !== 'IMAGE') {
        throw new Error(
          'invariant did not get entry from image response cache'
        );
      }

      sendResponse(
        req,
        res,
        paramsResult.href,
        cacheEntry.value.extension,
        cacheEntry.value.buffer,
        paramsResult.isStatic,
        cacheEntry.isMiss ? 'MISS' : cacheEntry.isStale ? 'STALE' : 'HIT',
        nextConfig.images.contentSecurityPolicy
      );
    } catch (error) {
      next(error);
    }
  };
}

export type { PixelOptions as PixelExpressOptions };
export { middlewareInitializer as pixelExpress };
