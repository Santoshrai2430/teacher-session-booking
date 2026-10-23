import { Schema, model } from 'mongoose';
export const SESSION_STATUSES = ['AVAILABLE', 'BOOKED', 'COMPLETED'] as const;
const sessionSchema = new Schema({
  teacherId: { type: Schema.Types.ObjectId, ref: 'Teacher', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  startTime: { type: Date, required: true, index: true },
  endTime: { type: Date, required: true },
  status: { type: String, enum: SESSION_STATUSES, default: 'AVAILABLE', required: true, index: true },
  completedAt: { type: Date, default: null }
}, { timestamps: true, versionKey: false });
sessionSchema.index({ status: 1, startTime: 1 });
export default model('Session', sessionSchema);
