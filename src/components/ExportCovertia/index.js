import React, { useState, useEffect } from 'react';
import styles from './styles.module.css';

export default function ExportCovertia({ data, filename = 'workflow' }) {
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [liveData, setLiveData] = useState(data);

  useEffect(() => {
    setLiveData(data);
  }, [data]);

  useEffect(() => {
    const handleUpdate = (e) => {
      setLiveData(e.detail);
    };
    window.addEventListener('workflow-data-updated', handleUpdate);
    return () => {
      window.removeEventListener('workflow-data-updated', handleUpdate);
    };
  }, []);

  const jsonString = typeof liveData === 'string' ? liveData : JSON.stringify(liveData, null, 2);

  const handleExport = () => {
    setExporting(true);
    const blob = new Blob([typeof liveData === 'string' ? liveData : JSON.stringify(liveData)], {
      type: 'application/octet-stream',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.covertia`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setTimeout(() => setExporting(false), 1500);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback copy
      const textarea = document.createElement('textarea');
      textarea.value = jsonString;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.fileIcon}>📄</span>
          <span className={styles.fileName}>{filename}.covertia</span>
        </div>
        <div className={styles.headerRight}>
          <button
            className={`${styles.btn} ${styles.copyBtn}`}
            onClick={handleCopy}
            title="Copy to clipboard"
          >
            {copied ? '✓ Copied' : '📋 Copy'}
          </button>
          <button
            className={`${styles.btn} ${styles.exportBtn}`}
            onClick={handleExport}
            title="Export as .covertia file"
          >
            {exporting ? '✓ Exported!' : 'Export .covertia'}
          </button>
        </div>
      </div>
      <div className={styles.codeWrapper}>
        <pre className={styles.codeBlock}>
          <code>{jsonString}</code>
        </pre>
      </div>
    </div>
  );
}
