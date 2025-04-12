import { validationResult } from 'express-validator';
import Chat from '../models/Chats';
import Message from '../models/Message';
import geminiServices from '../Services/geminiServices';


export const createNewChatSession = async (req: any, res: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { tutorId, userId, name } = req.body;

        const chat = new Chat({
            name: name || 'New Chat',
            userId,
            tutorId,
            messages: []
        });

        await chat.save();
        res.status(201).json(chat);
    } catch (error) {
        console.error('Error creating chat:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

export const getAllUsersById = async (req: any, res: any) => {
    try {
        const userId = req.params.userId;
        const chats = await Chat.find({ userId }).sort({ updatedAt: -1 });
        res.json(chats);
    } catch (error) {
        console.error('Error fetching chats:', error);
        res.status(500).json({ message: 'Server error' });
    }
}


export const getChatWithMessageById = async (req: any, res: any) => {
    try {
        const chatId = req.params.chatId;

        const chat = await Chat.findById(chatId);
        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }

        // Populate messages
        const populatedChat = await Chat.findById(chatId).populate({
            path: 'messages',
            options: { sort: { createdAt: 1 } }
        });

        if (!populatedChat) {
            return res.status(404).json({ message: 'Chat not found during population' });
        }

        return res.status(200).json(populatedChat);
    } catch (error) {
        console.error('Error fetching chat:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};


export const sendMessageInChatForAiResponse = async (req: any, res: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { content, userId, role } = req.body;
        const chatId = req.params.chatId;

        const chat = await Chat.findById(chatId);
        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }

        const userMessage: any = new Message({
            chatId,
            senderId: userId,
            senderType: 'user',
            content,
        });

        await userMessage.save();
        chat.messages.push(userMessage._id);
        await chat.save();

        const aiResponse = await geminiServices.processMessage(
            content,
            userId,
            chat.tutorId.toString(),
            role
        );

        const aiMessage: any = new Message({
            chatId,
            senderId: chat.tutorId,
            senderType: 'tutor',
            content: aiResponse,
        });

        await aiMessage.save();
        chat.messages.push(aiMessage._id);
        chat.updatedAt = new Date();
        await chat.save();

        return res.status(201).json({
            userMessage,
            aiMessage,
        });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ message: 'Server error' });
    }
};


export const deleteChatHistoryById = async (req: any, res: any) => {
    try {
        const chatId = req.params.chatId;

        const chat = await Chat.findById(chatId);
        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }

        await Message.deleteMany({ chatId });
        chat.messages = [];
        await chat.save();

        geminiServices.clearChatSession(chat.userId.toString(), chat.tutorId.toString());

        res.json({ message: 'Chat history cleared' });
    } catch (error) {
        console.error('Error clearing chat:', error);
        res.status(500).json({ message: 'Server error' });
    }
}