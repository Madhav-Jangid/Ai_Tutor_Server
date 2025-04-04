import mongoose, { Date, Document, Schema } from 'mongoose';
import { IParentUser, IStudentUser } from '../utils/ModalUtils/UserProfiles';

export interface IUser extends Document {
    name: string;
    email: string;
    password: string;
    role: 'student' | 'parent';
    subscriptionTier: 'free' | 'basic' | 'premium';
    studentId?: mongoose.Types.ObjectId;
    tutorsCreated: number;
    tutors: mongoose.Types.ObjectId[];
    children?: mongoose.Types.ObjectId[];
    createdAt: Date;
    currentStreak?: number;
    longestStreak?: number;
    // lastActivity?: Date;
}



const userSchema: Schema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        role: { type: String, enum: ['student', 'parent'], required: true },
        subscriptionTier: { type: String, enum: ['free', 'basic', 'premium'], default: 'free' },
        studentId: { type: Schema.Types.ObjectId, ref: 'User' },
        tutorsCreated: { type: Number, default: 0 },
        tutors: [{ type: Schema.Types.ObjectId, ref: 'Tutor' }],
        children: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        currentStreak: {
            type: Number,
            default: 0,
            required: function (this: any) { return this.role === 'student'; }
        },
        longestStreak: {
            type: Number,
            default: 0,
            required: function (this: any) { return this.role === 'student'; }
        },
        lastActivity: {
            type: Date,
            default: Date.now,
            required: function (this: any) { return this.role === 'student'; }
        },
    },
    { timestamps: true }
);


export default mongoose.model<IStudentUser | IParentUser>('User', userSchema);
