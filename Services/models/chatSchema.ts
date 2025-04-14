import { SchemaType } from "@google/generative-ai";

const chatSchema = {
    description: "Mental wellness agent response schema",
    type: SchemaType.STRING,
    properties: {
        message: {
            type: SchemaType.STRING,
            description: "Your normal conversational message to the user in markdown format.",
            nullable: false,
        },
        requireTools: {
            description: "Specifies if tools are needed to fetch user data.",
            type: SchemaType.OBJECT,
            properties: {
                isAccessToToolsRequired: {
                    type: SchemaType.BOOLEAN,
                    description: "True if access to tools is required.",
                    nullable: false,
                },
                getUsersTasks: {
                    type: SchemaType.BOOLEAN,
                    description: "True if daily tasks of the user are needed.",
                    nullable: true,
                },
                getUsersRoadmap: {
                    type: SchemaType.BOOLEAN,
                    description: "True if user's roadmap is needed.",
                    nullable: true,
                }
            },
            required: ["isAccessToToolsRequired"],
        },
    },
    required: ["message", "requireTools"],
};

module.exports = { chatSchema };