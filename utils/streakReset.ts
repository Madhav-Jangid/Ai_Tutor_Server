import cron from 'node-cron';
import User from '../models/User';  // Adjust path as needed

// Schedule task to run at 12:00 AM every day
// cron.schedule('0 0 * * *', async () => {
cron.schedule('*/10 * * * *', async () => {
    console.log('Running Streak Reset Job...');

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const studentsToReset = await User.find({
            role: 'student',
            lastActivity: { $lt: today }
        });

        if (studentsToReset.length > 0) {
            await User.updateMany(
                { _id: { $in: studentsToReset.map(user => user._id) } },
                { $set: { currentStreak: 0 } }
            );

            console.log(`Reset streaks for ${studentsToReset.length} students.`);
        } else {
            console.log('No streaks to reset today.');
        }
    } catch (error) {
        console.error('Error resetting streaks:', error);
    }
});
