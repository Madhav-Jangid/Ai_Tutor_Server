import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
    chatId: mongoose.Types.ObjectId;
    senderId: mongoose.Types.ObjectId;
    senderType: 'user' | 'tutor';
    content: string;
    createdAt: Date;
    updatedAt: Date;
}

const messageSchema: Schema = new mongoose.Schema(
    {
        chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
        senderId: { type: mongoose.Schema.Types.ObjectId, required: true },
        senderType: { type: String, enum: ['user', 'tutor'], required: true },
        content: { type: String, required: true },
    },
    { timestamps: true }
);

export default mongoose.model<IMessage>('Message', messageSchema);