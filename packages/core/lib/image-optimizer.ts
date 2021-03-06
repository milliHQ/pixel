import { IncomingMessage, ServerResponse } from 'http';
import { UrlWithParsedQuery } from 'url';

import {
  imageOptimizer as nextImageOptimizer,
  ImageOptimizerCache,
  ImageError,
  ImageParamsResult,
} from 'next/dist/server/image-optimizer';
import { NextUrlWithParsedQuery } from 'next/dist/server/request-meta';
import {
  defaultConfig,
  NextConfigComplete,
} from 'next/dist/server/config-shared';
import nodeFetch from 'node-fetch';

/* -----------------------------------------------------------------------------
 * Types
 * ---------------------------------------------------------------------------*/

type ImageConfig = Partial<NextConfigComplete['images']>;

type RequestHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  url?: NextUrlWithParsedQuery
) => Promise<void>;

type PixelResponse =
  | {
      buffer: Buffer;
      contentType: string;
      maxAge: number;
      paramsResult: ImageParamsResult;
    }
  | {
      error: string;
      statusCode: number;
    };

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
};

/* -----------------------------------------------------------------------------
 * globals
 * ---------------------------------------------------------------------------*/

// Polyfill for fetch that is used by nextImageOptimizer
// https://github.com/vercel/next.js/blob/canary/packages/next/server/image-optimizer.ts#L223

// @ts-ignore
global.fetch = nodeFetch;

/* -----------------------------------------------------------------------------
 * Pixel
 * ---------------------------------------------------------------------------*/

const defaultImageConfig = defaultConfig.images;

class Pixel {
  /**
   * Next.js config object that is forwarded to the image optimizer.
   */
  nextConfig: NextConfigComplete;
  /**
   * Request handler that is called to retrieve images for absolute URIs.
   */
  requestHandler: RequestHandler;

  constructor(options: PixelOptions) {
    // Create next config mock
    this.nextConfig = {
      images:
        {
          ...defaultImageConfig,
          ...options.imageConfig,
        } ?? defaultImageConfig,
    } as unknown as NextConfigComplete;

    this.requestHandler = options.requestHandler;
  }

  async imageOptimizer(
    req: IncomingMessage,
    res: ServerResponse,
    parsedUrl: UrlWithParsedQuery,
    paramsResult?: ImageParamsResult
  ): Promise<PixelResponse> {
    const internalParamsResult =
      paramsResult ??
      ImageOptimizerCache.validateParams(
        req,
        parsedUrl.query,
        this.nextConfig,
        false
      );

    if ('errorMessage' in internalParamsResult) {
      return { error: internalParamsResult.errorMessage, statusCode: 400 };
    }

    try {
      const imageOptimizerResult = await nextImageOptimizer(
        req,
        res,
        internalParamsResult,
        this.nextConfig,
        this.requestHandler
      );

      return {
        ...imageOptimizerResult,
        paramsResult: internalParamsResult,
      };
    } catch (error) {
      if (error instanceof ImageError) {
        return {
          error: error.message,
          statusCode: error.statusCode,
        };
      }

      // Unhandled error
      throw error;
    }
  }
}

export type { PixelOptions };
export { Pixel };
