// backend/utils/fileWatcher.js
const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs');
const { processRpaResultsImport } = require('../controllers/rpaController');

/**
 * Initializes a file watcher on the UiPath output directory.
 * When UiPath completes execution and saves claims_verified.xlsx,
 * this watcher automatically triggers the database ingestion.
 */
function initRpaFileWatcher() {
  const isEnabled = process.env.ENABLE_RPA_FILE_WATCHER === 'true';
  if (!isEnabled) {
    console.log('[RPA File Watcher] Automatic file watcher is disabled by configuration.');
    return null;
  }

  const outputPath = process.env.RPA_OUTPUT_PATH || '../rpa/output/claims_verified.xlsx';
  const targetFile = path.resolve(__dirname, '..', outputPath);
  const targetDir = path.dirname(targetFile);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  console.log(`[RPA File Watcher] Monitoring for UiPath output file at: ${targetFile}`);

  let debounceTimer = null;

  const watcher = chokidar.watch(targetFile, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 200
    }
  });

  const handleFileChange = () => {
    if (debounceTimer) clearTimeout(debounceTimer);

    debounceTimer = setTimeout(async () => {
      try {
        console.log('[RPA File Watcher] Detected new/updated claims_verified.xlsx from UiPath. Processing auto-import...');
        const summary = await processRpaResultsImport(null, 'uipath');
        console.log(`[RPA File Watcher] Auto-import completed successfully! (${summary.processed} claims processed)`);
      } catch (err) {
        console.error('[RPA File Watcher Error] Failed to auto-import bot output:', err.message);
      }
    }, 1000);
  };

  watcher.on('add', handleFileChange);
  watcher.on('change', handleFileChange);
  watcher.on('error', (error) => console.error('[RPA File Watcher Error]:', error));

  return watcher;
}

module.exports = {
  initRpaFileWatcher
};
