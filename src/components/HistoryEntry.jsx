import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';

const CHAR_LIMIT = 100;

const HistoryEntry = ({ entry }) => {
  const [isExpanded, setIsExpanded] = useState({
    text: false,
    summary: true,
    fullAnalysis: true,
  });

  const toggleExpand = (section) => {
    setIsExpanded(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div id={entry.id}>
      <h2>Base Prompt</h2>
      <ReactMarkdown>{entry.prompt ?? "*None*"}</ReactMarkdown>
      <h2 onClick={() => toggleExpand('summary')}>Summary 
      <span style={{ fontSize: 'small', fontWeight: "normal", marginLeft: '8px', paddingTop: '5px', marginRight: "8px"}}>
          ({new Date(entry.timestamp).toLocaleString()})
      </span> 

      {isExpanded.summary ? '▼' : '◀'}</h2>
      <div>
        {isExpanded.summary ? <ReactMarkdown>{entry.summary}</ReactMarkdown> : `${entry.summary.substring(0, CHAR_LIMIT)}...`}
      </div>

      <h2 onClick={() => toggleExpand('fullAnalysis')}>Full Analysis (Result) {isExpanded.fullAnalysis ? '▼' : '◀'}</h2>
      <div>
        {isExpanded.fullAnalysis ? (
          <div>
            <ReactMarkdown>{entry.fullAnalysis}</ReactMarkdown>
            <p><strong>Platform:</strong> {entry.platform}</p>
            <p><strong>Model:</strong> {entry.model}</p>
          </div>
        ) : `${entry.fullAnalysis.substring(0, CHAR_LIMIT)}...`}
      </div>

      <h2 onClick={() => toggleExpand('text')} style={{ display: 'flex', alignItems: 'center' }}>
        Analyzed Text (Source)
        {isExpanded.text ? '▼' : '◀'}
      </h2>     
      <div>
        {isExpanded.text ? <ReactMarkdown>{entry.text}</ReactMarkdown> : `${entry.text.substring(0, CHAR_LIMIT)}...`}
      </div>
      <h2> Follow Up Questions </h2>
      <div>
        {entry.followUpQuestions?.map((question, idx) => (
          <div> 
            <button key={idx} onClick={question.callback}>
              {question.text}
            </button>
          </div>
        ))}
      </div>
      { 
        entry.parentId ? <div>
          <a href={'#' + entry.parentId }>Go to Parent </a>
        </div> : null
      }

    </div>
  );
};

export default HistoryEntry;
