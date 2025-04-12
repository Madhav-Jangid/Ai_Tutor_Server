import Message from './models/Message';
import Chat from './models/Chats';
import Tutor from './models/Tutor';
import { processWithAI } from './utils/processWithAI';
import type { Server } from 'socket.io';


const activeConnections = new Map();
export default function initSockets(io: Server) {

    io.on('connection', (socket: any) => {
        let currentRooms = new Set();

        socket.on('join-room', (roomId: string) => {
            if (typeof roomId !== 'string' || !roomId.trim()) {
                socket.emit('error', { message: 'Invalid room ID' });
                return;
            }

            socket.join(roomId);
            currentRooms.add(roomId);

            socket.to(roomId).emit('user-joined', { socketId: socket.id });

            socket.emit('room-joined', { roomId });
        });

        socket.on('leave-room', ((roomId: string) => {
            if (typeof roomId === 'string' && roomId.trim()) {
                socket.leave(roomId);
                currentRooms.delete(roomId);
            }
        }));

        socket.on('send-message', async (data: any) => {
            try {
                if (!data || typeof data !== 'object') {
                    socket.emit('error', { message: 'Invalid message data' });
                    return;
                }

                const { roomId, message, userId, tutorId, role, chatId } = data;

                if (!roomId || !message || !userId || !tutorId || !role) {
                    socket.emit('error', { message: 'Missing required fields' });
                    return;
                }

                let chat;
                if (chatId) {
                    chat = await Chat.findById(chatId);
                }

                if (!chat) {
                    chat = new Chat({
                        name: `${userId}-${tutorId}`,
                        userId,
                        tutorId,
                        messages: []
                    });
                    await chat.save();

                    socket.emit('chat-created', { chatId: chat._id });
                }

                const userMessage: any = new Message({
                    chatId: chat._id,
                    senderId: userId,
                    senderType: 'user',
                    content: message,
                });

                await userMessage.save();

                chat.messages.push(userMessage._id);
                chat.updatedAt = new Date();
                await chat.save();

                io.to(roomId).emit('receive-message', {
                    _id: userMessage._id,
                    message: userMessage.content,
                    userId,
                    senderType: 'user',
                    timestamp: userMessage.createdAt,
                });

                if (role === 'student' || role === 'parent') {
                    io.to(roomId).emit('tutor-typing', { tutorId, isTyping: true });

                    try {
                        const aiResponse = await processWithAI(message, userId, tutorId, role);

                        const aiMessage: any = new Message({
                            chatId: chat._id,
                            senderId: tutorId,
                            senderType: 'tutor',
                            content: aiResponse,
                        });

                        await aiMessage.save();

                        chat.messages.push(aiMessage._id);
                        chat.updatedAt = new Date();
                        await chat.save();

                        const tutor = await Tutor.findById(tutorId);

                        if (tutor && !tutor.chat) {
                            await Tutor.findByIdAndUpdate(
                                tutorId,
                                { chat: chat._id },
                                { new: true }
                            );
                        }

                        io.to(roomId).emit('tutor-typing', { tutorId, isTyping: false });

                        io.to(roomId).emit('receive-message', {
                            _id: aiMessage._id,
                            message: aiMessage.content,
                            userId: tutorId,
                            senderType: 'tutor',
                            timestamp: aiMessage.createdAt,
                        });


                    } catch (aiError: any) {
                        io.to(roomId).emit('tutor-typing', { tutorId, isTyping: false });
                        io.to(roomId).emit('error', {
                            message: 'Failed to get AI response',
                            error: aiError.message
                        });
                    }
                }
            } catch (error: any) {
                socket.emit('error', {
                    message: 'Failed to process message',
                    error: error.message
                });
            }
        });

        socket.on('disconnect', () => {
            currentRooms.forEach(roomId => {
                socket.to(roomId).emit('user-left', { socketId: socket.id });
            });

            if (socket.userId) {
                activeConnections.delete(socket.userId);
            }
        });
    });


    process.on('SIGINT', () => {
        console.log('Shutting down server...');
        io.close(() => {
            console.log('Socket.IO server closed');
            process.exit(0);
        });
    });
}