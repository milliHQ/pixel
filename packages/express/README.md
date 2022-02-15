# Pixel for Next.js - express middleware

This is the express middleware package of [Pixel for Next.js](https://github.com/milliHQ/pixel).
It enables you to use the image optimizer of Next.js in a express app without starting the whole Next.js server.
Useful when you want to provide the image optimizer of Next.js as standalone API.

## Installation

Install the package `@millihq/pixel-express` with your favorite package manager.  
You also need to install [`next`](https://www.npmjs.com/package/next) and its peer dependencies [`react`](https://www.npmjs.com/package/react) and [`react-dom`](https://www.npmjs.com/package/react-dom).

By default [squoosh](https://github.com/GoogleChromeLabs/squoosh) is used as image optimization engine (Next.js default).  
If you want to use [sharp](https://github.com/lovell/sharp) instead, you have to install it as an additional dependency.

```sh
npm i @millihq/pixel-express next react react-dom        # squoosh
npm i @millihq/pixel-express next react react-dom sharp  # sharp
```

## Usage

```ts
import { readFileSync } from 'fs';

import express from 'express';
import { pixelExpress } from '@millihq/pixel-express-middleware';

const app = express();

app.get(
  '/next/image',
  pixelExpress({
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
    }
  })
);

app.listen(3000);
```

## About

This project is maintained by [milliVolt infrastructure](https://milli.is).  
We build custom infrastructure solutions for any cloud provider.

## License

Apache-2.0 - see [LICENSE](https://github.com/milliHQ/pixel/tree/main/LICENSE) for details.
