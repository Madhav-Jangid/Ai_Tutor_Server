import mongoose, { Schema, Document } from "mongoose";

// Interface for Study Plan Document
export interface IStudyPlan extends Document {
    subject: string;
    deadline: Date;
    roadmap: {
        overview: string;
        key_topics: {
            topic: string;
            priority: "High" | "Medium" | "Low";
            difficulty: "Easy" | "Medium" | "Hard";
            description: string;
            estimated_time: string;
            resources: {
                type: string;
                title: string;
                url?: string;
            }[];
        }[];
        weekly_study_plans: {
            week: number;
            dates: string;
            goals: string[];
            milestones: string[];
            activities: {
                title: string;
                description: string;
                estimated_time: string;
            }[];
        }[];
        daily_study_plan: {
            date: Date;
            tasks: {
                title: string;
                description: string;
                estimated_time: string;
                status: "Pending" | "In Progress" | "Completed";
                year: string;
                month: string;
                day: string;
                time: string;
            }[];
        }[];
        resources: {
            books?: string[];
            articles?: string[];
            videos?: string[];
            online_courses?: string[];
        };
        learning_strategies: {
            spaced_repetition: boolean;
            active_recall: boolean;
            pomodoro: boolean;
            notes: boolean;
            group_study: boolean;
        };
        progress_tracking: {
            completed_topics: string[];
            pending_topics: string[];
            assessments: {
                date: Date;
                score: number;
            }[];
        };
        tutor_support?: {
            tutor_name: string;
            contact: string;
            sessions: {
                date: Date;
                topic: string;
                notes: string;
            }[];
        };
    };
}

// MongoDB Schema using Mongoose
const StudyPlanSchema = new Schema<IStudyPlan>({
    subject: { type: String, required: true },
    deadline: { type: Date, required: true },
    roadmap: {
        overview: { type: String, required: true },
        key_topics: [
            {
                topic: { type: String, required: true },
                priority: { type: String, enum: ["High", "Medium", "Low"], required: true },
                difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], required: true },
                description: { type: String, required: true },
                estimated_time: { type: String, required: true },
                resources: [
                    {
                        type: { type: String, required: true },
                        title: { type: String, required: true },
                        url: { type: String },
                    },
                ],
            },
        ],
        weekly_study_plans: [
            {
                week: { type: Number, required: true },
                dates: { type: String, required: true },
                goals: [{ type: String, required: true }],
                milestones: [{ type: String, required: true }],
                activities: [
                    {
                        title: { type: String, required: true },
                        description: { type: String, required: true },
                        estimated_time: { type: String, required: true },
                    },
                ],
            },
        ],
        daily_study_plan: [
            {
                date: { type: Date, required: true },
                tasks: [
                    {
                        title: { type: String, required: true },
                        description: { type: String, required: true },
                        estimated_time: { type: String, required: true },
                        status: {
                            type: String,
                            enum: ["Pending", "In Progress", "Completed"],
                            default: "Pending",
                        },
                    },
                ],
            },
        ],
        resources: {
            books: [{ type: String }],
            articles: [{ type: String }],
            videos: [{ type: String }],
            online_courses: [{ type: String }],
        },
        learning_strategies: {
            spaced_repetition: { type: Boolean, default: false },
            active_recall: { type: Boolean, default: false },
            pomodoro: { type: Boolean, default: false },
            notes: { type: Boolean, default: false },
            group_study: { type: Boolean, default: false },
        },
        progress_tracking: {
            completed_topics: [{ type: String }],
            pending_topics: [{ type: String }],
            assessments: [
                {
                    date: { type: Date, required: true },
                    score: { type: Number, required: true },
                },
            ],
        },
        tutor_support: {
            tutor_name: { type: String },
            contact: { type: String },
            sessions: [
                {
                    date: { type: Date },
                    topic: { type: String },
                    notes: { type: String },
                },
            ],
        },
    },
});

// Export the Mongoose model
export default mongoose.model<IStudyPlan>("StudyPlan", StudyPlanSchema);
