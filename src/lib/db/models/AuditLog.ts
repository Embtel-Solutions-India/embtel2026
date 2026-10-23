import { type Model, Schema, type Types, model, models } from 'mongoose';

export interface IAuditLog {
  actorId: Types.ObjectId;
  action: string;
  target: { type: string; id?: string };
  meta: Record<string, unknown>;
  createdAt: Date;
}

const schema = new Schema<IAuditLog>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, required: true },
    target: {
      type: { type: String, required: true },
      id: { type: String },
      _id: false,
    },
    meta: { type: Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, index: -1 },
  },
  { timestamps: { createdAt: true, updatedAt: false }, minimize: false },
);

export const AuditLog: Model<IAuditLog> =
  (models.AuditLog as Model<IAuditLog> | undefined) ?? model<IAuditLog>('AuditLog', schema, 'auditlogs');
