import React, { useState, useEffect, useCallback } from 'react';
import Plot from 'react-plotly.js';
import './App.css';

// Make h5wasm available globally for the wasm part
// You might need to copy h5wasm.wasm to your public folder
// and ensure your server serves it correctly.
// For Vite, files in `public` are served at the root.
// We will initialize h5wasm when the component mounts.
let h5wasm;

const App = () => {
  const [hdfFile, setHdfFile] = useState(null);
  const [artfFile, setArtfFile] = useState(null);
  const [signals, setSignals] = useState({}); // { signalName: { data: [], time: [], segments: [] } }
  const [selectedSignal, setSelectedSignal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [h5WasmReady, setH5WasmReady] = useState(false);
  const [currentView, setCurrentView] = useState('upload'); // 'upload' or 'plot'

  useEffect(() => {
    const initH5Wasm = async () => {
      try {
        // Dynamically import h5wasm
        const h5wasmModule = await import('h5wasm');
        // Use the module directly, not .default for ready and File
        await h5wasmModule.ready; 
        h5wasm = h5wasmModule; // Assign the module itself

        // Sanity check
        if (typeof h5wasm.File !== 'function') {
          console.error("h5wasm.File is not a function after initialization!", h5wasm);
          throw new Error("h5wasm.File is not available. Check module structure.");
        }

        setH5WasmReady(true);
        console.log('h5wasm initialized successfully');
      } catch (err) {
        console.error('Failed to initialize h5wasm:', err);
        setError('Failed to initialize HDF5 library. Please check the console. Ensure h5wasm.wasm and h5wasm.js from node_modules/h5wasm/dist/ are in the public/ folder and refresh the page.');
        setH5WasmReady(false); // Ensure UI reflects that h5wasm is not ready
      }
    };
    initH5Wasm();
  }, []);

  const handleHdfFileChange = (event) => {
    setHdfFile(event.target.files[0]);
    setError('');
  };

  const handleArtfFileChange = (event) => {
    setArtfFile(event.target.files[0]);
    setError('');
  };

  const unixFromDt = (dtString) => {
    const [datePart, timePart] = dtString.split(' ');
    const [day, month, year] = datePart.split('/');
    const [hours, minutes, secondsAndMs] = timePart.split(':');
    const [seconds, milliseconds] = secondsAndMs.split('.');
    // Note: JavaScript months are 0-indexed
    return new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds, milliseconds)).getTime() * 1000;
  };

  const processFiles = useCallback(async () => {
    if (!hdfFile || !artfFile) {
      setError('Please select both HDF5 and ARTF files.');
      return;
    }
    if (!h5WasmReady) {
      setError('HDF5 library not ready. Please wait or refresh.');
      return;
    }

    setIsLoading(true);
    setError('');
    setSignals({});
    setSelectedSignal('');

    try {
      // 1. Read ARTF file
      const artfText = await artfFile.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(artfText, 'text/xml');

      const infoElement = xmlDoc.querySelector('Info');
      if (!infoElement) {
        throw new Error('Invalid ARTF file: <Info> element not found.');
      }
      const artfHdf5Filename = infoElement.getAttribute('HDF5Filename');
      const annotator = infoElement.getAttribute('UserID') || 'Unknown';

      if (artfHdf5Filename !== hdfFile.name) {
        throw new Error(`ARTF file is for '${artfHdf5Filename}', but uploaded HDF5 is '${hdfFile.name}'.`);
      }

      const annotations = [];
      xmlDoc.querySelectorAll('Global > Artefact, SignalGroup > Artefact').forEach(el => {
        annotations.push({
          start: unixFromDt(el.getAttribute('StartTime')),
          end: unixFromDt(el.getAttribute('EndTime')),
          signalGroup: el.parentElement.tagName === 'SignalGroup' ? el.parentElement.getAttribute('Name') : null
        });
      });

      // 2. Read HDF5 file
      const hdfFileBuffer = await hdfFile.arrayBuffer();
      const uint8Array = new Uint8Array(hdfFileBuffer);
      const hdfFileName = hdfFile.name; // Store for use in finally block

      // Ensure FS is available (it should be if h5WasmReady is true)
      if (!h5wasm || !h5wasm.FS) {
        throw new Error("h5wasm.FS is not available. HDF5 library might not be fully initialized.");
      }

      // Write the file to the virtual FS first
      h5wasm.FS.writeFile(hdfFileName, uint8Array);
      let f = null; // Initialize f to null

      try {
        f = new h5wasm.File(hdfFileName, 'r');
        
        const loadedSignals = {};
        const wavesGroup = f.get('waves');
        if (!wavesGroup) {
            // Clean up before throwing, as this is a critical error after FS.writeFile
            if (h5wasm && h5wasm.FS && hdfFileName) {
                try { h5wasm.FS.unlink(hdfFileName); } catch (e) { console.warn('Cleanup unlink failed', e); }
            }
            throw new Error("'waves' group not found in HDF5 file.");
        }

        wavesGroup.keys().forEach(signalNameOriginal => {
          if (signalNameOriginal.includes('.')) return; // Skip .index files for now

          console.log(`Processing signal: ${signalNameOriginal}`); // DEBUG
          const signalDataset = wavesGroup.get(signalNameOriginal);
          // DEBUG: Log attributes of the signal dataset
          console.log(`Attributes for ${signalNameOriginal}:`, signalDataset.attrs);
          // DEBUG: Log all keys in wavesGroup to see if .index datasets are listed as expected
          if (signalNameOriginal === wavesGroup.keys().filter(k => !k.includes('.'))[0]) { // Log keys only once
            console.log('Keys in wavesGroup:', wavesGroup.keys());
          }

          const rawSignalData = signalDataset.value; 

          let indexDataArray;
          const indexDatasetKey = signalNameOriginal + '.index';
          console.log(`Attempting to find index data for key: "${indexDatasetKey}" or as an attribute 'index' on "${signalNameOriginal}"`);

          // Check 1: Separate .index dataset
          const availableKeysInGroup = wavesGroup.keys();
          if (availableKeysInGroup.includes(indexDatasetKey)) {
            console.log(`[Check 1] Key "${indexDatasetKey}" IS present in wavesGroup.keys(). Attempting to .get().`);
            try {
              const indexDsObject = wavesGroup.get(indexDatasetKey);
              console.log(`[Check 1] wavesGroup.get("${indexDatasetKey}") returned:`, indexDsObject);

              // Check if it's a dataset-like object (h5wasm datasets have 'shape', 'dtype', 'value')
              if (indexDsObject && typeof indexDsObject.shape !== 'undefined' && typeof indexDsObject.dtype !== 'undefined' && typeof indexDsObject.value !== 'undefined') {
                indexDataArray = indexDsObject.value;
                console.log(`[Check 1] Successfully read .value from "${indexDatasetKey}". Value:`, indexDataArray);
                // Explicitly check if array is empty, as this might be an issue later if not handled
                if (indexDataArray && Array.isArray(indexDataArray) && indexDataArray.length === 0) {
                    console.warn(`[Check 1] Index data for "${indexDatasetKey}" is an empty array.`);
                    // indexDataArray = null; // Decide if empty array is an error for your logic. For now, let it pass.
                }
              } else {
                console.log(`[Check 1] Object obtained for "${indexDatasetKey}" is not a valid dataset (missing shape/dtype/value) or .value is undefined.`);
                if(indexDsObject) {
                    console.log(`[Check 1] Details of object for "${indexDatasetKey}": shape=${indexDsObject.shape}, dtype=${indexDsObject.dtype}, value_type=${typeof indexDsObject.value}, keys=${typeof indexDsObject.keys === 'function' ? JSON.stringify(indexDsObject.keys()) : 'N/A'}`);
                }
              }
            } catch (e) {
              console.warn(`[Check 1] Error during .get("${indexDatasetKey}") or accessing its .value:`, e);
            }
          } else {
             console.log(`[Check 1] Key "${indexDatasetKey}" is NOT in wavesGroup.keys(). Available keys: ${JSON.stringify(availableKeysInGroup)}`);
          }

          // Check 2: Attribute on signal dataset (only if indexDataArray is still not found)
          if (!indexDataArray && signalDataset.attrs && signalDataset.attrs.index) {
              console.log(`Found index attribute on ${signalNameOriginal}`); // DEBUG
              indexDataArray = signalDataset.attrs.index.value; 
          }
          
          // If still no indexDataArray, then fail for this signal
          if (!indexDataArray) {
              console.warn(`No index data for signal ${signalNameOriginal}. 
wavesGroup members: ${JSON.stringify(wavesGroup.keys())} 
Attributes on ${signalNameOriginal}: ${JSON.stringify(Object.keys(signalDataset.attrs || {}))}`);
              return;
          }

          if (indexDataArray.length === 4 && typeof indexDataArray[0] === 'number') {
              indexDataArray = [indexDataArray];
          }

          for (let i = 0; i < indexDataArray.length; i++) {
              const item = indexDataArray[i];
              const signalName = indexDataArray.length > 1 && i > 0 ? `${signalNameOriginal}_${i-1}` : signalNameOriginal;
              
              // Convert potential BigInts from indexData to Numbers
              const startIdx = Number(item[0]);
              const startTime = Number(item[1]); 
              const length = Number(item[2]);
              const frequency = Number(item[3]);

              console.log(`Signal: ${signalName}, StartIdx: ${startIdx}, StartTime: ${startTime}, Length: ${length}, Frequency: ${frequency}`); // DEBUG

              const signalDataSlice = rawSignalData.slice(startIdx, startIdx + length);
              const timeArray = Array.from({ length: signalDataSlice.length }, (_, k) => startTime + (k / frequency) * 1000000);
              const segmentLengthSeconds = 10;
              const segmentLengthSamples = Math.floor(frequency * segmentLengthSeconds);
              const numSegments = Math.floor(signalDataSlice.length / segmentLengthSamples);
              const segments = [];

              for (let j = 0; j < numSegments; j++) {
                const segStartTimestamp = startTime + j * segmentLengthSeconds * 1000000;
                const segEndTimestamp = segStartTimestamp + segmentLengthSeconds * 1000000;
                let isAnomalous = false;
                const segmentAnnotators = new Set();
                annotations.forEach(ann => {
                  if (ann.signalGroup && ann.signalGroup !== signalName) return;
                  const overlaps = (ann.start <= segStartTimestamp && ann.end > segStartTimestamp) || 
                                   (ann.start < segEndTimestamp && ann.end >= segEndTimestamp) ||
                                   (ann.start >= segStartTimestamp && ann.end <= segEndTimestamp); 
                  if (overlaps) {
                    isAnomalous = true;
                    segmentAnnotators.add(annotator);
                  }
                });
                const weight = isAnomalous ? 1.0 : 0.0; 
                segments.push({
                  id: `${signalName}_seg_${j}`,
                  startTimestamp: segStartTimestamp,
                  endTimestamp: segEndTimestamp,
                  anomalous: isAnomalous,
                  weight: weight,
                  annotators: Array.from(segmentAnnotators),
                  data: signalDataSlice.slice(j * segmentLengthSamples, (j + 1) * segmentLengthSamples)
                });
              }
              loadedSignals[signalName] = { 
                  data: signalDataSlice,
                  time: timeArray,
                  segments: segments,
                  frequency: frequency,
                  startTime: startTime
              };
          }
        }); // End of wavesGroup.keys().forEach
        
        if (Object.keys(loadedSignals).length === 0) {
          throw new Error('No signals processed from HDF5 file. Check console for warnings.');
        }

        setSignals(loadedSignals);
        if (Object.keys(loadedSignals).length > 0) {
          setSelectedSignal(Object.keys(loadedSignals)[0]);
          setCurrentView('plot'); // Switch to plot view on successful load
        }

      } finally {
        if (f) {
          f.close();
        }
        // Clean up the file from the virtual file system
        if (h5wasm && h5wasm.FS && hdfFileName) {
          try {
            h5wasm.FS.unlink(hdfFileName);
          } catch (unlinkError) {
            console.warn(`Could not unlink ${hdfFileName} from virtual FS:`, unlinkError);
          }
        }
      }
    } catch (err) {
      console.error('Processing error:', err);
      setError(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [hdfFile, artfFile, h5WasmReady]);

  const handleGoBackToUpload = () => {
    setCurrentView('upload');
    setHdfFile(null);
    setArtfFile(null);
    setSignals({});
    setSelectedSignal('');
    setError('');
    // Reset file input elements visually
    const hdfInput = document.getElementById('hdfFile');
    if (hdfInput) hdfInput.value = null;
    const artfInput = document.getElementById('artfFile');
    if (artfInput) artfInput.value = null;
  };

  const currentSignal = signals[selectedSignal];

  // Generate shapes for Plotly based on segments
  const getPlotlyShapes = () => {
    if (!currentSignal || !currentSignal.segments) return [];
    return currentSignal.segments.map(seg => ({
        type: 'rect',
        xref: 'x',
        yref: 'paper',
        x0: new Date(seg.startTimestamp / 1000), // Plotly uses ms for Date objects
        y0: 0,
        x1: new Date(seg.endTimestamp / 1000),
        y1: 1,
        fillcolor: seg.anomalous ? 'rgba(255, 0, 0, 0.3)' : 'rgba(0, 255, 0, 0.1)',
        line: {
            width: 0
        },
        // Custom data for hover
        // customdata: `Weight: ${seg.weight.toFixed(2)}<br>Annotators: ${seg.annotators.join(', ')}`,
        name: '', // Important to have name (even empty) for hovertemplate to show up for shapes
        hovertemplate: `<b>Segment</b><br>` +
                       `Time: ${new Date(seg.startTimestamp / 1000).toLocaleTimeString()} - ${new Date(seg.endTimestamp / 1000).toLocaleTimeString()}<br>` +
                       `Anomalous: ${seg.anomalous ? 'Yes' : 'No'}<br>` +
                       `Weight: ${seg.weight.toFixed(2)}<br>` +
                       `Annotators: ${seg.annotators.join(', ') || 'N/A'}` +
                       `<extra></extra>` // <extra></extra> hides the trace info (like trace 0)
    }));
};

  return (
    <div className="App">
      <header className="App-header">
        <h1>HDF5 / ARTF Visualizer</h1>
        {!h5WasmReady && currentView === 'upload' && <p className="loading-message">Initializing HDF5 Library, please wait...</p>}
      </header>
      
      {currentView === 'upload' && (
        <div className="upload-view">
          <div className="controls">
            <div className="file-input-group">
              <label htmlFor="hdfFile">HDF5 Signal Data (.hdf5, .h5)</label>
              <div className="file-input-area">
                <input type="file" id="hdfFile" accept=".hdf5,.h5" onChange={handleHdfFileChange} disabled={!h5WasmReady || isLoading} />
                {hdfFile ? (
                  <p className="file-input-text selected">Selected: {hdfFile.name}</p>
                ) : (
                  <p className="file-input-text">Drag & drop or click to select file</p>
                )}
              </div>
            </div>
            <div className="file-input-group">
              <label htmlFor="artfFile">ARTF Annotation File (.artf)</label>
              <div className="file-input-area">
                <input type="file" id="artfFile" accept=".artf" onChange={handleArtfFileChange} disabled={!h5WasmReady || isLoading} />
                {artfFile ? (
                  <p className="file-input-text selected">Selected: {artfFile.name}</p>
                ) : (
                  <p className="file-input-text">Drag & drop or click to select file</p>
                )}
              </div>
            </div>
            <button onClick={processFiles} disabled={!hdfFile || !artfFile || isLoading || !h5WasmReady}>
              {isLoading ? 'Processing...' : 'Load & Process Files'}
            </button>
            {error && <p className="error-message">{error}</p>}
            {isLoading && !error && <p className="loading-message">Loading data, please wait...</p>}
          </div>
        </div>
      )}

      {currentView === 'plot' && currentSignal && currentSignal.data && currentSignal.time && (
        <div className="plot-view">
          <div className="plot-controls">
            {Object.keys(signals).length > 1 && (
              <div className="signal-selector">
                <label htmlFor="signalSelect">Select Signal: </label>
                <select id="signalSelect" value={selectedSignal} onChange={(e) => setSelectedSignal(e.target.value)}>
                  {Object.keys(signals).map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
      </div>
            )}
            <button onClick={handleGoBackToUpload} className="back-button">
              Load New Files
        </button>
      </div>
          
          {error && <p className="error-message">{error}</p>} {/* Show errors in plot view too, e.g. if processing starts but fails late */}

          <div className="plot-container">
            <h2>Signal: {selectedSignal}</h2>
            <Plot
              data={[
                {
                  x: currentSignal.time.map(t => new Date(t / 1000)), // Convert microseconds to milliseconds for Date obj
                  y: currentSignal.data,
                  type: 'scattergl', // Use scattergl for performance
                  mode: 'lines',
                  name: selectedSignal,
                  line: { color: '#1f77b4' } 
                },
              ]}
              layout={{
                autosize: true, // Ensure Plotly adapts to container size
                height: 600, // Keep height or make it responsive if desired
                title: `Signal: ${selectedSignal}`,
                xaxis: {
                  title: 'Time',
                  type: 'date',
                  // Constrain zoom/pan to the signal's actual time range
                  constraintrange: [
                    new Date(currentSignal.startTime / 1000).toISOString(), // Overall start time of the signal
                    new Date((currentSignal.startTime + (currentSignal.data.length / currentSignal.frequency) * 1000000) / 1000).toISOString() // Overall end time
                  ],
                  rangemode: 'normal' // Ensures constraintrange is respected
                },
                yaxis: {
                  title: 'Value',
                  fixedrange: false // Allows zoom/pan on y-axis
                },
                shapes: getPlotlyShapes(),
                hovermode: 'closest', // Show hover for the closest point
                // Attempting to show customdata from shapes on hover (might need more specific hovertemplate for shapes)
                // For now, clicking the segment might be more reliable for info or a dedicated info panel.
              }}
              config={{
                  scrollZoom: true, // Enable scroll to zoom
              }}
            />
            {/* Display segment info - simple version for now (commented out as hover is implemented) */}
            {/* {currentSignal.segments && currentSignal.segments.length > 0 && (
              <div className="segment-info">
                  <h3>Segment Details (hover over plot segments)</h3>
                  {currentSignal.segments.find(s => s.anomalous) && (
                      <pre>
                          {JSON.stringify(currentSignal.segments.find(s => s.anomalous), null, 2)}
                      </pre>
                  )}
              </div>
            )} */}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
