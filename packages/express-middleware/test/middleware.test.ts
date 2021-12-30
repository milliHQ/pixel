/* eslint jest/expect-expect: ["error", { "assertFunctionNames": ["expect", "request.**.expect"] }] */
import { readFileSync } from 'fs';
import { IncomingMessage, ServerResponse } from 'http';
import { join as joinPath } from 'path';

import express, { Application as ExpressApplication } from 'express';
import { lookup as lookupMimeType } from 'mime-types';
import request from 'supertest';

import { pixelExpress } from '../lib/middleware';

jest.setTimeout(60_000);

const inputFile = 'jpeg/test.jpg';

/**
 * Fake requestHandler that reads a predefined fixture from disk and then
 */
function requestHandlerMock(_req: IncomingMessage, res: ServerResponse) {
  // Read the file from disk
  res.setHeader('Content-Type', lookupMimeType(inputFile) as string);
  res.write(readFileSync(joinPath(__dirname, 'fixtures', inputFile)));
  res.end();
}

describe('image-optimizer express middleware', () => {
  let app: ExpressApplication;

  beforeAll(() => {
    app = express();
    app.get(
      '/next/image',
      pixelExpress({
        requestHandler: requestHandlerMock,
      })
    );
  });

  test('absolute path', async () => {
    const optimizerParams = new URLSearchParams({
      url: `/${inputFile}`,
      w: '128',
      q: '75',
    });

    await request(app)
      .get(`/next/image?${optimizerParams.toString()}`)
      .set('Accept', 'image/webp,*/*')
      .expect('Content-Type', 'image/webp')
      .expect(200);
  });
});