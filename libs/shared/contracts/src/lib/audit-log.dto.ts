export interface AuditLogEntryDto {
  id: string;
  /** HTTP verb: POST | PUT | PATCH | DELETE. */
  method: string;
  /** Resource touched, e.g. 'Envelope'. */
  resource: string;
  /** Handler name, e.g. 'create' | 'update' | 'delete'. */
  action: string;
  entityId: string | null;
  statusCode: number;
  /** ISO-8601 timestamp. */
  createdAt: string;
}
