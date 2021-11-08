/* eslint jest/expect-expect: ["error", { "assertFunctionNames": ["expect", "request.**.expect"] }] */
import { readFileSync } from 'fs';
import http, { IncomingMessage, ServerResponse } from 'http';
import { join as joinPath } from 'path';
import { parse as parseUrl } from 'url';

import {
  lookup as lookupMimeType,
  extension as extensionMimeType,
} from 'mime-types';
import request from 'supertest';

import { imageOptimizer, ImageOptimizerOptions } from '../lib/image-optimizer';

jest.setTimeout(60_000);

describe('image-optimizer core', () => {
  test.each([
    // inputFilename | outputContentType
    ['bmp/test.bmp', 'image/bmp'],
    ['jpeg/test.jpg', 'image/jpeg'],
    ['gif/test.gif', 'image/gif'],
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
          res.end(readFileSync(joinPath(__dirname, 'fixtures', inputFile)));
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
});
