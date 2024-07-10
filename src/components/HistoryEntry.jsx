import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import PropTypes from 'prop-types';
import UserFollowUp from './UserFollowUp';
import FullAnalysis from './FullAnalysis';
import Modal from 'react-modal';

const CHAR_LIMIT = 100;

const REMINDER_WHERE_RESULTS_SHOW = 'Remember, new results appear at the top of the history panel.';
const HistoryEntry = ({ entry, handleQuestionClicked, onUserFollowUp, getParentEntry }) => {
  const [msg, setMsg] = useState(null);
  const [isExpanded, setIsExpanded] = useState({
    text: false,
    summary: true,
    fullAnalysis: true,
  });

  const [showRaw, setShowRaw] = useState({
    text: false,
    summary: false,
    fullAnalysis: false,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [parentEntry, setParentEntry] = useState(null);

  const toggleExpand = (section) => {
    setIsExpanded(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleRaw = (section) => {
    setShowRaw((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleShowParent = async () => {
    const parent = await getParentEntry(entry.parentId);
    setParentEntry(parent);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setParentEntry(null);
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
        {isExpanded.summary ? <ReactMarkdown>{entry.summary}</ReactMarkdown> : `${entry.summary.slice(0, CHAR_LIMIT)}...`}
      </div>

      <h2 onClick={() => toggleExpand('fullAnalysis')}>Full Analysis Response {isExpanded.fullAnalysis ? '▼' : '◀'}</h2>
      <div>
        {isExpanded.fullAnalysis ? (
          <div>
          <button onClick={() => toggleRaw('fullAnalysis')}>{showRaw.fullAnalysis ? 'View Prettified' : 'View Raw Text'}</button>
          <br />
          {showRaw.fullAnalysis ? entry.fullAnalysis : <FullAnalysis markdownText={entry.fullAnalysis}/>}
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
          <div key={`follow-up${idx}`}> 
            <button onClick={async () => { 
              setMsg(REMINDER_WHERE_RESULTS_SHOW);
              await handleQuestionClicked(entry, question);
            }}>
              {question}
            </button>
          </div>
        ))}
      </div>

      {msg && <div className='status-msg'> {msg} </div>}

      <h2> Follow Up: </h2>
      <UserFollowUp  onUserFollowUp={async (...args) => { 
        setMsg(REMINDER_WHERE_RESULTS_SHOW);
         await onUserFollowUp.apply(args);
      }} />

      {entry.parentId != null ? <button onClick={handleShowParent}>View Parent Analysis</button> : <i> Has no parent analysis.</i>}
      <br />
      <br />
      <Modal
        isOpen={isModalOpen}
        onRequestClose={closeModal}
        contentLabel="Parent Entry"
      >
        <button onClick={closeModal}>Close</button>
        {parentEntry ? (
          <HistoryEntry entry={parentEntry} handleQuestionClicked ={handleQuestionClicked } onUserFollowUp={onUserFollowUp} getParentEntry={getParentEntry} />
        ) : (
          <p>Loading...</p>
        )}
        <button onClick={closeModal}>Close</button>

      </Modal>
    </div>
  );
}

HistoryEntry.propTypes = {
  entry: PropTypes.object.isRequired,
  handleQuestionClicked: PropTypes.func.isRequired, 
  onUserFollowUp: PropTypes.func.isRequired,
  getParentEntry: PropTypes.func.isRequired,
};

export default HistoryEntry;
