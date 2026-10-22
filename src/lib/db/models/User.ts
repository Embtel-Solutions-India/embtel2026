import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { type HydratedDocument, type Model, Schema, model, models } from 'mongoose';
import type { Role } from '@/lib/auth/permissions';

export const RESET_TOKEN_EXPIRES_MINUTES = 30;

export interface IUser {
  name: string;
  email: string;
  password: string;
  role: Role;
  avatar: string;
  active: boolean;
  lastLoginAt?: Date;
  passwordChangedAt?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  slug?: string;
  bio: string;
  jobTitle: string;
  sameAs: string[];
  expertise: string[];
}

interface IUserMethods {
  comparePassword(candidate: string): Promise<boolean>;
  changedPasswordAfter(jwtIatSeconds: number): boolean;
  createPasswordResetToken(minutes?: number): string;
  toSafeJSON(): Record<string, unknown>;
}

type UserModel = Model<IUser, object, IUserMethods>;
export type UserDoc = HydratedDocument<IUser, IUserMethods>;

const userSchema = new Schema<IUser, UserModel, IUserMethods>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ['admin', 'marketing'] satisfies Role[], default: 'marketing' },
    avatar: { type: String, default: '' },
    active: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
    passwordChangedAt: { type: Date },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    slug: { type: String, unique: true, sparse: true },
    bio: { type: String, default: '' },
    jobTitle: { type: String, default: '' },
    sameAs: { type: [String], default: [] },
    expertise: { type: [String], default: [] },
  },
  { timestamps: true },
);

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
  if (!this.isNew) this.passwordChangedAt = new Date(Date.now() - 1000);
});

userSchema.methods.comparePassword = function comparePassword(candidate: string) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.changedPasswordAfter = function changedPasswordAfter(jwtIatSeconds: number) {
  if (!this.passwordChangedAt) return false;
  return jwtIatSeconds < Math.floor(this.passwordChangedAt.getTime() / 1000);
};

// Returns the plain token (shown once as a link); only its sha256 is stored. Invites use a longer expiry.
userSchema.methods.createPasswordResetToken = function createPasswordResetToken(minutes = RESET_TOKEN_EXPIRES_MINUTES) {
  const token = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(token).digest('hex');
  this.passwordResetExpires = new Date(Date.now() + minutes * 60 * 1000);
  return token;
};

userSchema.methods.toSafeJSON = function toSafeJSON() {
  const obj: Partial<IUser> = this.toObject();
  delete obj.password;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  return obj;
};

export const User: UserModel =
  (models.User as UserModel | undefined) ?? model<IUser, UserModel>('User', userSchema, 'users');
