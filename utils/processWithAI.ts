import Tutor from "../models/Tutor";
import User from "../models/User";
import geminiServices from "../Services/geminiServices";

/**
 * Process a message with the AI based on role and user/tutor context
 */
export async function processWithAI(
    message: string,
    userId: string,
    tutorId: string,
    role: 'student' | 'parent',
    studentId?: string,
    chatId?: string,
    io?: any,
    roomId?: string,
): Promise<string> {
    try {
        if (!message || typeof message !== 'string') {
            throw new Error('Invalid message');
        }

        if (!tutorId || (!userId && !studentId)) {
            throw new Error('Missing user or tutor ID ');
        }

        // if (!chatId) {
        //     throw new Error('Missing chat id');
        // }

        const finalUserId = role === 'parent' ? studentId! : userId;

        // Fetch student (actual user) and tutor
        const [user, tutor] = await Promise.all([
            User.findById(finalUserId),
            Tutor.findById(tutorId)
        ]);

        if (!user) {
            throw new Error(`User not found: ${finalUserId}`);
        }

        if (!tutor) {
            throw new Error(`Tutor not found: ${tutorId}`);
        }

        const aiResponse = await geminiServices.processMessage(
            message,
            userId,
            tutorId,
            role,
            chatId,
            io,
            roomId
        );

        return aiResponse || "I don't have a response at this moment.";
    } catch (error) {
        console.error('Error in processWithAI:', error);
        return "Sorry, I couldn't process your message. Please try again later.";
    }
}
