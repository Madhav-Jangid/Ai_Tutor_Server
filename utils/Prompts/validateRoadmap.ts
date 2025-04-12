
export default function validateRoadmap(tutor: any): string {
    return `
          You are given a piece of text extracted from a document. Your task is to determine if this text is a valid syllabus for the subject: "${tutor.subject}".
  
          Please carefully analyze the content and check if it clearly outlines topics, units, or chapters typically found in a syllabus for "${tutor.subject}".
  
          Only return:
          - true if the document is a valid syllabus for "${tutor.subject}"
          - false if it is not a valid syllabus, or if it is unclear, incomplete, or belongs to a different subject.
  
          Do not return anything else. Return only a valid JSON boolean.
      `
}
