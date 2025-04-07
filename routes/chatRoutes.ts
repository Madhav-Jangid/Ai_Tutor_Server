// File: src/routes/chatRoutes.ts
import express from 'express';
import { body, validationResult } from 'express-validator';
import geminiService from '../Services/geminiServices';
import Chat from '../models/Chats';
import Message from '../models/Message';

const router = express.Router();

// Create a new chat session
router.post(
    '/create',
    [
        body('tutorId').isMongoId().withMessage('Invalid tutor ID'),
        body('userId').isMongoId().withMessage('Invalid user ID'), // Add userId to request body
        body('name').optional().isString().withMessage('Chat name must be a string')
    ],
    async (req: any, res: any) => {
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
);

// Get all chats for a user
router.get('/user/:userId', async (req: any, res: any) => {
    try {
        const userId = req.params.userId;
        const chats = await Chat.find({ userId }).sort({ updatedAt: -1 });
        res.json(chats);
    } catch (error) {
        console.error('Error fetching chats:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get chat by ID with messages
router.get('/:chatId', async (req: any, res: any) => {
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

        res.json(populatedChat);
    } catch (error) {
        console.error('Error fetching chat:', error);
        res.status(500).json({ message: 'Server error' });
    }
});


router.get('/:id', async (req: any, res: any) => {
    try {
        const chatId = req.params.id;

        // Find chat by ID
        const chat = await Chat.findById(chatId);

        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }

        // Fetch all messages for this chat
        const messages = await Message.find({
            chatId: chatId
        }).sort({ createdAt: 1 });

        console.log(`Found ${messages.length} messages for chat ${chatId}`);

        return res.status(200).json({
            ...chat.toObject(),
            messages: messages
        });
    } catch (error: any) {
        console.error('Error fetching chat:', error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
});


// Send a message in a chat and get AI response
router.post(
    '/:chatId/message',
    [
        body('content').isString().notEmpty().withMessage('Message content is required'),
        body('userId').isMongoId().withMessage('Invalid user ID'),
        body('role').isIn(['student', 'parent']).withMessage('Invalid role')
    ],
    async (req: any, res: any) => {
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

            const aiResponse = await geminiService.processMessage(
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

            res.status(201).json({
                userMessage,
                aiMessage,
            });
        } catch (error) {
            console.error('Error sending message:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
);

// Clear chat history
router.delete('/:chatId', async (req: any, res: any) => {
    try {
        const chatId = req.params.chatId;

        const chat = await Chat.findById(chatId);
        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }

        await Message.deleteMany({ chatId });
        chat.messages = [];
        await chat.save();

        geminiService.clearChatSession(chat.userId.toString(), chat.tutorId.toString());

        res.json({ message: 'Chat history cleared' });
    } catch (error) {
        console.error('Error clearing chat:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;