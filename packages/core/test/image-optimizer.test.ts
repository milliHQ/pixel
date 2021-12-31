/* eslint jest/expect-expect: ["error", { "assertFunctionNames": ["expect", "request.**.expect"] }] */
import { readFileSync } from 'fs';
import http, { IncomingMessage, ServerResponse } from 'http';
import { join as joinPath, resolve } from 'path';
import { parse as parseUrl } from 'url';

import {
  lookup as lookupMimeType,
  extension as extensionMimeType,
} from 'mime-types';
import { imageConfigDefault } from 'next/dist/server/image-config';
import request from 'supertest';

import { imageOptimizer, ImageOptimizerOptions } from '../lib/image-optimizer';

const PATH_TO_FIXTURES = resolve(__dirname, '../../../fixtures');

jest.setTimeout(60_000);

describe('image-optimizer core', () => {
  /* ---------------------------------------------------------------------------
   * Accept all
   * -------------------------------------------------------------------------*/
  test.each([
    // inputFilename | outputContentType
    ['avif/test.avif', 'image/avif'],
    ['bmp/test.bmp', 'image/bmp'],
    ['gif/test.gif', 'image/gif'],
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
      const options: ImageOptimizerOptions = {
        requestHandler(_req, res) {
          // Read the file from disk
          res.setHeader('Content-Type', lookupMimeType(inputFile) as string);
          res.write(readFileSync(joinPath(PATH_TO_FIXTURES, inputFile)));
          res.end();
        },
      };
      const optimizerParams = new URLSearchParams({
        url: `/${inputFile}`,
        w: '128',
        q: '75',
      });

      async function listener(req: IncomingMessage, res: ServerResponse) {
        // Risk tolerable since it is used in test environment
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const url = parseUrl(req.url!, true);
        await imageOptimizer(req, res, url, options);
      }
      const server = http.createServer(listener);

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
      const options: ImageOptimizerOptions = {
        requestHandler(_req, res) {
          // Read the file from disk
          res.setHeader('Content-Type', lookupMimeType(inputFile) as string);
          res.write(readFileSync(joinPath(PATH_TO_FIXTURES, inputFile)));
          res.end();
        },
      };
      const optimizerParams = new URLSearchParams({
        url: `/${inputFile}`,
        w: '128',
        q: '75',
      });

      async function listener(req: IncomingMessage, res: ServerResponse) {
        // Risk tolerable since it is used in test environment
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const url = parseUrl(req.url!, true);
        await imageOptimizer(req, res, url, options);
      }
      const server = http.createServer(listener);

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
      const options: ImageOptimizerOptions = {
        requestHandler(_req, res) {
          // Read the file from disk
          res.setHeader('Content-Type', lookupMimeType(inputFile) as string);
          res.write(readFileSync(joinPath(PATH_TO_FIXTURES, inputFile)));
          res.end();
        },
        imageConfig: {
          ...imageConfigDefault,
          loader: 'default',
          formats: ['image/avif', 'image/webp'],
        },
      };
      const optimizerParams = new URLSearchParams({
        url: `/${inputFile}`,
        w: '128',
        q: '75',
      });

      async function listener(req: IncomingMessage, res: ServerResponse) {
        // Risk tolerable since it is used in test environment
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const url = parseUrl(req.url!, true);
        await imageOptimizer(req, res, url, options);
      }
      const server = http.createServer(listener);

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
});
