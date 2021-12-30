import * as http from 'http';
import { parse as parseUrl } from 'url';

import { imageOptimizer, ImageOptimizerOptions } from '@millihq/pixel-core';

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
function middlewareInitializer(
  options: ImageOptimizerOptions
): MiddlewareFunction {
  return async (req, res, next) => {
    if (typeof req.url !== 'string') {
      return next(
        new Error(
          'Pixel: Required property `url` is missing from incoming request.'
        )
      );
    }

    await imageOptimizer(req, res, parseUrl(req.url, true), options);
    next();
  };
}

export type { ImageOptimizerOptions as PixelExpressOptions };
export { middlewareInitializer as pixelExpress };
