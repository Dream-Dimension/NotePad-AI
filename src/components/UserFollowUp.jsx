import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import CircleLoader from "react-spinners/CircleLoader";

function UserFollowUp({ onUserFollowUp }) {
  const [userFollowUp, setUserFollowUp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const textareaRef = useRef(null);

  const handleUserFollowUpSubmit = async () => {
    if (userFollowUp.trim()) {
      setLoading(true);
      setError(null);
      try {
        await onUserFollowUp(userFollowUp);
        setUserFollowUp('');
      } catch (err) {
        setError('An error occurred while processing your follow-up question.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleKeyPress = (event) => {
    if (event.ctrlKey && event.key === 'Enter') {
      handleUserFollowUpSubmit();
    }
  };

  useEffect(() => {
    const textarea = textareaRef.current;
    textarea.addEventListener('focus', () => {
      textarea.addEventListener('keydown', handleKeyPress);
    });
    textarea.addEventListener('blur', () => {
      textarea.removeEventListener('keydown', handleKeyPress);
    });
    return () => {
      textarea.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);

  return (
    <div className="user-follow-up">
      <textarea 
        ref={textareaRef}
        value={userFollowUp} 
        onChange={(e) => setUserFollowUp(e.target.value)} 
        disabled={loading}
        rows={3} 
      />
      <button onClick={handleUserFollowUpSubmit} disabled={loading}>
        Ask
      </button>
      {loading && <CircleLoader color={"#36D7B7"} loading={loading} />}
      {error && <p className="error-text">{error}</p>}
      <p className="character-count">{userFollowUp.length}/500 characters</p>
    </div>
  );
}

UserFollowUp.propTypes = {
  onUserFollowUp: PropTypes.func.isRequired,
};

export default UserFollowUp;