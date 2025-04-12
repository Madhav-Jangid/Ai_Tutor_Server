import express from 'express';
import { body } from 'express-validator';
import {
    createNewChatSession,
    deleteChatHistoryById,
    getAllUsersById,
    getChatWithMessageById,
    sendMessageInChatForAiResponse
} from '../controllers/chatController';

const router = express.Router();

router.post(
    '/create',
    [
        body('tutorId').isMongoId().withMessage('Invalid tutor ID'),
        body('userId').isMongoId().withMessage('Invalid user ID'),
        body('name').optional().isString().withMessage('Chat name must be a string')
    ], createNewChatSession);

router.get('/user/:userId', getAllUsersById);

router.get('/:chatId', getChatWithMessageById);

router.delete('/:chatId', deleteChatHistoryById);

router.post('/:chatId/message',
    [
        body('content').isString().notEmpty().withMessage('Message content is required'),
        body('userId').isMongoId().withMessage('Invalid user ID'),
        body('role').isIn(['student', 'parent']).withMessage('Invalid role')
    ], sendMessageInChatForAiResponse);


export default router;