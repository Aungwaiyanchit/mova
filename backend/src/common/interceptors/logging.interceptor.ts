import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from "@nestjs/common";
import { Request } from "express";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { redactSensitive } from "../utils/redact-sensitive";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const { method, path } = request;
    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const delay = Date.now() - now;
          this.logger.log(`${method} ${path} - ${delay}ms`);
        },
        error: (error: Error) => {
          const delay = Date.now() - now;
          this.logger.error(
            `${method} ${path} - ${delay}ms - Error: ${redactSensitive(error.message)}`,
          );
        },
      }),
    );
  }
}
