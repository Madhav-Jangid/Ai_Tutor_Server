import express, { Request, Response } from 'express';
import Task from '../models/Task';
import User from '../models/User';
import { Schema } from 'mongoose';
import { IStudentUser } from '../utils/ModalUtils/UserProfiles';

const router = express.Router();

router.post('/get-task', async (req: any, res: any) => {
    try {
        const { year, month, userId } = req.body;

        // const userId = (req as any).user?.id; // Adjust based on your authentication middleware

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Find tasks for the specific user, year, and month
        const tasks = await Task.find({
            userId,
            year: year as string,
            month: month as string
        })
            .populate({
                path: 'tutorId',
                select: 'studentId avatar name subject learningStyle'
            })
            .select('');

        // Transform tasks into the format expected by the client
        const transformedTasks = tasks.map(task => ({
            title: task.title,
            year: task.year,
            month: task.month,
            day: task.day
        }));

        res.json({
            tasks: tasks,
            total: transformedTasks.length
        });

    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});



// Function to update user streak
async function updateUserStreak(userId: any): Promise<{
    currentStreak: number;
    longestStreak: number;
    updated: boolean;
}> {
    try {
        // Find the user
        const user: IStudentUser | null = await User.findById(userId);

        if (!user || user.role !== 'student') {
            throw new Error('Student not found');
        }

        // Get today's date with time set to midnight
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Get user's last activity date with time set to midnight
        const lastActivityDate = new Date(`${user.lastActivity}`);
        lastActivityDate.setHours(0, 0, 0, 0);

        // Get yesterday's date with time set to midnight
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        // Get user's creation date with time set to midnight
        const createdAtDate = new Date(`${user.createdAt}`);
        createdAtDate.setHours(0, 0, 0, 0);

        let streakUpdated = false;

        // Check if this is a new user (lastActivity equals createdAt)
        const isNewUser = lastActivityDate.getTime() === createdAtDate.getTime();

        if (isNewUser) {
            // For new users, set streak to 1 to start their streak journey
            user.currentStreak = 1;
            user.longestStreak = 1;
            user.lastActivity = today;
            streakUpdated = true;
            console.log('New user first activity, streak initialized to 1');
        }
        // User was active today - no streak update needed
        else if (lastActivityDate.getTime() === today.getTime()) {
            console.log('User already active today, no streak update needed');
        }
        // User was active yesterday - increment streak
        else if (lastActivityDate.getTime() === yesterday.getTime()) {
            if (user.currentStreak) {
                user.currentStreak += 1;
                user.longestStreak = Math.max(user.longestStreak!, user.currentStreak!);
                user.lastActivity = today;
                streakUpdated = true;
                console.log('User was active yesterday, streak incremented');
            }
        }
        // User was not active yesterday - reset streak to 1
        else {
            // User was inactive for more than a day, reset streak to 1
            user.currentStreak = 1;
            user.longestStreak = Math.max(user.longestStreak!, user.currentStreak);
            user.lastActivity = today;
            streakUpdated = true;
            console.log('User was inactive for more than a day, streak reset to 1');
        }

        // Save user if streak was updated
        if (streakUpdated) {
            await user.save();
        }

        return {
            currentStreak: user.currentStreak!,
            longestStreak: user.longestStreak!,
            updated: streakUpdated
        };

    } catch (error) {
        console.error('Error updating user streak:', error);
        throw error;
    }
}

// Implementation in your route handler
// Implementation in your route handler
router.post('/save-quiz-marks', async (req: any, res: any) => {
    try {
        const { taskId, quizMarks, quizMarksOutOf } = req.body;

        if (!taskId || quizMarks === undefined || quizMarksOutOf === undefined) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Update the task with quiz marks
        const updatedTask = await Task.findOneAndUpdate(
            { _id: taskId },
            { quizMarks, quizMarksOutOf, status: 'Completed' },
            { new: true, runValidators: true }
        );

        if (!updatedTask) {
            return res.status(404).json({ error: 'Task update failed' });
        }

        const today = new Date();
        const todayYear = today.getFullYear().toString();
        const todayMonth = (today.getMonth() + 1).toString().padStart(2, '0');
        const todayDay = today.getDate().toString().padStart(2, '0');

        const isTodayTask =
            updatedTask.year === todayYear &&
            updatedTask.month === todayMonth &&
            updatedTask.day === todayDay;

        const userId = updatedTask.userId;

        // Initialize default streak response
        let streakResult = {
            currentStreak: 0,
            longestStreak: 0,
            updated: false
        };

        // Only update streak if this is today's task
        if (isTodayTask) {
            streakResult = await updateUserStreak(userId);
        } else {
            // If not today's task, fetch current streak information without updating
            const user = await User.findById(userId);
            if (user && user.role === 'student') {
                streakResult.currentStreak = user.currentStreak || 0;
                streakResult.longestStreak = user.longestStreak || 0;
            }
        }

        res.json({
            message: streakResult.updated
                ? 'Quiz marks saved successfully & streak updated'
                : 'Quiz marks saved successfully',
            task: {
                taskId: updatedTask._id,
                quizMarks: updatedTask.quizMarks,
                quizMarksOutOf: updatedTask.quizMarksOutOf
            },
            streak: {
                currentStreak: streakResult.currentStreak,
                longestStreak: streakResult.longestStreak,
                updated: streakResult.updated
            }
        });
    } catch (error) {
        console.error('Error saving quiz marks:', error);
        res.status(500).json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});


export default router;