interface LessonRequest {
    _id: string;
    title: string;
    description: string;
    estimated_time: string;
    status: string;
    tutorId: string;
}

export default function generateStudyContentPrompt(lessonData: LessonRequest, tutor: any, roadmap: any): string {
    return `
    Generate a comprehensive study content module for the topic "${lessonData.title}" and for topic dicription "${lessonData.description} with the following specifications:
    
    Output Format:
    {
      "topic": "${lessonData.title}",
      "subject": "${tutor.subject}",
      "difficulty": "<Determined based on roadmap difficulty>",
      "estimated_study_time": <Calculate based on roadmap daily study plan>,
      "readme": "<Comprehensive markdown-formatted README content>",
      "quiz": [
        {
          "question": "<Detailed question>",
          "options": ["<Option 1>", "<Option 2>", "<Option 3>", "<Option 4>"],
          "correct_answer": "<Correct option>",
          "explanation": "<Detailed explanation of the answer>"
        }
        // Additional quiz questions
      ]
    }
    
    Content Generation Guidelines:
    1. README Content Requirements:
       - Provide a comprehensive, detailed explanation of the topic
       - Use markdown formatting with clear headings and structure
       - Include:
         * Detailed concept explanations
         * Real-world applications
         * Key takeaways
         * Examples and case studies
         * Visual explanation aids (described in text)
    
    2. Quiz Generation:
       - Create 5-10 questions covering different aspects of the topic
       - Vary question types (multiple choice, true/false, short answer)
       - Align difficulty with student's learning pace (${tutor.pace})
       - Tailor to student's learning style (${tutor.learningStyle})
    
    3. Personalization Factors:
       - Adapt content to student's interests: ${tutor.interests}
       - Use language: ${tutor.language}
       - Consider tutor personality: ${tutor.personality}
    
    4. Difficulty and Time Estimation:
       - Assess difficulty based on roadmap: ${roadmap.key_topics}
       - Estimate study time considering: ${roadmap.daily_study_plan}
    
    5. Learning Strategies Integration:
       - Incorporate:
         * Spaced Repetition: ${roadmap.learning_strategies?.spaced_repetition || 'N/A'}
         * Active Recall: ${roadmap.learning_strategies?.active_recall || 'N/A'}
         * Pomodoro Technique: ${roadmap.learning_strategies?.pomodoro || 'N/A'}
    
    Special Instructions:
    - Ensure content is engaging and personalized
    - Provide clear, simple explanations
    - Include practical examples
    - Create a structured, easy-to-follow learning experience
    `;
}