import Tutor from "../models/Tutor";
import User from "../models/User";
import geminiServices from "../Services/geminiServices";

export async function processWithAI(
    message: string,
    userId: string,
    tutorId: string,
    role: 'student' | 'parent'
): Promise<string> {
    try {
        // Validate inputs
        if (!message || typeof message !== 'string') {
            throw new Error('Invalid message');
        }

        if (!userId || !tutorId) {
            throw new Error('Missing user or tutor ID');
        }

        // Validate user and tutor existence
        const [user, tutor] = await Promise.all([
            User.findById(userId),
            Tutor.findById(tutorId)
        ]);

        if (!user) {
            throw new Error(`User not found: ${userId}`);
        }

        if (!tutor) {
            throw new Error(`Tutor not found: ${tutorId}`);
        }

        // Ensure the role is valid
        if (role !== 'student' && role !== 'parent') {
            throw new Error(`Invalid role: ${role}`);
        }

        // Process message with AI service
        const aiResponse = await geminiServices.processMessage(
            message,
            userId,
            tutorId,
            role
        );

        return aiResponse || "I don't have a response at this moment.";
    } catch (error) {
        console.error('Error in processWithAI:', error);
        return "Sorry, I couldn't process your message. Please try again later.";
    }
}