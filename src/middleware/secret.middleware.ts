import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { createHmac } from 'crypto';

@Injectable()
export class SecretMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const key = process.env.SERVER_ACCESS_KEY;

    const paystackSign = req.headers['x-paystack-signature'];

    if (paystackSign) {
      const hash = createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (hash !== paystackSign) {
        return next(new Error('Unauthorized request'));
      }

      next();
      return;
    }

    const secret = req.headers[key];

    const json = { message: 'Access Denied' };

    if (!secret) next(new Error(json.message));

    const envSecret = process.env.SERVER_ACCESS_SECRET;

    if (envSecret !== secret) next(new Error(json.message));

    next();
  }
}
