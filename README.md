# Pixel for Next.js

![CI status](https://github.com/milliHQ/pixel/workflows/CI/badge.svg)

Pixel is a small wrapper around Next.js which makes the image optimizer available as a standalone service.
This way the image optimizer can be scaled independently from the Next.js server.

## Features

- ✅ &nbsp;Works with [sharp](https://github.com/lovell/sharp) or [squoosh](https://github.com/GoogleChromeLabs/squoosh)

## Implementations

- Docker image  
  Coming soon.

- [express middleware](https://github.com/milliHQ/pixel/tree/main/packages/express-middleware)  
  Use the image optimizer in an express application by applying the middleware.

- Fastify middleware  
  Coming soon.

- Koa middleware  
  Coming soon.

- [AWS Lambda / Terraform](https://github.com/milliHQ/terraform-aws-next-js-image-optimization)  
  For Terraform we provide a full service module that deploys Pixel as an serverless service to AWS.

- AWS Lambda / CDK  
  Coming soon.

## About

This project is maintained by [milliVolt infrastructure](https://milli.is).  
We build custom infrastructure solutions for any cloud provider.

## License

Apache-2.0 - see [LICENSE](https://github.com/milliHQ/pixel/tree/main/LICENSE) for details.
