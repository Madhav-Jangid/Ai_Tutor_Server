import { IUser } from "../../models/User";

// Student-specific interface (lastActivity is required)
export interface IStudentUser extends IUser {
    role: 'student';
    lastActivity: Date;
}

// Parent-specific interface (lastActivity is optional)
export interface IParentUser extends IUser {
    role: 'parent';
    lastActivity?: Date;
}