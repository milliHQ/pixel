import { UrlWithParsedQuery } from 'url';
import { IncomingMessage, ServerResponse } from 'http';

import { ImageConfig } from 'next/dist/server/image-config';
import { NextConfig } from 'next/dist/server/config';
import { imageOptimizer as nextImageOptimizer } from 'next/dist/server/image-optimizer';
import Server from 'next/dist/server/next-server';
import nodeFetch from 'node-fetch';

/* -----------------------------------------------------------------------------
 * Types
 * ---------------------------------------------------------------------------*/

type NodeFetch = typeof nodeFetch;

type OriginCacheControl = string | null;

type ImageOptimizerOptions = {
  /**
   * Handler that is called for absolute URIs, e.g. `/my/image.png`.
   * You can implement custom fetch logic here, such as downloading the image
   * from a custom file server etc.
   * The result should be written back as stream using res.end(<buffer>).
   */
  requestHandler: (
    req: IncomingMessage,
    res: ServerResponse,
    url: UrlWithParsedQuery
  ) => void | Promise<void>;

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
  finished: boolean;
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
 * imageOptimizer
 * ---------------------------------------------------------------------------*/

async function imageOptimizer(
  req: IncomingMessage,
  res: ServerResponse,
  parsedUrl: UrlWithParsedQuery,
  options: ImageOptimizerOptions
): Promise<ImageOptimizerResult> {
  const { requestHandler, imageConfig, distDir = '/tmp' } = options;

  // Create next config mock
  const nextConfig = {
    images: imageConfig,
  } as unknown as NextConfig;

  // Create Next.js server mock
  const server = {
    getRequestHandler: () => requestHandler,
  } as Server;

  const result = await nextImageOptimizer(
    server,
    req,
    res,
    parsedUrl,
    nextConfig,
    distDir
  );

  return {
    ...result,
    originCacheControl,
  };
}

export type { ImageOptimizerOptions };
export { imageOptimizer };
