import { fetchUserTasks } from "./fetchUserTasks";

export async function generateStudentReport(userId: string, tutorId?: string) {
    try {
        // Fetch all user tasks, with optional tutor filter
        const result = await fetchUserTasks(userId, {
            tutorId: tutorId,
            limit: 50 // Limit to recent tasks
        });

        if (!result.success) {
            throw new Error(result.error);
        }

        const tasks = result.tasks;

        // Calculate completion rates and other metrics
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter((task: any) => task.status === 'completed').length;
        const pendingTasks = tasks.filter((task: any) => task.status === 'pending').length;
        const overdueTasks = tasks.filter((task: any) => task.status === 'overdue').length;

        const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

        // Group tasks by subject
        const tasksBySubject = tasks.reduce((acc: any, task: any) => {
            const subject = task.tutorId?.subject || 'Unknown';
            if (!acc[subject]) acc[subject] = [];
            acc[subject].push(task);
            return acc;
        }, {});

        // Generate report data
        const report = {
            summary: {
                totalTasks,
                completedTasks,
                pendingTasks,
                overdueTasks,
                completionRate: Math.round(completionRate * 10) / 10 // Round to 1 decimal place
            },
            bySubject: Object.entries(tasksBySubject).map(([subject, subjectTasks]: [string, any]) => {
                const subjectTotal = subjectTasks.length;
                const subjectCompleted = subjectTasks.filter((task: any) => task.status === 'completed').length;
                const subjectCompletionRate = subjectTotal > 0 ? (subjectCompleted / subjectTotal) * 100 : 0;

                return {
                    subject,
                    totalTasks: subjectTotal,
                    completedTasks: subjectCompleted,
                    completionRate: Math.round(subjectCompletionRate * 10) / 10,
                    recentTasks: subjectTasks.slice(0, 5).map((task: any) => ({
                        title: task.title,
                        status: task.status,
                        dueDate: `${task.year}-${task.month}-${task.day}`
                    }))
                };
            }),
            recentTasks: tasks.slice(0, 10).map((task: any) => ({
                title: task.title,
                subject: task?.tutorId?.subject || 'Unknown',
                status: task.status,
                dueDate: `${task.year}-${task.month}-${task.day}`
            }))
        };

        return {
            success: true,
            report
        };
    } catch (error) {
        console.error('Error generating student report:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}