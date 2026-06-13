/**
 * A single recorded mutation (create / update / delete) performed by a user.
 * Captured automatically for every successful write request, so the user can
 * review what changed on their account and when.
 */
export interface AuditLogEntry {
  id: string;
  userId: string;
  /** HTTP verb of the mutation: POST | PUT | PATCH | DELETE. */
  method: string;
  /** Resource touched, derived from the controller, e.g. 'Envelope'. */
  resource: string;
  /** Handler name, e.g. 'create' | 'update' | 'delete'. */
  action: string;
  /** Affected entity id when known (route param or created row), else null. */
  entityId: string | null;
  statusCode: number;
  createdAt: Date;
}

export type AuditLogEntrySeed = Omit<AuditLogEntry, 'id' | 'createdAt'>;
