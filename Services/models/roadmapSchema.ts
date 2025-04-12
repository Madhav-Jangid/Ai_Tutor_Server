const { SchemaType } = require("@google/generative-ai");

const roadmapSchemaforGemini = {
    type: SchemaType.OBJECT,
    required: ['subject', 'deadline', 'roadmap'],
    properties: {
        subject: {
            type: SchemaType.STRING,
            nullable: false,
            description: "The academic subject or topic for which the personalized roadmap is being created."
        },
        deadline: {
            type: SchemaType.STRING,
            nullable: false,
            description: "The final target date by which the learning goals should be accomplished."
        },
        roadmap: {
            type: SchemaType.OBJECT,
            required: [
                'overview', 'key_topics', 'weekly_study_plans', 'daily_study_plan',
                'resources', 'learning_strategies', 'progress_tracking', 'tutor_support'
            ],
            properties: {
                overview: {
                    type: SchemaType.STRING,
                    nullable: false,
                    description: "A concise summary of the overall learning objectives and scope of the roadmap."
                },
                key_topics: {
                    type: SchemaType.ARRAY,
                    items: {
                        type: SchemaType.OBJECT,
                        required: ['topic', 'priority', 'difficulty', 'description', 'estimated_time', 'resources'],
                        properties: {
                            topic: {
                                type: SchemaType.STRING,
                                nullable: false,
                                description: "The title or name of the specific topic to be covered."
                            },
                            priority: {
                                type: SchemaType.STRING,
                                nullable: false,
                                description: "The importance level of this topic (e.g., High, Medium, Low)."
                            },
                            difficulty: {
                                type: SchemaType.STRING,
                                nullable: false,
                                description: "The expected challenge level for understanding this topic (e.g., Easy, Medium, Hard)."
                            },
                            description: {
                                type: SchemaType.STRING,
                                nullable: false,
                                description: "A brief explanation of what the topic covers."
                            },
                            estimated_time: {
                                type: SchemaType.STRING,
                                nullable: false,
                                description: "Approximate time required to learn or complete this topic (e.g., '2 hours')."
                            },
                            resources: {
                                type: SchemaType.ARRAY,
                                items: {
                                    type: SchemaType.OBJECT,
                                    required: ['type', 'title'],
                                    properties: {
                                        type: {
                                            type: SchemaType.STRING,
                                            nullable: false,
                                            description: "The format of the resource (e.g., video, article, book)."
                                        },
                                        title: {
                                            type: SchemaType.STRING,
                                            nullable: false,
                                            description: "The title of the resource."
                                        },
                                        url: {
                                            type: SchemaType.STRING,
                                            nullable: true,
                                            description: "The link to the resource, if available online."
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                weekly_study_plans: {
                    type: SchemaType.ARRAY,
                    items: {
                        type: SchemaType.OBJECT,
                        required: ['week', 'dates', 'goals', 'milestones', 'activities'],
                        properties: {
                            week: {
                                type: SchemaType.INTEGER,
                                nullable: false,
                                description: "Week number in the roadmap, starting from 1."
                            },
                            dates: {
                                type: SchemaType.STRING,
                                nullable: false,
                                format: 'date-time',
                                description: "The starting date for the week (format: YYYY-MM-DD)."
                            },
                            goals: {
                                type: SchemaType.ARRAY,
                                items: { type: SchemaType.STRING },
                                description: "List of learning objectives for the week."
                            },
                            milestones: {
                                type: SchemaType.ARRAY,
                                items: { type: SchemaType.STRING },
                                description: "Key accomplishments expected by the end of the week."
                            },
                            activities: {
                                type: SchemaType.ARRAY,
                                items: {
                                    type: SchemaType.OBJECT,
                                    required: ['title', 'description', 'estimated_time'],
                                    properties: {
                                        title: {
                                            type: SchemaType.STRING,
                                            nullable: false,
                                            description: "Title or name of the activity."
                                        },
                                        description: {
                                            type: SchemaType.STRING,
                                            nullable: false,
                                            description: "Brief description of the learning activity."
                                        },
                                        estimated_time: {
                                            type: SchemaType.STRING,
                                            nullable: false,
                                            description: "Estimated time to complete this activity."
                                        }
                                    }
                                },
                                description: "List of planned activities for the week."
                            }
                        }
                    }
                },
                daily_study_plan: {
                    type: SchemaType.ARRAY,
                    items: {
                        type: SchemaType.OBJECT,
                        required: ['date', 'tasks'],
                        properties: {
                            date: {
                                type: SchemaType.STRING,
                                nullable: false,
                                description: "The specific calendar date for the study tasks."
                            },
                            tasks: {
                                type: SchemaType.ARRAY,
                                items: {
                                    type: SchemaType.OBJECT,
                                    required: ['title', 'description', 'estimated_time', 'status'],
                                    properties: {
                                        title: { type: SchemaType.STRING, nullable: false, description: "The name of the study task." },
                                        description: { type: SchemaType.STRING, nullable: false, description: "Details about the task's content." },
                                        estimated_time: { type: SchemaType.STRING, nullable: false, description: "Expected time needed to complete the task." },
                                        status: { type: SchemaType.STRING, nullable: false, description: "Current progress of the task (e.g., pending, in-progress, completed)." },
                                        year: { type: SchemaType.STRING, nullable: true, description: "Optional: Year of the task." },
                                        month: { type: SchemaType.STRING, nullable: true, description: "Optional: Month of the task." },
                                        day: { type: SchemaType.STRING, nullable: true, description: "Optional: Day of the task." },
                                        time: { type: SchemaType.STRING, nullable: true, description: "Optional: Specific time for the task." }
                                    }
                                },
                                description: "List of study tasks scheduled for the day."
                            }
                        }
                    }
                },
                resources: {
                    type: SchemaType.OBJECT,
                    required: ['books', 'articles', 'videos', 'online_courses'],
                    properties: {
                        books: {
                            type: SchemaType.ARRAY,
                            items: { type: SchemaType.STRING },
                            description: "List of recommended books for the subject."
                        },
                        articles: {
                            type: SchemaType.ARRAY,
                            items: { type: SchemaType.STRING },
                            description: "List of relevant articles to support the topics."
                        },
                        videos: {
                            type: SchemaType.ARRAY,
                            items: { type: SchemaType.STRING },
                            description: "Video resources such as lectures or tutorials."
                        },
                        online_courses: {
                            type: SchemaType.ARRAY,
                            items: { type: SchemaType.STRING },
                            description: "Online learning courses relevant to the subject."
                        }
                    }
                },
                learning_strategies: {
                    type: SchemaType.OBJECT,
                    required: ['spaced_repetition', 'active_recall', 'pomodoro', 'notes', 'group_study'],
                    properties: {
                        spaced_repetition: { type: SchemaType.BOOLEAN, description: "Use of spaced repetition to improve retention." },
                        active_recall: { type: SchemaType.BOOLEAN, description: "Engaging with material through recall-based learning." },
                        pomodoro: { type: SchemaType.BOOLEAN, description: "Time management using the Pomodoro technique." },
                        notes: { type: SchemaType.BOOLEAN, description: "Encouragement to take structured notes during learning." },
                        group_study: { type: SchemaType.BOOLEAN, description: "Encouragement to participate in group learning sessions." }
                    }
                },
                progress_tracking: {
                    type: SchemaType.OBJECT,
                    required: ['completed_topics', 'pending_topics', 'assessments'],
                    properties: {
                        completed_topics: {
                            type: SchemaType.ARRAY,
                            items: { type: SchemaType.STRING },
                            description: "Topics that have already been studied and completed."
                        },
                        pending_topics: {
                            type: SchemaType.ARRAY,
                            items: { type: SchemaType.STRING },
                            description: "Topics yet to be covered."
                        },
                        assessments: {
                            type: SchemaType.ARRAY,
                            items: {
                                type: SchemaType.OBJECT,
                                required: ['topic', 'date', 'score'],
                                properties: {
                                    topic: { type: SchemaType.STRING, description: "The topic on which the assessment was conducted." },
                                    date: { type: SchemaType.STRING, description: "Date of the assessment." },
                                    score: { type: SchemaType.INTEGER, format: 'int64', description: "Score achieved in the assessment." }
                                }
                            },
                            description: "List of assessments conducted with scores."
                        }
                    }
                },
                tutor_support: {
                    type: SchemaType.OBJECT,
                    required: ['tutor_name', 'contact', 'sessions'],
                    properties: {
                        tutor_name: { type: SchemaType.STRING, description: "Name of the assigned tutor." },
                        contact: { type: SchemaType.STRING, description: "Contact information for the tutor (email/phone)." },
                        sessions: {
                            type: SchemaType.ARRAY,
                            items: {
                                type: SchemaType.OBJECT,
                                required: ['date', 'topic', 'notes'],
                                properties: {
                                    date: { type: SchemaType.STRING, description: "Date of the tutoring session." },
                                    topic: { type: SchemaType.STRING, description: "Topic discussed during the session." },
                                    notes: { type: SchemaType.STRING, description: "Key takeaways or notes from the session." }
                                }
                            },
                            description: "History of tutoring sessions with notes."
                        }
                    }
                }
            }
        }
    }
};

module.exports = { roadmapSchemaforGemini };
