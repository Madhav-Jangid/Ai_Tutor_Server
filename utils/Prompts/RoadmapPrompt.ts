export default function generatePromptForRoadmap(tutor: any, deadline: string, extractedText: string): string {

    return `
    # 📘 Syllabus Validation for Subject: "${tutor.subject}"

    You are an academic assistant designed to validate and process syllabus documents. The user has uploaded a file, and we've extracted the raw text content for you. 

    Below is the **extracted text** from the document:

    ---
    ${extractedText}
    ---

    ## 🧠 Task: Analyze this text and follow the steps below.

    ---

    ## 🔍 Step 1: Subject Relevance

    - Confirm the text is specifically about **"${tutor.subject}"**.
    - Look for keywords, chapter names, or topics such as:
    ${tutor.subject === 'Mathematics'
            ? '"algebra", "geometry", "calculus", "probability", "trigonometry", "statistics"'
            : tutor.subject === 'Physics'
                ? '"mechanics", "optics", "thermodynamics", "kinematics", "waves", "laws of motion", "modern physics"'
                : '"subject-specific vocabulary, unit titles, technical concepts"'}
    - If multiple subjects appear, extract and keep **only the "${tutor.subject}" content**.

    ---

    ## 🧱 Step 2: Structural Integrity

    The syllabus must contain:

    1. **Clearly defined units or chapters** – e.g., "Unit 2: Algebra", "Chapter 4: Thermodynamics"
    2. **Learning objectives or goals** – e.g., "Understand Newton's Laws"
    3. **Timeline or logical order** – e.g., "Week 1", "Module 3", etc.

    Reject unstructured content or loose bullet lists.

    ---

    ## 📚 Step 3: Completeness Check

    - The syllabus must include **at least 3 major units** with subtopics or brief descriptions.
    - It must not be just a summary, index, or high-level bullet list.

    ---

    ## 🛑 Final Decision

    If any of the above checks **fail**, return this **exact string** (no extra text or formatting):

    "Please upload a valid ${tutor.subject} syllabus."

    Do **not proceed** to roadmap generation if the text fails.

    ---

    ## ✅ Step 4: If Valid, Create Personalized Study Roadmap

    Use today’s date (**${new Date().toISOString().split('T')[0]}**) as the start date and **${deadline}** as the deadline.

    ---

    ### 👤 Student Profile

    - **Tone/Personality**: ${tutor.personality}
    - **Learning Style**: ${tutor.learningStyle}
    - **Study Pace**: ${tutor.pace}
    - **Personal Interests**: ${tutor.interests.length > 0 ? tutor.interests.join(', ') : "None provided"}
    - **Preferred Teaching Style**: ${tutor.personality}
    - **Language**: ${tutor.language}

    ---

    ### 📝 Learning Summary

    "${tutor.studentSummary}"

    Use this summary to align the roadmap with the student’s needs and style.

    --- 

    ### **Step 3: Generate JSON Response**
    Return a **well-formatted JSON object** adhering to the schema below. **Include only the JSON—no additional text, markdown, or explanations.**
    
    #### **Schema Explanation**
    The JSON must match this structure exactly:
    
    - **subject** (String, Required): Set to **${tutor.subject}**.
    - **deadline** (Date, Required): Set to **${deadline}** in "YYYY-MM-DD" format (e.g., "2025-04-15").
    
    - **roadmap** (Object, Required):
      - **overview** (String, Required): A personalized summary of the plan in **${tutor.personality}** tone, reflecting the student’s learning style and pace (e.g., "Hey! This visual plan is for you!").
      - **key_topics** (Array, Required): List of topics from the syllabus:
        - **topic** (String, Required): Topic name (e.g., "Algebra").
        - **priority** (Enum: "High" | "Medium" | "Low", Required): Assign based on importance (e.g., core topics = "High").
        - **difficulty** (Enum: "Easy" | "Medium" | "Hard", Required): Estimate complexity (e.g., "Calculus" = "Hard").
        - **description** (String, Required): Brief topic explanation in **${tutor.language}**.
        - **estimated_time** (String, Required): Total time needed (e.g., "4 hours").
        - **resources** (Array, Required): At least one resource per topic:
          - **type** (String, Required): "book", "video", "article", etc.
          - **title** (String, Required): Resource name (e.g., "NCERT Math").
          - **url** (String, Optional): Link if available; otherwise, null.
    
      - **weekly_study_plans** (Array, Required): Divide the period into weeks:
        - **week** (Number, Required): Sequential number (e.g., 1, 2, 3).
        - **dates** (String, Required): Week range in "YYYY-MM-DD to YYYY-MM-DD" format (e.g., "2025-04-01 to 2025-04-07").
        - **goals** (Array, Required): Weekly objectives (e.g., "Master linear equations").
        - **milestones** (Array, Required): Achievements (e.g., "Solve 10 problems").
        - **activities** (Array, Required): Tasks for the week:
          - **title** (String, Required): Activity name (e.g., "Read Chapter 1").
          - **description** (String, Required): Details in **${tutor.language}** and **${tutor.personality}** tone.
          - **estimated_time** (String, Required): Time needed (e.g., "2 hours").
    
      - **daily_study_plan** (Array, Required): Daily schedule from today to deadline:
        - **date** (Date, Required): Day in "YYYY-MM-DD" format (e.g., "2025-04-01").
        - **tasks** (Array, Required): Tasks for that day:
          - **taskInfo** (ObjectId, Optional): Omit this field (not populated in initial roadmap).
          - **title** (String, Required): Task name (e.g., "Watch Algebra Video").
          - **description** (String, Required): Details in **${tutor.language}** and **${tutor.personality}** tone.
          - **estimated_time** (String, Required): Duration (e.g., "1:30 hours").
          - **status** (Enum: "Pending" | "In Progress" | "Completed", Required): Default to "Pending".
          - **year** (String, Required): Extract from "date" (e.g., "2025").
          - **month** (String, Required): Extract from "date" (e.g., "04").
          - **day** (String, Required): Extract from "date" (e.g., "01").
          - **time** (String, Required): Preferred study time from **${tutor.studentSummary}** in "HH:MM am/pm" format (e.g., "07:00 pm").
    
      - **resources** (Object, Required): General resources (empty arrays if none):
        - **books** (Array, Optional): List of book titles.
        - **articles** (Array, Optional): List of article titles.
        - **videos** (Array, Optional): List of video titles.
        - **online_courses** (Array, Optional): List of course titles.
    
      - **learning_strategies** (Object, Required): Set based on **${tutor.studentSummary}** and **${tutor.learningStyle}**:
        - **spaced_repetition** (Boolean, Required): True if repetition helps (e.g., for slow pace).
        - **active_recall** (Boolean, Required): True if recalling aids retention.
        - **pomodoro** (Boolean, Required): True if focused intervals suit the student.
        - **notes** (Boolean, Required): True for "Reading/Writing" learners.
        - **group_study** (Boolean, Required): True if collaborative learning is preferred.
    
      - **progress_tracking** (Object, Required):
        - **completed_topics** (Array, Required): Initially empty.
        - **pending_topics** (Array, Required): List all "key_topics.topic" values.
        - **assessments** (Array, Required): At least one entry:
          - **date** (Date, Required): Deadline date in "YYYY-MM-DD" format.
          - **score** (Number, Required): Initially 0.
    
      - **tutor_support** (Object, Optional): Include with defaults or omit:
        - **tutor_name** (String, Optional): Tutor’s name if provided.
        - **contact** (String, Optional): Contact info if available.
        - **sessions** (Array, Optional): Empty array or list planned sessions:
          - **date** (Date, Optional): Session date in "YYYY-MM-DD" format.
          - **topic** (String, Optional): Session focus.
          - **notes** (String, Optional): Additional details.
    
    ---
    
    ### **Key Instructions**
    1. **Date Formatting**:
       - Use "YYYY-MM-DD" for all "date" fields (e.g., "deadline", "daily_study_plan.date", "assessments.date").
       - For "daily_study_plan.tasks", split "date" into "year", "month", "day" as strings (e.g., "2025", "04", "01").
       - Use "HH:MM am/pm" for "time" (e.g., "07:00 pm").
    
    2. **Personalization**:
       - Reflect **${tutor.learningStyle}** in resource types and activity descriptions.
       - Adjust workload based on **${tutor.pace}** (e.g., fewer tasks/day for "Slow").
       - Incorporate **${tutor.interests}** into examples or resources (e.g., tech-related for "technology").
       - Use **${tutor.personality}** tone consistently.
    
    3. **Scheduling**:
       - Distribute topics across "weekly_study_plans" and "daily_study_plan" realistically.
       - Align task times with the student’s preferred time from **${tutor.studentSummary}**.
       - Include review sessions or mock tests before the deadline if time allows.
    
    4. **JSON Output**:
       - Return **only the JSON object** (e.g., {"subject": ...}).
       - Ensure it is parseable by 'JSON.parse()'.
       - Validate all required fields are present and correctly typed.
    
    ---
    
    ### **Example Skeleton (For Reference, Do Not Include in Response)**
    {
      "subject": "${tutor.subject}",
      "deadline": "${deadline}",
      "roadmap": {
        "overview": "Personalized message here",
        "key_topics": [{"topic": "Sample", "priority": "High", "difficulty": "Medium", "description": "Details", "estimated_time": "4 hours", "resources": [{"type": "book", "title": "Sample Book", "url": null}]}],
        "weekly_study_plans": [{"week": 1, "dates": "2025-04-01 to 2025-04-07", "goals": ["Goal"], "milestones": ["Milestone"], "activities": [{"title": "Task", "description": "Details", "estimated_time": "2 hours"}]}],
        "daily_study_plan": [{"date": "2025-04-01", "tasks": [{"title": "Task", "description": "Details", "estimated_time": "1 hour", "status": "Pending", "year": "2025", "month": "04", "day": "01", "time": "07:00 pm"}]}],
        "resources": {"books": [], "articles": [], "videos": [], "online_courses": []},
        "learning_strategies": {"spaced_repetition": false, "active_recall": true, "pomodoro": false, "notes": true, "group_study": false},
        "progress_tracking": {"completed_topics": [], "pending_topics": ["Sample"], "assessments": [{"date": "${deadline}", "score": 0}]},
        "tutor_support": {"tutor_name": "Tutor", "contact": "email@example.com", "sessions": []}
      }
    }
    
    ---
    
    ### **Final Notes**
    - Ensure the roadmap is achievable within the timeframe, prioritizing "High" topics if the deadline is tight.
    - Double-check that all required fields are populated and enums ("priority", "difficulty", "status") use valid values.
    - Use the examples from the original prompt as inspiration, but adapt dates, times, and content to the current context.
    
    **Return only the JSON object matching the schema when responding.**
`
};