import React, { useState, useEffect, useCallback } from 'react';
import IndexedDBUtil from './utils/DataStore';
import CircleLoader from "react-spinners/CircleLoader";
import './App.css';
import HistoryEntry from './components/HistoryEntry';
import PromptEditor from './components/PromptEditor';
import OpenAI from "openai";
import { initGA, logEvent, logPageView } from './ga'; // Import Google Analytics functions
import { extractArrayFromText } from './utils/Prompts';
import { v4 as uuidv4 } from 'uuid';

const Groq = require("groq-sdk");

const PLATFORM_OPENAI = 'openai';
const PLATFORM_GROQ = 'groq';
const KEY_OPENAI = 'openaiKey';
const KEY_GROQ = 'grokKey';
const ENTRIES_PER_PAGE = 5;
const INITIAL_PAGE = 1;
const APP_VERSION = 'v.0.0.1';

const historyDb = new IndexedDBUtil('SecondaryDb2', 'HistoryStore2');
const mainTextDb = new IndexedDBUtil('CoreDb2', 'MainText2');

const groqModels = [
  { id: 'llama3-8b-8192', name: 'LLaMA3 8b' },
  { id: 'llama3-70b-8192', name: 'LLaMA3 70b' },
  { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7b' },
  { id: 'gemma-7b-it', name: 'Gemma 7b' },
  { id: 'whisper-large-v3', name: 'Whisper - Private beta only' }
];

async function askGroq(groqInstance, prompt = '', model) {
  try {
    logEvent('Interaction', 'askGroq', model); // Log event
    const response = await groqInstance.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      model: model || "mixtral-8x7b-32768"
    });

    return response?.choices[0]?.message?.content || "";
  } catch (e) {
    if (e.status === 429) {
      throw new Error('Too many requests. Please try again later.');
    }
    console.log('e', e);
    throw new Error('An unexpected error occurred.');
  }
}

async function askOpenAI(openaiInstance, prompt = '', model) {
  try {
    logEvent('Interaction', 'askOpenAI', model); // Log event
    const response = await openaiInstance.chat.completions.create({
      model: model || "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant"
        },
        {
          role: "user",
          content: prompt
        }
      ],
      // temperature: 0.7,
      // max_tokens: 64,
      top_p: 1,
    });
    return response.choices[0].message.content;
  } catch (e) {
    if (e.response && e.response.status === 429) {
      throw new Error('Too many requests. Please try again later.');
    }
    console.log('Error:', e);
    throw new Error('An unexpected error occurred.');
  }
}

function App() {
  const [selectedText, setSelectedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [promptHistory, setPromptHistory] = useState([]);
  const [basePrompt, setBasePrompt] = useState(null);
  const [inputText, setInputText] = useState('');
  const [statusText, setStatusText] = useState('');
  const [lastProcessedMsg, setLastProcessedMsg] = useState('');
  const [error, setError] = useState(null);
  const [groqInstance, setGroqInstance] = useState(null);
  const [openaiInstance, setOpenaiInstance] = useState(null);
  const [grokKey, setGrokKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [platform, setPlatform] = useState(PLATFORM_OPENAI);
  const [selectedOpenAIModel, setSelectedOpenAIModel] = useState('gpt-3.5-turbo');
  const [selectedGroqModel, setSelectedGroqModel] = useState(groqModels[0].id);
  const [timerId, setTimerId] = useState(null);
  const [savingStatus, setSavingStatus] = useState(APP_VERSION);
  const [currentPage, setCurrentPage] = useState(INITIAL_PAGE);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [showNonResultsPageWarning,  setShowNonResultsPageWarning] = useState(false);

  useEffect(() => {
    // We want to show the warning if a new result was generated
    // and we have not gone to the first page yet to see it.

    if (currentPage != INITIAL_PAGE) {
      if (loading) {
        setShowNonResultsPageWarning(true);
      }
    } else {
      // We are back on the main page so we've likely seen the new entry:
      setShowNonResultsPageWarning(false);

    }
  }, [loading, currentPage]);

  useEffect(() => {
    const storedPlatform = localStorage.getItem('platform') || PLATFORM_OPENAI;
    const storedGrokKey = localStorage.getItem(KEY_GROQ);
    const storedOpenaiKey = localStorage.getItem(KEY_OPENAI);
    const storedOpenAIModel = localStorage.getItem('openaiModel') || 'gpt-3.5-turbo';
    const storedGroqModel = localStorage.getItem('groqModel') || groqModels[0].id;

    if (storedPlatform) setPlatform(storedPlatform);
    if (storedOpenAIModel) setSelectedOpenAIModel(storedOpenAIModel);
    if (storedGroqModel) setSelectedGroqModel(storedGroqModel);

    const loadInstances = async () => {
      if (storedGrokKey) {
        const newGroqInstance = new Groq({
          dangerouslyAllowBrowser: true,
          apiKey: storedGrokKey
        });
        setGrokKey(storedGrokKey);
        setGroqInstance(newGroqInstance);
      }
      if (storedOpenaiKey) {
        const newOpenaiInstance = new OpenAI({
          apiKey: storedOpenaiKey,
          dangerouslyAllowBrowser: true 
        });
        setOpenaiKey(storedOpenaiKey);
        setOpenaiInstance(newOpenaiInstance);
      }
    };

    loadInstances();

    if (!storedGrokKey && !storedOpenaiKey) {
      setSettingsVisible(true);
    }

    async function loadHistory() {
      try {
        const history = await historyDb.getAll();
        const { mainText } = await mainTextDb.get();
        setPromptHistory(history);
        setInputText(mainText ?? '');
      } catch (e) {
        console.log('error getting from db:', e);
      }
    }

    (async () => {
      await loadHistory();
    })();

    return () => {
      // Ensure the database is closed when the component unmounts
    };
  }, []);

  useEffect(() => {
    initGA();
    logPageView(); // Log the page view
  }, []);

  const evaluateChange = useCallback(async (newText) => {
    if (newText.trim() && newText !== lastProcessedMsg) {
      setStatusText('Processing...')
      const isSignificant = await checkChangeSignificance(lastProcessedMsg, newText);
      setStatusText(isSignificant ? 'Detected significant change. Analyzing...' : 'Text seems about the same as before.');

      if (isSignificant) {
        analyzeText(newText);
      }
    }
  }, [lastProcessedMsg]);

  const handleInputChange = useCallback((e) => {
    console.log('input detected');
    setInputText(e.target.value);
    if (timerId) clearTimeout(timerId); // Clear the previous timer
    
    const newTimerId = setTimeout(() => {
      try {
        mainTextDb.set({
          mainText: e.target.value
        }).then(() => {
          setSavingStatus('Saved.');
          setTimeout(() => setSavingStatus(' .'), 2000); // Clear status message after x seconds
        });

      } catch (error) {
        setError(error?.message);
      }
    }, 2000); // Evaluate change after user has stopped typing for x milliseconds
    setTimerId(newTimerId);
  }, [timerId, evaluateChange]);

  const checkChangeSignificance = async (oldText, newText) => {
    const trimmedOldText = oldText.trim();
    const trimmedNewText = newText.trim();

    const prompt = `Is the change in text significant (respond with "yes" or "no")?  Old Text: "${trimmedOldText}" \n New Text: "${trimmedNewText}"`;
    const msg = platform === PLATFORM_GROQ
      ? await askGroq(groqInstance, prompt, selectedGroqModel)
      : await askOpenAI(openaiInstance, prompt, selectedOpenAIModel);

    const isSignificantChange = msg.toLowerCase().indexOf('yes') >= 0;
    return isSignificantChange;
  };


  const getFullContext = (parentId, contextSettings) => {

    const { 
      includeText = false,
      includePrompt = false,
      includePastResults = false,
      maxHistory = 10
    } = contextSettings ?? {};

  
    if (!(includeText || includePrompt || includePastResults)) {
      return '';
    }

    let currId = parentId;
    let count = 0;
    let contextStr = '';
    // TODO: maybe create an array of strings and then reverse().join(' ');
    while (currId != null && count++ < maxHistory) {
      const curr =  promptHistory.find(x => { return x.id == currId}); 
      console.log('curr', curr);
      
    
      if (includePrompt) {
        contextStr += curr?.prompt ?? '';        
      }
      if (includeText) {
        contextStr += curr?.text ?? '';
      }

      if (includePastResults) {
        contextStr += curr?.fullAnalysis ?? '';
      }
      contextStr += ' ';
      currId = curr?.parentId; // move towards previous grandparent, etc.
      
    }
    
    return `Context History: ${contextStr}`;
  }
  const analyseTextBasedOnPrompt = async (prompt = '', text  = '', parentId = null, contextSettings ) => {
    setLoading(true);
    setError(null); // Clear any previous error
    try {
      let moreContext = getFullContext(parentId, contextSettings);
      console.log('moreContext', moreContext);
      const composedPrompt = `${prompt}: ${text}${moreContext}`;
      const fullAnalysis = platform === PLATFORM_GROQ
        ? await askGroq(groqInstance, composedPrompt, selectedGroqModel)
        : await askOpenAI(openaiInstance, composedPrompt, selectedOpenAIModel);
      setStatusText('Generating summary...');
      const summaryPrompt = 'Please summarize this in one or two sentences (friendly tone): ';
      const summary = platform === PLATFORM_GROQ
        ? await askGroq(groqInstance, `${summaryPrompt}${fullAnalysis}`, selectedGroqModel)
        : await askOpenAI(openaiInstance, `${summaryPrompt}${fullAnalysis}`, selectedOpenAIModel);
      
      setStatusText('Generating follow up questions');
      // Follow up questoins probably okay to not enable extra context, but option is there:gi
      const followUpQuestionsPrompt = 'Can you please (only provide a JSON array of strings like ["prompt 1", "prompt 2"]) generate 5 follow up prompts:';
      const queryFollowUpQuestions = `${followUpQuestionsPrompt}, Context: ${text} ${moreContext}`;
      const followUpQuestionsPromptsStr = platform === PLATFORM_GROQ
        ? await askGroq(groqInstance, queryFollowUpQuestions, selectedGroqModel)
        : await askOpenAI(openaiInstance, queryFollowUpQuestions, selectedOpenAIModel);
      const followUpQuestions = extractArrayFromText(followUpQuestionsPromptsStr);
      setStatusText('Finished analyzing.');

      const historyEntry = {
        id: uuidv4(),
        parentId,
        prompt, 
        text,
        summary,
        fullAnalysis,
        platform,
        model: platform === PLATFORM_GROQ ? selectedGroqModel : selectedOpenAIModel,
        timestamp: Date.now(),
        followUpQuestions
      };

      await historyDb.add(historyEntry);
      setPromptHistory([historyEntry, ...promptHistory]);
      setLastProcessedMsg(text);
    } catch (error) {
      setError(error?.message);
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }
  const analyzeText = async (text) => {
    if (text.trim() === '') {
      setStatusText('There is nothing to analyze.');
      return;
    }

    return await analyseTextBasedOnPrompt(basePrompt, text);
  };

  useEffect(() => {
    // Cleanup timer on component unmount
    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, [timerId]);

  const handleTextSelect = useCallback(() => {
    const selectedText = window.getSelection().toString();
    setSelectedText(selectedText);
  }, []);

  // Debounce function for same key presses
  function debounceForSameKey(func, delay) {
    let timeoutId;
    let lastKey = null;

    return function (event) {
      const currentKey = event.key;

      if (event.ctrlKey) {
        if (currentKey === lastKey) {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            func.apply(this, arguments);
          }, delay);
        } else {
          lastKey = currentKey;
          func.apply(this, arguments);
        }
      }
    };
  }

  function handleKeyDown(event) {
    if (event.ctrlKey) {
      switch (event.key) {
        case 'b':
        case 'B':
          console.log('Ctrl + b was pressed. Full Text');
          analyzeText(inputText);
          break;
        case 'p':
        case 'P':
          console.log('Ctrl + p was pressed. Selected text:', selectedText);
          if (selectedText?.length > 0) {
            analyzeText(selectedText);
          } else {
            console.warn('No selected text');
            setError('Please select some text first.');
          }
          break;
        default:
          break;
      }
    }
  }

  useEffect(() => {
    const debouncedHandleKeyDown = debounceForSameKey(handleKeyDown, 300);
    document.addEventListener('keydown', debouncedHandleKeyDown);

    return () => {
      document.removeEventListener('keydown', debouncedHandleKeyDown);
    };
  }, [selectedText, inputText, lastProcessedMsg]);

  const handlePlatformChange = (event) => {
    const selectedPlatform = event.target.value;
    setPlatform(selectedPlatform);
    localStorage.setItem('platform', selectedPlatform);
  };

  const handleKeyChange = (event) => {
    if (platform === PLATFORM_GROQ) {
      setGrokKey(event.target.value);
    } else {
      setOpenaiKey(event.target.value);
    }
  };

  const handleKeySubmit = () => {
    if (platform === PLATFORM_GROQ) {
      if (grokKey.trim() !== '') {
        localStorage.setItem(KEY_GROQ, grokKey);
        const newGroqInstance = new Groq({
          dangerouslyAllowBrowser: true,
          apiKey: grokKey
        });
        setGroqInstance(newGroqInstance);
        setSettingsVisible(false);
      } else {
        setError('Please provide a valid Grok API key.');
      }
    } else {
      if (openaiKey.trim() !== '') {
        localStorage.setItem(KEY_OPENAI, openaiKey);
        const newOpenaiInstance = new OpenAI({
          apiKey: openaiKey,
          dangerouslyAllowBrowser: true
        });
        setOpenaiInstance(newOpenaiInstance);
        setSettingsVisible(false);
      } else {
        setError('Please provide a valid OpenAI API key.');
      }
    }
  };

  const handleOpenAIModelChange = (e) => {
    const model = e.target.value;
    setSelectedOpenAIModel(model);
    localStorage.setItem('openaiModel', model);
  };

  const handleGroqModelChange = (e) => {
    const model = e.target.value;
    setSelectedGroqModel(model);
    localStorage.setItem('groqModel', model);
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const displayedHistory = promptHistory.slice(
    (currentPage - 1) * ENTRIES_PER_PAGE,
    currentPage * ENTRIES_PER_PAGE
  );

  const totalPages = Math.ceil(promptHistory.length / ENTRIES_PER_PAGE);


  const getParentEntry = async (parentId) => {
    try {
      const parent = promptHistory.find(entry => entry.id === parentId);
      return parent;
    } catch (error) {
      console.error('Error fetching parent entry:', error);
      return null;
    }
  };
  
  return (
    <div className="app">
      
      
      {showNonResultsPageWarning? 
        <div className="top-fixed-item"> <div className="warning-page">
           Warning: results will appear on page <button onClick={() => { setCurrentPage(1)}}> {INITIAL_PAGE} </button> but you are on page {currentPage}. 
           <button onClick={() => {setShowNonResultsPageWarning(false)}}> Dismiss </button> </div>
        </div>
         : 
         null}
      
      {loading && <div className="top-fixed-item">
       <CircleLoader
              color={"#000"}
              loading={loading}
              size={30}
              aria-label="Loading Spinner"
              data-testid="loader"
        />
      </div>}


      <div className="settings-button" onClick={() => setSettingsVisible(!settingsVisible)}>
        Settings
      </div>
      {settingsVisible && (
        <div className="settings-menu">
          <label htmlFor="platform-select">Choose Platform:</label>
          <select id="platform-select" value={platform} onChange={handlePlatformChange}>
            <option value={PLATFORM_GROQ}>Groq</option>
            <option value={PLATFORM_OPENAI}>OpenAI</option>
          </select>
          <label htmlFor="api-key-input">
            {platform === PLATFORM_GROQ ? 'Grok' : 'OpenAI'} API Key:
          </label>
          <input
            id="api-key-input"
            type="text"
            value={platform === PLATFORM_GROQ ? grokKey : openaiKey}
            onChange={handleKeyChange}
          />
          <button onClick={handleKeySubmit}>Submit</button>
          {error && <div className="error-message">{error}</div>}
        </div>
      )}
      
      {!settingsVisible && (
        <>
          <div className="input-container">
            <div className="saving-status">{savingStatus}</div>
            <textarea
              className='user-text'
              value={inputText}
              onChange={handleInputChange}
              onSelect={handleTextSelect}
              placeholder="Type your text here..."
            />
          </div>


          <div className="feedback-container">
            <button onClick={() => {
              console.log("re-analyze", inputText);
              analyzeText(inputText);
            }}>Analyze (Ctrl + b)</button>
            <button
              disabled={!(selectedText?.length > 0)}
              onClick={() => {
                console.log("analyze selected text");
                analyzeText(selectedText);
              }}>Analyze Selected Text (Ctrl + p)</button>

            <PromptEditor
              setBasePrompt={setBasePrompt}
            />

            <CircleLoader
              color={"#000"}
              loading={loading}
              size={30}
              aria-label="Loading Spinner"
              data-testid="loader"
            />
            {error && <div className="error-message">{error}</div>} {/* Display the error message */}
            <div>{statusText}</div>

            <div className="model-selection-container">
              {platform === PLATFORM_OPENAI && (
                <div>
                  <label className="model-selection-label" htmlFor="openai-model-select">Choose OpenAI Model: </label>
                  <select
                    id="openai-model-select"
                    value={selectedOpenAIModel}
                    onChange={handleOpenAIModelChange}
                  >
                    <option value="gpt-4o">gpt-4o</option>
                    <option value="gpt-4">gpt-4</option>
                    <option value="gpt-4-turbo">gpt-4-turbo</option>
                    <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
                  </select>
                </div>
              )}

              {platform === PLATFORM_GROQ && (
                <div>
                  <label className="model-selection-label" htmlFor="groq-model-select">Choose Groq Model:</label>
                  <select
                    id="groq-model-select"
                    value={selectedGroqModel}
                    onChange={handleGroqModelChange}
                  >
                    {groqModels.map(model => (
                      <option key={model.id} value={model.id}>{model.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div id='history-container'>
              <h1 id='history-header'>History: </h1>
              {displayedHistory.map((entry, index) => {
          
                const handleQuestionClicked = async (entry, question) => {
                  const promptContext = `Context: ${entry.fullAnalysis}`;
                  await analyseTextBasedOnPrompt(question, promptContext, entry.id);
                }

                const handleUserFollowUp = async (userFollowUpPrompt) => {
                  await analyseTextBasedOnPrompt(null, userFollowUpPrompt, entry.id, {
                    includeText: false,
                    includePrompt: false,
                    includePastResults: true 
                  });
                  const section = document.getElementById('history-header');
                  section.scrollIntoView({ behavior: 'smooth' });

                };

                return (
                  <div key={'history-' + index}>
                    <HistoryEntry 
                      entry={entry}          
                      getParentEntry={getParentEntry}   
                      handleQuestionClicked={handleQuestionClicked}
                      onUserFollowUp={handleUserFollowUp} />
                    <hr />
                  </div>
                );
              })}

              <div className="pagination">
                {Array.from({ length: totalPages }, (_, index) => (
                  <button
                    key={index}
                    onClick={() => handlePageChange(index + 1)}
                    disabled={index + 1 === currentPage}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
