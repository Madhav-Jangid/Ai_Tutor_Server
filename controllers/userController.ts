import User from "../models/User";

export const getUserDetails = async (req: any, res: any) => {
    try {
        const { userId } = req.query;

        if (!userId || userId === undefined) {
            return res.status(400).json({ error: 'Missing userId' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json({
            userData: user
        });
    } catch (error) {
        console.error('Error Fetching User:', error);
        res.status(500).json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};