import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Response } from "express";
import type { Observable } from "rxjs";
import { tap } from "rxjs";
import {
  DEPRECATED_METADATA_KEY,
  type DeprecationMetadata,
} from "../decorators/deprecated.decorator.js";

/**
 * Sets Deprecation/Sunset/Link headers on routes marked with @Deprecated().
 * Headers only — migration documentation itself lives at the Link target, never
 * substituted by the header alone. See internal-docs/api/versioning.md.
 */
@Injectable()
export class DeprecationHeadersInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const metadata = this.reflector.get<DeprecationMetadata | undefined>(
      DEPRECATED_METADATA_KEY,
      context.getHandler()
    );

    if (!metadata) {
      return next.handle();
    }

    const res = context.switchToHttp().getResponse<Response>();
    return next.handle().pipe(
      tap(() => {
        res.setHeader("Deprecation", `@${metadata.since}`);
        res.setHeader("Sunset", new Date(metadata.sunset).toUTCString());
        res.setHeader("Link", `<${metadata.migrationUrl}>; rel="deprecation"`);
      })
    );
  }
}
