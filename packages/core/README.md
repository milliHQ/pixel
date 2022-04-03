# Pixel for Next.js - Core

This is the core package of [Pixel for Next.js](https://github.com/milliHQ/pixel).
It is a small wrapper that extracts the image-optimization functionality of Next.js and makes it usable without starting the whole Next.js server.

## Installation

Install the package `@millihq/pixel-core` with your favorite package manager.  
You also need to install [`next`](https://www.npmjs.com/package/next) and its peer dependencies [`react`](https://www.npmjs.com/package/react) and [`react-dom`](https://www.npmjs.com/package/react-dom).

By default [squoosh](https://github.com/GoogleChromeLabs/squoosh) is used as image optimization engine (Next.js default).  
If you want to use [sharp](https://github.com/lovell/sharp) instead, you have to install it as an additional dependency.

```sh
npm i @millihq/pixel-core next react react-dom        # squoosh
npm i @millihq/pixel-core next react react-dom sharp  # sharp
```

## Usage

Pixel can be integrated with the standard Node.js HTTP request and response model.

```ts
import { readFileSync } from 'fs';
import http, { IncomingMessage, ServerResponse } from 'http';
import { parse as parseUrl } from 'url';

import { Pixel } from '@millihq/pixel-core';

const pixel = new Pixel({
  async requestHandler(req, res) {
    // Load images here that are requested from an absolute path, e.g.
    //
    // /my-image.png
    // => http:localhost:3000/_next/image?w=512&q=75&url=%2Fmy-image.png
    res.write(readFileSync('my-image.png'));
    res.end();
  },
  // Customize the behavior of the image optimizer by providing a custom
  // config, see: https://nextjs.org/docs/api-reference/next/image#advanced
  imageConfig: {
    ...
  },
});

async function listener(req: IncomingMessage, res: ServerResponse) {
  const url = parseUrl(req.url!, true);
  const result = await pixel.imageOptimizer(req, res, url);

  if ('error' in result) {
    res.statusCode = result.statusCode;
    res.end(result.error);
    return;
  }

  res.setHeader('Content-Type', result.contentType);
  res.setHeader('Cache-Control', `public, max-age=${result.maxAge}`);
  res.end(result.buffer);
}

const server = http.createServer(listener);
server.listen(3000);
```

## About

This project is maintained by [milliVolt infrastructure](https://milli.is).  
We build custom infrastructure solutions for any cloud provider.

## License

Apache-2.0 - see [LICENSE](https://github.com/milliHQ/pixel/tree/main/LICENSE) for details.
