import mongoose, { Document, Schema } from 'mongoose';

export interface IChat extends Document {
    name: string;
    userId: mongoose.Types.ObjectId;
    tutorId: mongoose.Types.ObjectId;
    messages: mongoose.Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}

const chatSchema: Schema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
        tutorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tutor', required: true },
        messages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }],
    },
    { timestamps: true }
);

export default mongoose.model<IChat>('Chat', chatSchema);
