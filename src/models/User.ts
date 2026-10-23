import { Schema, model, InferSchemaType } from 'mongoose';
const userSchema = new Schema({
  fullName: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  phone: { type: String, required: true, trim: true, maxlength: 30 }
}, { timestamps: true, versionKey: false });
export type UserDocument = InferSchemaType<typeof userSchema>;
export default model('User', userSchema);
