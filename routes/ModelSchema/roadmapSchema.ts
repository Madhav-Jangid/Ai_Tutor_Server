const { SchemaType } = require("@google/generative-ai");

const roadmapSchemaforGemini = {
    description: "Schema representing a comprehensive AI-generated study plan for a subject.",
    type: SchemaType.OBJECT,
    properties: {
        subject: {
            type: SchemaType.STRING,
            description: "The subject the study plan is focused on.",
            nullable: false,
        },
        deadline: {
            type: SchemaType.STRING,
            description: "The deadline date to complete the study plan.",
            nullable: false,
        },
        roadmap: {
            type: SchemaType.OBJECT,
            description: "Detailed roadmap for the study plan.",
            properties: {
                overview: {
                    type: SchemaType.STRING,
                    description: "High-level summary of the study roadmap.",
                    nullable: false,
                },
                key_topics: {
                    type: SchemaType.ARRAY,
                    items: {
                        type: SchemaType.OBJECT,
                        properties: {
                            topic: { type: SchemaType.STRING, nullable: false },
                            priority: { type: SchemaType.STRING, nullable: false },
                            difficulty: { type: SchemaType.STRING, nullable: false },
                            description: { type: SchemaType.STRING, nullable: false },
                            estimated_time: { type: SchemaType.STRING, nullable: false },
                            resources: {
                                type: SchemaType.ARRAY,
                                items: {
                                    type: SchemaType.OBJECT,
                                    properties: {
                                        type: { type: SchemaType.STRING, nullable: false },
                                        title: { type: SchemaType.STRING, nullable: false },
                                        url: { type: SchemaType.STRING, nullable: true },
                                    },
                                },
                            },
                        },
                    },
                },
                weekly_study_plans: {
                    type: SchemaType.ARRAY,
                    items: {
                        type: SchemaType.OBJECT,
                        properties: {
                            week: { type: SchemaType.NUMBER, nullable: false },
                            dates: { type: SchemaType.STRING, nullable: false },
                            goals: {
                                type: SchemaType.ARRAY,
                                items: { type: SchemaType.STRING },
                            },
                            milestones: {
                                type: SchemaType.ARRAY,
                                items: { type: SchemaType.STRING },
                            },
                            activities: {
                                type: SchemaType.ARRAY,
                                items: {
                                    type: SchemaType.OBJECT,
                                    properties: {
                                        title: { type: SchemaType.STRING, nullable: false },
                                        description: { type: SchemaType.STRING, nullable: false },
                                        estimated_time: { type: SchemaType.STRING, nullable: false },
                                    },
                                },
                            },
                        },
                    },
                },
                daily_study_plan: {
                    type: SchemaType.ARRAY,
                    items: {
                        type: SchemaType.OBJECT,
                        properties: {
                            date: { type: SchemaType.STRING, nullable: false },
                            tasks: {
                                type: SchemaType.ARRAY,
                                items: {
                                    type: SchemaType.OBJECT,
                                    properties: {
                                        title: { type: SchemaType.STRING, nullable: false },
                                        description: { type: SchemaType.STRING, nullable: false },
                                        estimated_time: { type: SchemaType.STRING, nullable: false },
                                        status: { type: SchemaType.STRING, nullable: false },
                                        year: { type: SchemaType.STRING, nullable: true },
                                        month: { type: SchemaType.STRING, nullable: true },
                                        day: { type: SchemaType.STRING, nullable: true },
                                        time: { type: SchemaType.STRING, nullable: true },
                                    },
                                },
                            },
                        },
                    },
                },
                resources: {
                    type: SchemaType.OBJECT,
                    properties: {
                        books: {
                            type: SchemaType.ARRAY,
                            items: { type: SchemaType.STRING },
                        },
                        articles: {
                            type: SchemaType.ARRAY,
                            items: { type: SchemaType.STRING },
                        },
                        videos: {
                            type: SchemaType.ARRAY,
                            items: { type: SchemaType.STRING },
                        },
                        online_courses: {
                            type: SchemaType.ARRAY,
                            items: { type: SchemaType.STRING },
                        },
                    },
                },
                learning_strategies: {
                    type: SchemaType.OBJECT,
                    properties: {
                        spaced_repetition: { type: SchemaType.BOOLEAN },
                        active_recall: { type: SchemaType.BOOLEAN },
                        pomodoro: { type: SchemaType.BOOLEAN },
                        notes: { type: SchemaType.BOOLEAN },
                        group_study: { type: SchemaType.BOOLEAN },
                    },
                },
                progress_tracking: {
                    type: SchemaType.OBJECT,
                    properties: {
                        completed_topics: {
                            type: SchemaType.ARRAY,
                            items: { type: SchemaType.STRING },
                        },
                        pending_topics: {
                            type: SchemaType.ARRAY,
                            items: { type: SchemaType.STRING },
                        },
                        assessments: {
                            type: SchemaType.ARRAY,
                            items: {
                                type: SchemaType.OBJECT,
                                properties: {
                                    date: { type: SchemaType.STRING },
                                    score: { type: SchemaType.NUMBER },
                                },
                            },
                        },
                    },
                },
                tutor_support: {
                    type: SchemaType.OBJECT,
                    properties: {
                        tutor_name: { type: SchemaType.STRING },
                        contact: { type: SchemaType.STRING },
                        sessions: {
                            type: SchemaType.ARRAY,
                            items: {
                                type: SchemaType.OBJECT,
                                properties: {
                                    date: { type: SchemaType.STRING },
                                    topic: { type: SchemaType.STRING },
                                    notes: { type: SchemaType.STRING },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
    required: ["subject", "deadline", "roadmap"],
};

module.exports = { roadmapSchemaforGemini };
