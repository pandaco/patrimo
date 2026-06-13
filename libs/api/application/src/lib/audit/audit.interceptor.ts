import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import { AuditLogService } from './audit-log.service';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Records every successful mutating request (create / update / delete) for the
 * authenticated user. Registered globally; it shortcuts on safe methods and on
 * unauthenticated requests, and records fire-and-forget so auditing can never
 * block or break the request it observes.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly audit: AuditLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: { id?: string } }>();
    const method = req.method?.toUpperCase() ?? '';

    if (!MUTATING_METHODS.has(method)) return next.handle();

    return next.handle().pipe(
      tap((body: unknown) => {
        const userId = req.user?.id;
        if (!userId) return; // unauthenticated mutation (logout / oauth) — skip

        const res = context.switchToHttp().getResponse<Response>();
        const resource = context.getClass().name.replace(/Controller$/, '');
        const action = context.getHandler().name;

        const paramId = req.params?.['id'];
        const bodyId = (body as { id?: unknown } | null)?.id;
        const entityId =
          typeof paramId === 'string' && paramId
            ? paramId
            : typeof bodyId === 'string'
              ? bodyId
              : null;

        this.audit
          .record({ userId, method, resource, action, entityId, statusCode: res.statusCode })
          .catch((err) => this.logger.warn(`Audit record failed: ${(err as Error).message}`));
      }),
    );
  }
}
