import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AuditService {
  constructor(private readonly db: DatabaseService) {}

  async log(params: {
    actorId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    before?: any;
    after?: any;
    ip?: string;
    userAgent?: string;
  }) {
    await this.db.query(
      `INSERT INTO "audit_logs" ("actor_id", "action", "entity_type", "entity_id", "before", "after", "ip", "user_agent")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`,
      [
        params.actorId || null,
        params.action,
        params.entityType,
        params.entityId || null,
        params.before ? JSON.stringify(params.before) : null,
        params.after ? JSON.stringify(params.after) : null,
        params.ip || null,
        params.userAgent || null,
      ],
    );
  }
}
