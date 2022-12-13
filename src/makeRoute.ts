import {NextApiRequest, NextApiResponse, NextApiHandler} from "next";

export interface IHttpContext {}

export type MiddlewareRoute<T = any> = (ctx: IHttpContext, req: NextApiRequest, res: NextApiResponse<T>) => Promise<void>;
export type MiddlewareError = {
  code: number;
  message: string;
}
export type Middleware<T = any> = {
  error?: MiddlewareError;
  execute: (ctx: IHttpContext, req: NextApiRequest, res: NextApiResponse) => Promise<boolean | MiddlewareError>;
}

export type MakeRouteParameters<T> = {
  middlewares: Middleware[]
  errorHandler?: (res: NextApiResponse, code: number, message: string) => Promise<void>,
}

export async function sendError<T = unknown>(res: NextApiResponse, code: number, message: string) {
  await res.status(code).json({error: message});
}

export function makeRoute<T = unknown>(handler: MiddlewareRoute<T>, {
  middlewares = [],
  errorHandler = sendError
}: MakeRouteParameters<T>): NextApiHandler<T> {
  return async (req: NextApiRequest, res: NextApiResponse<T>) => {
    const ctx: IHttpContext = {};

    for (const middleware of middlewares) {
      const response = await middleware.execute(ctx, req, res);
      if (response === false) {
        await errorHandler(res, middleware.error?.code ?? 500, middleware.error?.message ?? "Server error");
        return;
      } else if (response !== true) {
        await errorHandler(res, response.code, response.message);
        return;
      }
    }

    res.status(200);
    await handler(ctx, req, res);
  };
}
