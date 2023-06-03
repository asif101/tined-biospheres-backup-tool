import { Download } from '@mui/icons-material'
import { Button, InputBase, LinearProgress } from '@mui/material'
import { useEffect, useState } from 'react'

export default function App() {
  const [savePath, setSavePath] = useState('')
  const [downloadStatus, setDownloadStatus] = useState({
    started: false,
    done: false,
    error: false,
    message: '',
    percent: 0
  })

  useEffect(() => {
    window.api.getDefaultFolder().then((res) => {
      setSavePath(res)
    })
    function handleDownloadStatus(event, value) {
      setDownloadStatus(value)
    }
    window.api.onDownloadStatus(handleDownloadStatus)
    return () => window.api.offDownloadStatus(handleDownloadStatus)
  }, [])

  return (
    <div className="container">
      <h1>Deep Field Backup Tool</h1>
      <h3>Save Directory</h3>
      <div className="file-select">
        <Button
          variant="contained"
          color="warning"
          onClick={() =>
            window.api.selectFolder().then((path) => {
              if (path) setSavePath(path)
              console.log(path)
            })
          }
        >
          Select Folder
        </Button>
        <InputBase value={savePath} onChange={(e) => setSavePath(e.target.value)} />
      </div>
      <Button
        className="download-button"
        variant="contained"
        color="warning"
        disabled={downloadStatus.started && !downloadStatus.done && !downloadStatus.error}
        startIcon={<Download />}
        onClick={() => window.api.startBackup(savePath)}
      >
        Start Backup
      </Button>
      {downloadStatus.started && (
        <div>
          <LinearProgress
            color={downloadStatus.done ? 'success' : downloadStatus.error ? 'error' : 'warning'}
            variant="determinate"
            value={downloadStatus.percent}
          />
          <p>{downloadStatus.message}</p>
        </div>
      )}
    </div>
  )
}
