import React, { useState, useEffect } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { prism } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';

/** The goal of this component is to render code blocks mixed in with regular text.
 * We want to parse markdownText so it creates a list of blocks. A block can be a piece of code or regular text.
 * If it it's regular text, we will pass it to ReactMarkdown, otherwise we pass it to SyntaxHighlighter.
 * So in the end we will have code blocks interweaved with regular text.
 */
const FullAnalysis = ({ markdownText }) => {
    
  const [blocks, setBlocks] = useState([]);

  const parseMarkdown = (text) => {
    const tickMarkIndices = [];
    let currentIndex = 0;
    while ((currentIndex = text.indexOf('```', currentIndex)) !== -1) { tickMarkIndices.push(currentIndex);
    currentIndex += 3; // skip the tick marks
  }

  let startIndex = 0;
  for (let i = 0; i < tickMarkIndices.length; i++) {
    const endIndex = tickMarkIndices[i];
    const block = text.substring(startIndex, endIndex);
    blocks.push({ type: 'nonCode', content: block, index: i });
    startIndex = endIndex + 3; // skip the tick marks
    const codeBlock = text.substring(startIndex, tickMarkIndices[i + 1] || text.length);
    blocks.push({ type: 'code', content: codeBlock, index: i + 1 });
    startIndex = tickMarkIndices[i + 1] || text.length;
  }

  setBlocks(blocks);
};

React.useEffect(() => {
  parseMarkdown(markdownText);
}, [markdownText]);

if (true) {
    return <ReactMarkdown>{markdownText}</ReactMarkdown>
}
/*
return (
  <div>
    {blocks.map((block, index) => {
      if (block.type === 'nonCode') {
        return <ReactMarkdown key={index}>{block.content}</ReactMarkdown>;
      } else {
        const language = block.content.split('\n')[0].trim();
        const code = block.content.substring(language.length + 1);
        return (
          <div key={index}>
            <SyntaxHighlighter
              language={language}
              style={prism}
              showLineNumbers={true}
            >
              {code}
            </SyntaxHighlighter>
          </div>
        );
      }
    })}
  </div>
  
);
*/
};

export default FullAnalysis;
