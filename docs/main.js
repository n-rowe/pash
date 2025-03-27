import { diff } from 'https://cdn.jsdelivr.net/npm/@n-rowe/pash/dist/index.min.mjs'

/* Patch Generation */
function getJsonValue(id) {
  const el = document.getElementById(id)
  if (!el)
    return [false, undefined]

  // Reset state
  const feedbackEl = document.getElementById(`${id}Feedback`)
  el.classList.remove('is-invalid')
  feedbackEl.textContent = ''

  // Required check
  if (!el.checkValidity()) {
    el.classList.add('is-invalid')
    feedbackEl.textContent = 'This field is required.'
    return [false, undefined]
  }

  // Json check
  let jsonVal
  try {
    el.classList.add('is-valid')
    jsonVal = JSON.parse(el.value)
    return [true, jsonVal]
  }
  catch {
    el.classList.add('is-invalid')
    feedbackEl.textContent = 'You must enter valid JSON.'
    return [false, undefined]
  }
}

function generatePatch() {
  // Get values
  const outputEl = document.getElementById('outputContainer')
  const [originalValid, original] = getJsonValue('originalInput')
  const [changedValid, changed] = getJsonValue('changedInput')
  if (!originalValid || !changedValid) {
    outputEl.classList.add('d-none')
    return
  }

  // Diff value
  const start = performance.timeOrigin + performance.now()
  const output = diff(original, changed).asPatches()
  const totalTime = (performance.timeOrigin + performance.now()) - start

  // Output
  const outputValEl = document.getElementById('output')
  const patchTimeEl = document.getElementById('patchTime')
  outputValEl.value = JSON.stringify(output, undefined, 4)
  outputEl.classList.remove('d-none')
  patchTimeEl.textContent = `Generated patch in ${totalTime}ms`
}

document.getElementById('generateBtn').addEventListener('click', generatePatch)

/* TextArea Files */
function setFileContent(event) {
  const inputFile = event.dataTransfer.files[0]
  const reader = new FileReader()
  reader.onload = () => {
    event.target.textContent = reader.result
  }
  reader.readAsText(inputFile)
}

const originalInput = document.getElementById('originalInput')
originalInput.addEventListener('dragover', e => e.preventDefault())
originalInput.addEventListener('drop', setFileContent)

const changedInput = document.getElementById('changedInput')
changedInput.addEventListener('dragover', e => e.preventDefault())
changedInput.addEventListener('drop', setFileContent)
