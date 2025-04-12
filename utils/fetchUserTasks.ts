import Task from "../models/Task";

export async function fetchUserTasks(
    userId: string,
    filters?: {
        year?: string;
        month?: string;
        day?: string;
        tutorId?: string;
        status?: 'completed' | 'pending' | 'overdue';
        limit?: number;
    }
) {
    try {
        if (!userId) {
            throw new Error('User ID is required');
        }

        const query: any = { userId };

        if (filters?.year) query.year = filters.year;
        if (filters?.month) query.month = filters.month;
        if (filters?.day) query.day = filters.day;
        if (filters?.tutorId) query.tutorId = filters.tutorId;
        if (filters?.status) query.status = filters.status;

        let taskQuery = Task.find(query)
            .populate({
                path: 'tutorId',
                select: 'studentId avatar name subject learningStyle'
            })
            .sort({ year: -1, month: -1, day: -1 });

        if (filters?.limit) {
            taskQuery = taskQuery.limit(filters.limit);
        }

        const tasks = await taskQuery.exec();

        return {
            success: true,
            tasks,
            total: tasks.length
        };
    } catch (error) {
        console.error('Error fetching tasks:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            tasks: [],
            total: 0
        };
    }
}