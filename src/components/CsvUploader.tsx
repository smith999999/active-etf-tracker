import React, { useState, useRef } from 'react';
import { Upload, X, AlertCircle, Download, FileText, FileSpreadsheet } from 'lucide-react';
import { ACTIVE_ETFS, parseCsvData, parseRawTextData, importCsvData } from '../data/api';

interface CsvUploaderProps {
  onClose: () => void;
  onImportSuccess: () => void;
}

type ImportTab = 'csv' | 'text';

const CsvUploader: React.FC<CsvUploaderProps> = ({ onClose, onImportSuccess }) => {
  const [activeTab, setActiveTab] = useState<ImportTab>('text'); // 預設使用超方便的文字貼上
  const [selectedEtf, setSelectedEtf] = useState(ACTIVE_ETFS[0].symbol);
  const [importDate, setImportDate] = useState(new Date().toISOString().split('T')[0]);
  const [rawText, setRawText] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const processFile = (file: File) => {
    setError(null);
    setSuccessMsg(null);

    if (!file.name.endsWith('.csv')) {
      setError('請上傳 .csv 格式之檔案。');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        const records = parseCsvData(text, selectedEtf);
        if (records.length === 0) {
          setError('CSV 解析失敗，未找到任何有效的持股記錄。');
          return;
        }

        importCsvData(records);
        setSuccessMsg(`成功匯入 ${records.length} 筆真實持股記錄至 ETF ${selectedEtf}！`);
        onImportSuccess();
        setTimeout(() => {
          onClose();
        }, 1500);
      } catch (err: any) {
        setError(err.message || 'CSV 格式錯誤，請檢查欄位。');
      }
    };
    reader.onerror = () => {
      setError('讀取檔案時發生錯誤。');
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // 處理貼上文字匯入
  const handleTextImport = () => {
    setError(null);
    setSuccessMsg(null);

    if (!rawText.trim()) {
      setError('請貼上持股資料內容！');
      return;
    }

    try {
      const records = parseRawTextData(rawText, selectedEtf, importDate);
      if (records.length === 0) {
        setError('解析失敗！請確保貼上包含「4位股票代碼」及「持股張數/股數」的表格文字。');
        return;
      }

      importCsvData(records);
      setSuccessMsg(`成功由貼上文字解析並匯入 ${records.length} 筆真實成分股至 ETF ${selectedEtf} (日期: ${importDate})！`);
      onImportSuccess();
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || '文字解析過程發生錯誤。');
    }
  };

  const downloadSampleCsv = () => {
    const etfName = ACTIVE_ETFS.find(e => e.symbol === selectedEtf)?.name || '';
    const date = new Date().toISOString().split('T')[0];
    const csvContent = `日期,代號,名稱,張數,權重\n${date},2330,台積電,15800,13.49\n${date},2383,台光電,4800,4.11\n${date},3017,奇鋐,3800,3.30`;
    
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${selectedEtf}_${etfName}_持股匯入範本.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="upload-overlay">
      <div className="upload-modal" style={{ maxWidth: '640px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <h2>
            <Upload size={22} style={{ color: 'var(--accent-color)' }} />
            匯入真實持股資料 (CORS 免除)
          </h2>
          <button className="btn btn-ghost" style={{ padding: '4px', borderRadius: '50%' }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <p style={{ marginBottom: '16px' }}>
          您可以直接複製投信官網、MoneyDJ 或玩股網的 ETF 持股明細網頁表格，直接貼上進行匯入；或是上傳已整理好的 CSV 檔案。
        </p>

        {/* 核心設定欄位 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
              選擇目標 ETF：
            </label>
            <select
              className="etf-select"
              style={{ marginBottom: 0 }}
              value={selectedEtf}
              onChange={(e) => setSelectedEtf(e.target.value)}
            >
              {ACTIVE_ETFS.map(etf => (
                <option key={etf.symbol} value={etf.symbol}>
                  {etf.symbol} - {etf.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
              資料所屬日期：
            </label>
            <input
              type="date"
              className="etf-select"
              style={{ marginBottom: 0, border: '1px solid rgba(255,255,255,0.08)' }}
              value={importDate}
              onChange={(e) => setImportDate(e.target.value)}
            />
          </div>
        </div>

        {/* Tab 選擇器 */}
        <div className="filter-tabs" style={{ display: 'flex', marginBottom: '20px', width: '100%' }}>
          <button
            className={`filter-tab ${activeTab === 'text' ? 'active' : ''}`}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px' }}
            onClick={() => { setActiveTab('text'); setError(null); }}
          >
            <FileText size={16} />
            複製網頁文字直接貼上
          </button>
          <button
            className={`filter-tab ${activeTab === 'csv' ? 'active' : ''}`}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px' }}
            onClick={() => { setActiveTab('csv'); setError(null); }}
          >
            <FileSpreadsheet size={16} />
            上傳 CSV 檔案
          </button>
        </div>

        {/* Tab 1: 文字貼上 */}
        {activeTab === 'text' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            <textarea
              style={{
                width: '100%',
                height: '180px',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                color: 'var(--text-primary)',
                padding: '12px',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                outline: 'none',
                resize: 'none',
              }}
              placeholder={`範例一（MoneyDJ/玩股網複製貼上）：
2330 台積電 15,800 13.49%
2383 台光電 4,800 4.11%

範例二（官網 PCF 股數明細）：
2330,台積電,15,800,000股,13.49%
3017,奇鋐,3,800,000股,3.30%`}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
            />
            <button className="btn btn-primary" style={{ alignSelf: 'flex-end' }} onClick={handleTextImport}>
              解析並匯入數據
            </button>
          </div>
        )}

        {/* Tab 2: CSV 檔案 */}
        {activeTab === 'csv' && (
          <div
            className={`upload-dropzone ${dragOver ? 'drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={triggerFileInput}
            style={{ padding: '36px' }}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv"
              style={{ display: 'none' }}
            />
            <div className="upload-dropzone-icon">📁</div>
            <p className="upload-dropzone-text">
              拖曳 CSV 檔案至此，或 <strong>點擊選擇檔案</strong>
            </p>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>支援帶有「代號、張數、日期、權重」欄位之 CSV 格式</span>
          </div>
        )}

        {error && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: 'var(--up-color)', marginBottom: '16px', background: 'rgba(239,68,68,0.08)', padding: '10px', borderRadius: '8px', fontSize: '0.85rem' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: 'var(--down-color)', marginBottom: '16px', background: 'rgba(16,185,129,0.08)', padding: '10px', borderRadius: '8px', fontSize: '0.85rem' }}>
            <AlertCircle size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="upload-actions">
          {activeTab === 'csv' && (
            <button className="btn btn-ghost" onClick={downloadSampleCsv}>
              <Download size={16} />
              下載匯入範本
            </button>
          )}
          <button className="btn btn-ghost" onClick={onClose}>
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};

export default CsvUploader;
