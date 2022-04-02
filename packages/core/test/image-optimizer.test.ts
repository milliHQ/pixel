/* eslint jest/expect-expect: ["error", { "assertFunctionNames": ["expect", "request.**.expect"] }] */
import { readFileSync } from 'fs';
import http, { IncomingMessage, ServerResponse } from 'http';
import { join as joinPath, resolve } from 'path';
import { parse as parseUrl } from 'url';

import {
  lookup as lookupMimeType,
  extension as extensionMimeType,
} from 'mime-types';
import { defaultConfig } from 'next/dist/server/config-shared';
import request from 'supertest';

import { Pixel } from '../lib/image-optimizer';

const PATH_TO_FIXTURES = resolve(__dirname, '../../../fixtures');
const imageConfigDefault = defaultConfig.images;

jest.setTimeout(60_000);

/* -----------------------------------------------------------------------------
 * Utils
 * ---------------------------------------------------------------------------*/

function generateListener(pixel: Pixel) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    // Risk tolerable since it is used in test environment
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const url = parseUrl(req.url!, true);
    const result = await pixel.imageOptimizer(req, res, url);

    // Error handling
    if ('error' in result) {
      res.statusCode = result.statusCode;
      res.end(result.error);
      return;
    }

    // Return processed image
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Cache-Control', `public, max-age=${result.maxAge}`);
    res.end(result.buffer);
  };
}

describe('image-optimizer core', () => {
  /* ---------------------------------------------------------------------------
   * Accept all
   * -------------------------------------------------------------------------*/
  test.each([
    // inputFilename | outputContentType
    ['avif/test.avif', 'image/avif'],
    ['bmp/test.bmp', 'image/bmp'],
    ['gif/test.gif', 'image/gif'],
    ['gif/animated.gif', 'image/gif'],
    ['jpeg/test.jpg', 'image/jpeg'],
    ['png/test.png', 'image/png'],
    ['svg/test.svg', 'image/svg+xml'],
    ['tiff/test.tiff', 'image/tiff'],
    ['webp/test.webp', 'image/webp'],
    ['webp/animated.webp', 'image/webp'],
  ])(
    'Accept all: %s should convert to %s',
    // @ts-ignore - Types from jest are not correct here
    async (inputFile: string, outputContentType: string) => {
      const pixel = new Pixel({
        async requestHandler(_req, res) {
          // Read the file from disk
          res.setHeader('Content-Type', lookupMimeType(inputFile) as string);
          res.write(readFileSync(joinPath(PATH_TO_FIXTURES, inputFile)));
          res.end();
        },
        imageConfig: {
          loader: 'default',
          dangerouslyAllowSVG: true,
          contentSecurityPolicy:
            "default-src 'self'; script-src 'none'; sandbox;",
        },
      });
      const optimizerParams = new URLSearchParams({
        url: `/${inputFile}`,
        w: '128',
        q: '75',
      });

      const server = http.createServer(generateListener(pixel));

      const response = await request(server)
        .get(`/?${optimizerParams.toString()}`)
        .set('Accept', '*/*')
        .expect('Content-Type', outputContentType)
        .expect(200);

      expect(response.body).toMatchFile(
        joinPath(
          __dirname,
          '__snapshots__',
          `all_${inputFile.replace('/', '-')}.${extensionMimeType(
            // For any reason this is case sensitive ¯\_(ツ)_/¯
            response.headers['content-type']
          )}`
        )
      );
    }
  );

  /* ---------------------------------------------------------------------------
   * Accept Webp
   * -------------------------------------------------------------------------*/
  test.each([
    // inputFilename | outputContentType
    ['avif/test.avif', 'image/webp'],
    ['bmp/test.bmp', 'image/bmp'],
    ['gif/test.gif', 'image/webp'],
    ['gif/animated.gif', 'image/gif'],
    ['jpeg/test.jpg', 'image/webp'],
    ['png/test.png', 'image/webp'],
    ['svg/test.svg', 'image/svg+xml'],
    ['tiff/test.tiff', 'image/webp'],
    ['webp/test.webp', 'image/webp'],
    ['webp/animated.webp', 'image/webp'],
  ])(
    'Accept webp: %s should convert to %s',
    // @ts-ignore - Types from jest are not correct here
    async (inputFile: string, outputContentType: string) => {
      const pixel = new Pixel({
        async requestHandler(_req, res) {
          // Read the file from disk
          res.setHeader('Content-Type', lookupMimeType(inputFile) as string);
          res.write(readFileSync(joinPath(PATH_TO_FIXTURES, inputFile)));
          res.end();
        },
        imageConfig: {
          loader: 'default',
          dangerouslyAllowSVG: true,
          contentSecurityPolicy:
            "default-src 'self'; script-src 'none'; sandbox;",
        },
      });
      const optimizerParams = new URLSearchParams({
        url: `/${inputFile}`,
        w: '128',
        q: '75',
      });

      const server = http.createServer(generateListener(pixel));

      const response = await request(server)
        .get(`/?${optimizerParams.toString()}`)
        .set('Accept', 'image/webp,*/*')
        .expect('Content-Type', outputContentType)
        .expect(200);

      expect(response.body).toMatchFile(
        joinPath(
          __dirname,
          '__snapshots__',
          `webp_${inputFile.replace('/', '-')}.${extensionMimeType(
            // For any reason this is case sensitive ¯\_(ツ)_/¯
            response.headers['content-type']
          )}`
        )
      );
    }
  );

  /* ---------------------------------------------------------------------------
   * Accept Avif
   * -------------------------------------------------------------------------*/
  test.each([
    // inputFilename | outputContentType
    ['avif/test.avif', 'image/avif'],
    ['bmp/test.bmp', 'image/bmp'],
    ['gif/test.gif', 'image/avif'],
    ['gif/animated.gif', 'image/gif'],
    ['jpeg/test.jpg', 'image/avif'],
    ['png/test.png', 'image/avif'],
    ['svg/test.svg', 'image/svg+xml'],
    ['tiff/test.tiff', 'image/avif'],
    ['webp/test.webp', 'image/avif'],
    ['webp/animated.webp', 'image/webp'],
  ])(
    'Accept avif: %s should convert to %s',
    // @ts-ignore - Types from jest are not correct here
    async (inputFile: string, outputContentType: string) => {
      const pixel = new Pixel({
        async requestHandler(_req, res) {
          // Read the file from disk
          res.setHeader('Content-Type', lookupMimeType(inputFile) as string);
          res.write(readFileSync(joinPath(PATH_TO_FIXTURES, inputFile)));
          res.end();
        },
        imageConfig: {
          ...imageConfigDefault,
          loader: 'default',
          formats: ['image/avif', 'image/webp'],
          dangerouslyAllowSVG: true,
          contentSecurityPolicy:
            "default-src 'self'; script-src 'none'; sandbox;",
        },
      });
      const optimizerParams = new URLSearchParams({
        url: `/${inputFile}`,
        w: '128',
        q: '75',
      });

      const server = http.createServer(generateListener(pixel));

      const response = await request(server)
        .get(`/?${optimizerParams.toString()}`)
        .set('Accept', 'image/avif,image/webp,*/*')
        .expect('Content-Type', outputContentType)
        .expect(200);

      expect(response.body).toMatchFile(
        joinPath(
          __dirname,
          '__snapshots__',
          `avif_${inputFile.replace('/', '-')}.${extensionMimeType(
            // For any reason this is case sensitive ¯\_(ツ)_/¯
            response.headers['content-type']
          )}`
        )
      );
    }
  );

  test('Get Cache-Control header from requestHandler', async () => {
    const cacheControlHeader = 'public, max-age=123456';
    const inputFile = 'jpeg/test.jpg';

    const pixel = new Pixel({
      async requestHandler(_req, res) {
        // Read the file from disk
        res.setHeader('Content-Type', lookupMimeType(inputFile) as string);
        res.setHeader('Cache-Control', cacheControlHeader);
        res.write(readFileSync(joinPath(PATH_TO_FIXTURES, inputFile)));
        res.end();
      },
      imageConfig: {
        loader: 'default',
        dangerouslyAllowSVG: true,
        contentSecurityPolicy:
          "default-src 'self'; script-src 'none'; sandbox;",
      },
    });

    const optimizerParams = new URLSearchParams({
      url: `/${inputFile}`,
      w: '128',
      q: '75',
    });

    const server = http.createServer(generateListener(pixel));

    await request(server)
      .get(`/?${optimizerParams.toString()}`)
      .set('Accept', 'image/webp,*/*')
      .expect('Content-Type', 'image/webp')
      .expect('Cache-Control', cacheControlHeader)
      .expect(200);
  });
});
