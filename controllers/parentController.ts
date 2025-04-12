import User from "../models/User";

export const getParentInfoWithChildrens = async (req: any, res: any) => {
    try {
        const { parentId } = req.params;

        const parent = await User.findById(parentId).populate({
            path: 'children',
            match: { role: 'student' },
        });



        if (!parent || parent.role !== 'parent') {
            return res.status(404).json({ message: 'Parent not found or invalid role' });
        }

        res.status(200).json({
            message: 'Children fetched successfully',
            children: parent.children,
        });
    } catch (error) {
        console.error('Error fetching children:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};