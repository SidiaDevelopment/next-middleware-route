# [next-middleware-route](https://www.npmjs.com/package/next-middlware-route)

This library extends next routes with a middleware option in a simple manner.

Next supports middlewares natively, please check if the scope you need is already handled by it: https://nextjs.org/docs/advanced-features/middleware

# Content
<!-- TOC -->
* [Content](#content)
* [Installation](#installation)
* [Usage](#usage)
  * [Defining middlewares](#defining-middlewares)
    * [Add data](#add-data)
    * [Check and cancel request](#check-and-cancel-request)
  * [Attaching middlewares to routes](#attaching-middlewares-to-routes)
  * [Custom error handling](#custom-error-handling)
  * [Middlewares with parameters](#middlewares-with-parameters)
  * [Parse body in middlewares](#parse-body-in-middlewares)
<!-- TOC -->

# Installation

```bash
# npm
npm i next-middlware-route

# yarn
yarn add next-middleware-route
```

Typescript is natively supported, no `@types/...` package needed.

# Usage

All usage examples are shown for Typescript. For Javascript just remove the type annotations.

This library provides two additional functionalities: 
- Add data to a request based on request data
- Cancel a request and show an error message before it reaches the route
## Defining middlewares

### Add data

To extend the HttpContext we use merged interfaces.

```ts
import {NextApiRequest, NextApiResponse} from "next";
import {Middleware, IHttpContext} from "next-middleware-route";

// Add your data types to the IHttpContext interface
// Always make it optional as, most likely, not every route will have your middleware
declare module "next-middleware-route" {
  interface IHttpContext {
    customData?: string;
  }
}

// Add data to the IHttpContext 
// Return true as it should not interrupt the request
const customDataMiddleware: Middleware = {
  execute: async (ctx: IHttpContext, req: NextApiRequest, res: NextApiResponse) => {
    ctx.customData = "data";
    return true;
  }
}

export default customDataMiddleware;
```

The middleware will execute before the targeted request function is execute, and you will be able to access your 
`ctx.customData` in the targeted request.

### Check and cancel request

```ts
import {NextApiRequest, NextApiResponse} from "next";
import {Middleware} from "next-middleware-route";

// Check request data and return false if failed
// If returned false the error defined is being used as response
const filterGetMiddleware: Middleware = {
  error: {
    code: 405,
    message: "Method not allowed"
  },
  execute: async (ctx: IHttpContext, req: NextApiRequest, res: NextApiResponse) => {
    return req.method != "GET";
    // You can return a custom error that differs from the one above like this:
    // return {code: 405, message: "Custom error"};
  }
}

export default filterGetMiddleware;
```

The default error handler responds with the following: 
```ts
res.status(code).json({error: message});
```

## Attaching middlewares to routes

To attach a middleware you wrap the actual route handler with a `makeRoute` and pass all middlewares as an option.

```ts
import type { NextApiRequest, NextApiResponse } from 'next'

import {IHttpContext, makeRoute, sendError} from "next-middleware-route";
import customDataMiddleware from "middlewares/customDataMiddleware";
import filterGetMiddleware from "middlewares/filterGetMiddleware";

async function handler(
  ctx: IHttpContext,
  req: NextApiRequest,
  res: NextApiResponse
) {
  const {customData} = ctx;

  if (!customData) {
    // Forgot to add customDataMiddleware to the middleware array
    return await sendError(res, 500, "customDataMiddleware did not run");
  }
  
  // All good, output the custom data
  return res.status(200).json({message: customData});
}

// Attach middlewares to the route and export the result as default
export default makeRoute(handler, {
  middlewares: [filterGetMiddleware, customDataMiddleware]
});
```

## Custom error handling

You can define a custom error handler per route like this:

```ts
export default makeRoute(handler, {
  middlewares: [],
  errorHandler: async (res: NextApiResponse<T>, code: number, message: string): Promise<void> => {
    // Handle error data
    // Always send a response to not stall requests
  }
});
```

If you want it in all routes you can wrap the `makeRoute` with a custom `makeMyRoute` and use it instead of `makeRoute`:

```ts
import {makeRoute, sendError} from "next-middleware-route";

export default function makeMyRoute<T = unknown>(handler: MiddlewareRoute<T>, {
  middlewares = [],
  errorHandler = sendError
}: MakeRouteParameters<T>) {
  return makeRoute(handler, {
    middlewares: middlewares,
    
    // Use the per route error handler, otherwise your defined default
    errorhandler: errorHandler ?? async (res: NextApiResponse<T>, code: number, message: string): Promise<void> => {
      // Handle error data
      // Always send a response to not stall requests
    }
  })
}
```

## Middlewares with parameters

If your middleware should have parameters you can wrap them in a function. Here is an example for multiple HttpMethods:

```ts
import {NextApiRequest, NextApiResponse} from "next";
import {makeRoute, sendError, Middleware, IHttpContext} from "next-middleware-route";


export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export default function methodMiddleware(methods: HttpMethod | HttpMethod[]): Middleware {
  return {
    error: {
      code: 405,
      message: "Method not allowed"
    },
    execute: async (ctx: IHttpContext, req: NextApiRequest, res: NextApiResponse): Promise<boolean> => {
      const {method} = req;
      const methodArray = Array.isArray(methods) ? methods : [methods];

      return !!method && methodArray.includes(method as HttpMethod);
    }
  }
}
```

You can use it like this: 

```ts
export default makeMyRoute(handler, {
  middlewares: [methodMiddleware("GET")]
});
```

## Parse body in middlewares

Every route that uses a middleware which does custom body parsing needs the following export: 
```ts
export const config = {
  api: {
    bodyParser: false
  }
}
```
