import { Request, Response } from 'express';
import User, { IUser } from '../models/User';
import { hashPassword, comparePassword } from '../utils/passwordUtils';
import jwt from 'jsonwebtoken';

interface SignupBody {
    name: string;
    email: string;
    password: string;
    role: 'student' | 'parent';
    studentId?: string;
}

export const signup = async (req: any, res: any): Promise<void> => {
    try {
        const { name, email, password, role, studentId } = req.body;

        if (role === 'parent' && !studentId) {
            return res.status(400).json({ message: 'Student ID is required for parent role' });
        }

        const hashedPassword = await hashPassword(password);

        const user: IUser = await User.create({
            name,
            email,
            password: hashedPassword,
            role,
            children: role === 'parent' ? [studentId] : [],
        });

        res.status(201).json({ message: 'User created successfully', user });

    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }

};

interface LoginBody {
    email: string;
    password: string;
}

export const login = async (req: Request<{}, {}, LoginBody>, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;
        console.log(`Got Auth Request form ${email}`);

        const user = await User.findOne({ email });

        if (!user || !(await comparePassword(password, user.password))) {
            res.status(401).json({ message: 'Invalid credentials' });
            return;
        }

        const token = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.JWT_SECRET as string,
            { expiresIn: '1h' }
        );

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                role: user.role
            }
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
