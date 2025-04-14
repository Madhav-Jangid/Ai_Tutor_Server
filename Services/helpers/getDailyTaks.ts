import Task from "../../models/Task";

export const getDailyTasks = async (
    studentId: string,
    tutorId: string
) => {



    const today = new Date();
    const year = today.getFullYear().toString();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');

    try {
        const tasks = await Task.find({
            userId: studentId,
            tutorId: tutorId,
            year,
            month,
            day,
        });


        return tasks;
    } catch (error) {
        console.error('Error fetching daily tasks:', error);
        throw new Error('Failed to fetch daily tasks');
    }
};
