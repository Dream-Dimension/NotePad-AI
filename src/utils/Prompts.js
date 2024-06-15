import { v4 as uuidv4 } from 'uuid';
export const BasePrompts = [
    { id: uuidv4(), text: 'Please provide useful actionable feedback or points to consider' },
    { id: uuidv4(), text: 'Provide a detailed analysis of the text' },
    { id: uuidv4(), text: 'Summarize the main points' },
    { id: uuidv4(), text: 'Offer suggestions for improvement' },
    { id: uuidv4(), text: 'Highlight the strengths of the text' },
    { id: uuidv4(), text: 'Highlight the weaknesses of the text' },
    { id: uuidv4(), text: 'Highlight the weaknesses of the text, use a friendly tone' },
    { id: uuidv4(), text: 'Can you please break down each task into more manageable actionable sub-tasks' }
  ];
  