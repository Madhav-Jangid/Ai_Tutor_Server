import mongoose, { Document, Schema } from 'mongoose';

export interface IStreak extends Document {
    studentId: string;
    currentStreak: number;
    lastTaskCompletedAt: Date;
}

const streakSchema: Schema = new mongoose.Schema({
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    currentStreak: { type: Number, default: 0 },
    lastTaskCompletedAt: { type: Date }
});

export default mongoose.model<IStreak>('Streak', streakSchema);