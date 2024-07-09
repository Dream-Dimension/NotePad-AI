
### Notepad AI

A very simple note taking app that let's you run queries to an LLM of your choosing.
A new take on UIs for interacting with LLMs.


## [YouTube Video Demo](https://youtu.be/ntdlgFmSxQY)
[![Video Demo](images/notepad_ai.png)](https://youtu.be/ntdlgFmSxQY)


## [Live Demo](https://dreamdimension.net/NotePad-AI/)

## Build & Run Locally
``` npm run build ```
``` cd buld ```
``` npx http-server ``

* Note to run locally make sure to delete the hoempage setting in package.json. It is using package.json homepage: "/NotePad-AI/", because it needs to run on github and could not figure out a way to set it to be empty
so the relative path worked. This did not work "." or "./"