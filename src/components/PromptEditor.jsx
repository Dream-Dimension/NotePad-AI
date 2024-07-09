import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { v4 as uuidv4 } from 'uuid';
import { BasePrompts } from '../utils/Prompts';

const PromptEditor = ({ setBasePrompt }) => {
  const [prompts, setPrompts] = useState([]);
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const storedPrompts = JSON.parse(localStorage.getItem('prompts'));
    const storedSelectedPromptId = localStorage.getItem('selectedPromptId');

    if (storedPrompts && storedPrompts.length > 0) {
      setPrompts(storedPrompts);
      if (storedSelectedPromptId) {
        const storedSelectedPrompt = storedPrompts.find(prompt => prompt.id === storedSelectedPromptId);
        if (storedSelectedPrompt) {
          setSelectedPrompt(storedSelectedPrompt);
          setBasePrompt(storedSelectedPrompt.text);
        }
      } else {
        setSelectedPrompt(storedPrompts[0]);
        setBasePrompt(storedPrompts[0].text);
      }
    } else {
      setPrompts(BasePrompts);
      savePrompts(BasePrompts);
      setSelectedPrompt(BasePrompts[0]);
      setBasePrompt(BasePrompts[0].text);
    }
  }, [setBasePrompt]);

  const savePrompts = (newPrompts) => {
    setPrompts(newPrompts);
    localStorage.setItem('prompts', JSON.stringify(newPrompts));
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
    }, 1000);
  };

  const handleSelectChange = (selectedOption) => {
    if (selectedOption && selectedOption.value === 'add_new_prompt') {
      const newPrompt = { id: uuidv4(), text: 'My new base prompt...' + (prompts.length + 1) };
      const updatedPrompts = [...prompts, newPrompt];
      savePrompts(updatedPrompts);
      setSelectedPrompt(newPrompt);
      setBasePrompt(newPrompt.text);
      setIsEditing(true);
      localStorage.setItem('selectedPromptId', newPrompt.id);
    } else {
      const selected = prompts.find(prompt => prompt.id === selectedOption.value);
      setSelectedPrompt(selected);
      setBasePrompt(selected.text);
      localStorage.setItem('selectedPromptId', selected.id);
    }
  };

  const handlePromptChange = (e) => {
    const updatedText = e.target.value;
    const updatedPrompts = prompts.map(prompt =>
      prompt.id === selectedPrompt.id ? { ...prompt, text: updatedText } : prompt
    );
    const updatedSelectedPrompt = { ...selectedPrompt, text: updatedText };
    setSelectedPrompt(updatedSelectedPrompt);
    setBasePrompt(updatedText);
    savePrompts(updatedPrompts);
    localStorage.setItem('selectedPromptId', updatedSelectedPrompt.id);
  };

  const deletePrompt = (promptToDelete) => {
    const updatedPrompts = prompts.filter(prompt => prompt.id !== promptToDelete.id);
    savePrompts(updatedPrompts);
    if (selectedPrompt && selectedPrompt.id === promptToDelete.id) {
      if (updatedPrompts.length > 0) {
        setSelectedPrompt(updatedPrompts[0]);
        setBasePrompt(updatedPrompts[0].text);
        localStorage.setItem('selectedPromptId', updatedPrompts[0].id);
      } else {
        setSelectedPrompt(null);
        setBasePrompt('');
        localStorage.removeItem('selectedPromptId');
      }
    }
  };

  const promptOptions = [
    ...prompts.map(prompt => ({ value: prompt.id, label: prompt.text, text: prompt.text })),
    { value: 'add_new_prompt', label: 'Add New Base Prompt' }
  ];

  return (
    <div className="prompt-editor">
      <div className="select-container">
        <Select
          value={selectedPrompt ? { value: selectedPrompt.id, label: selectedPrompt.text } : null}
          onChange={handleSelectChange}
          options={promptOptions}
          placeholder="Select a base prompt"
          getOptionLabel={option => option.label}
          getOptionValue={option => option.value}
        />
      </div>
      <button onClick={() => setIsEditing(!isEditing)}>
        {isEditing ? 'Hide Base Prompt Editor' : 'Edit Base Prompt'}
      </button>
      <button onClick={() => deletePrompt(selectedPrompt)}>Delete Base Prompt</button>
      {isEditing && (
        <div className="editor-container">
          <textarea
            rows={4}
            value={selectedPrompt ? selectedPrompt.text : ''}
            onChange={handlePromptChange}
          />
        </div>
      )}
      {isSaving && <div className="saving-message">Saving...</div>}
    </div>
  );
};

export default PromptEditor;
