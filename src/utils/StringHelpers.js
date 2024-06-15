export const getStringAdditions = (oldStr, newStr) => {
    console.log('oldStr', oldStr);
    console.log('newStr', newStr);
    const tokenizeIntoWords = (str) => {
      return str.split(' ');
    }
  
    const createLookUpIndexes = (wordArr) => {      
      const dict = {}
      for(let ii = 0; ii < wordArr.length; ii++) {
        let currWord = wordArr[ii]
        if (dict[currWord] == null) {
          dict[currWord] = []
        }
  
        dict[currWord].push(ii);
      }
      return dict;
    }
  
    let _old = tokenizeIntoWords(oldStr);
    let _new = tokenizeIntoWords(newStr);
  
    let oldLookupDict = createLookUpIndexes(_old);
    let additions = [];
    let currentAddition = "";
    let _oldIndex = -1;
    
    // Loop over _new and figure out which consecutive strings have been added to it (not in old):
    for ( let ii = 0 ; ii < _new.length; ii++) {
        let currWord = _new[ii];
        let foundWord = false;
        if (oldLookupDict[currWord] != null) {
  
          for( let jj = 0 ; jj < oldLookupDict[currWord].length; jj++) {
            const index = oldLookupDict[currWord][jj];
            // Figure out if we are ahead of the last word we saw in the old str:
            if (_oldIndex < index) {
              _oldIndex = index;
              foundWord = true;
              break;
            }
          }
        } 
  
        if (foundWord == false) {
          if (currentAddition.length > 0) {
            currentAddition += " ";
          }
          currentAddition += currWord;
        }
        
        // If we found a word in the old str that is further ahead and we have existing
        // additions, we are at the end of our added string: 
        if (foundWord == true && currentAddition.length > 0) {
          additions.push(currentAddition);
          currentAddition = "";
        }
    }
    // Add any remaining addition at the end of the loop
    if (currentAddition.length > 0) {
      additions.push(currentAddition);
    }
    return additions;
  }
  