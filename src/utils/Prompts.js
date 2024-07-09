import { v4 as uuidv4 } from 'uuid';
export const BasePrompts = [
    { id: uuidv4(), text: 'Please be helpful.' },
    { id: uuidv4(), text: 'Please provide useful actionable feedback or points to consider' },
    { id: uuidv4(), text: 'Provide a detailed analysis of the text' },
    { id: uuidv4(), text: 'Summarize the main points' },
    { id: uuidv4(), text: 'Offer suggestions for improvement' },
    { id: uuidv4(), text: 'Highlight the strengths of the text' },
    { id: uuidv4(), text: 'Highlight the weaknesses of the text' },
    { id: uuidv4(), text: 'Highlight the weaknesses of the text, use a friendly tone' },
    { id: uuidv4(), text: 'Can you please break down each task into more manageable actionable sub-tasks' }
  ];
  

  export const extractArrayFromText = (text) => {
    try {
      // Use a regular expression to extract the JSON array part from the text
      const arrayMatch = text.match(/\[\s*("[^"]*"(?:\s*,\s*"[^"]*")*)\s*\]/);
  
      if (arrayMatch && arrayMatch[0]) {
        // Parse the extracted JSON array string
        const array = JSON.parse(arrayMatch[0]);
        return array;
      } else {
        console.error('No JSON array found in the text.');
        return []
      }
    } catch (error) {
      console.error('Error extracting JSON array:', error.message);
      return [];
    }
  }
  
