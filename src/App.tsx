import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  FileText, 
  Trash2, 
  Copy, 
  Download, 
  Languages, 
  FileEdit, 
  Sparkles, 
  History, 
  Check, 
  Settings, 
  X, 
  AlertCircle,
  Clock,
  BookOpen
} from "lucide-react";
import { SAMPLE_TRANSCRIPTS, SampleTranscript } from "./components/SampleData";
import { MarkdownRenderer } from "./components/MarkdownRenderer";

interface HistoryItem {
  id: string;
  time: string;
  title: string;
  input: string;
  output: string;
  targetLang: string;
  formatTemplate: string;
}

export default function App() {
  // 輸入狀態
  const [inputText, setInputText] = useState("");
  const [targetLang, setTargetLang] = useState("none");
  const [formatTemplate, setFormatTemplate] = useState("standard");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  // 輸出與控制
  const [outputText, setOutputText] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [outputTab, setOutputTab] = useState<"preview" | "raw">("preview");
  const [isCopied, setIsCopied] = useState(false);

  // 歷程紀錄
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);

  // 載入步驟文字
  const loadingSteps = [
    "正在讀取並解析您的會議逐字稿...",
    "正在淬鍊會議主題、提取核心關鍵字...",
    "正在分析各位發言人的對話與看法...",
    "正在構建與排版結構化會議記錄表格...",
    "正在整合翻譯並進行最終文字審查..."
  ];

  // 元件載入時，從 LocalStorage 讀取歷史紀錄
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ai_meeting_minutes_history");
      if (saved) {
        setHistoryList(JSON.parse(saved));
      }
    } catch (e) {
      console.error("無法讀取快取紀錄", e);
    }
  }, []);

  // 當載入中時，每隔 2.5 秒切換步驟文字
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev < loadingSteps.length - 1 ? prev + 1 : prev));
      }, 2500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLoading]);

  // 儲存至快取
  const saveToHistory = (input: string, output: string, lang: string, template: string) => {
    try {
      // 擷取標題
      let title = "未命名會議記錄";
      const match = output.match(/### 📅 會議基本資訊\s*-\s*\*\*會議主題\*\*\s*：?\s*(.*)/i);
      if (match && match[1]) {
        title = match[1].replace(/[\*`#]/g, "").trim();
      } else {
        // 從輸入的前15字起個名字
        const cleanInput = input.replace(/\s+/g, " ");
        title = cleanInput.slice(0, 15) + (cleanInput.length > 15 ? "..." : "") + " 紀錄";
      }

      const newItem: HistoryItem = {
        id: Date.now().toString(),
        time: new Date().toLocaleString("zh-TW", { hour12: false }),
        title,
        input,
        output,
        targetLang: lang,
        formatTemplate: template
      };

      const updated = [newItem, ...historyList.slice(0, 4)]; // 最多存 5 筆
      setHistoryList(updated);
      localStorage.setItem("ai_meeting_minutes_history", JSON.stringify(updated));
    } catch (e) {
      console.error("無法存入快取紀錄", e);
    }
  };

  // 貼上範例
  const handleApplySample = (sample: SampleTranscript) => {
    setInputText(sample.content);
    setErrorMessage("");
  };

  // 開始運行 API 生成
  const handleGenerate = async () => {
    if (!inputText.trim()) {
      setErrorMessage("請先輸入或貼上會議逐字稿內容。");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    setOutputText("");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: inputText,
          targetLang,
          formatTemplate
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "在與後端伺服器通訊時發生錯誤。");
      }

      if (data.result) {
        setOutputText(data.result);
        saveToHistory(inputText, data.result, targetLang, formatTemplate);
      } else {
        throw new Error("伺服器傳回了空白的生成內容。");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "連線至後端服務失敗，請稍後再試。");
    } finally {
      setIsLoading(false);
    }
  };

  // 載入歷史紀錄
  const handleSelectHistory = (item: HistoryItem) => {
    setInputText(item.input);
    setOutputText(item.output);
    setTargetLang(item.targetLang);
    setFormatTemplate(item.formatTemplate);
    setSelectedHistoryId(item.id);
    setErrorMessage("");
    setOutputTab("preview");
  };

  // 刪除特定歷史紀錄
  const handleDeleteHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = historyList.filter((item) => item.id !== id);
    setHistoryList(updated);
    localStorage.setItem("ai_meeting_minutes_history", JSON.stringify(updated));
    if (selectedHistoryId === id) {
      setSelectedHistoryId(null);
    }
  };

  // 一鍵複製
  const handleCopy = () => {
    if (!outputText) return;
    navigator.clipboard.writeText(outputText).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  // 下載 Markdown 檔案
  const handleDownload = () => {
    if (!outputText) return;
    const blob = new Blob([outputText], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    
    // 試著取得會議主題當檔名
    let fileName = "會議記錄";
    const match = outputText.match(/### 📅 會議基本資訊\s*-\s*\*\*會議主題\*\*\s*：?\s*(.*)/i);
    if (match && match[1]) {
      fileName = match[1].replace(/[\*`#\/\\?%*:|"<>\s]/g, "").trim();
    }
    
    link.setAttribute("download", `${fileName}_${new Date().toISOString().slice(0, 10)}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="app_root" className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans flex flex-col overflow-x-hidden">
      {/* 頂部 Header (Geometric Balance) */}
      <header id="app_header" className="h-16 shrink-0 flex items-center justify-between px-8 bg-white border-b border-slate-200 shadow-sm z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-md shadow-indigo-100">
            <Sparkles className="h-5 w-5" />
          </div>
          <h1 className="text-lg md:text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            AI 會議記錄生成與翻譯工具 <span className="text-indigo-600 text-xs font-black bg-indigo-50 px-1.5 py-0.5 rounded-md border border-indigo-100">PRO</span>
          </h1>
        </div>
        <div className="flex items-center gap-6">
          <nav className="hidden sm:flex items-center gap-4 text-sm font-medium text-slate-500">
            <span className="text-indigo-600 border-b-2 border-indigo-600 pb-1 cursor-pointer">即時生成</span>
            <span className="text-slate-400 font-normal">|</span>
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
              <Clock className="w-3.5 h-3.5" />
              UTC 2026-05-20
            </span>
          </nav>
        </div>
      </header>

      {/* 主體內容 (Geometric Balance 佈局) */}
      <main id="app_main" className="flex-1 max-w-7xl w-full mx-auto p-6 md:py-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* 左側：輸入、參數、範例 與 歷史快取 (佔 5 欄) */}
        <section className="lg:col-span-5 flex flex-col gap-6">
          
          {/* 會議逐字稿輸入區 (Geometric) */}
          <div id="card_input" className="bg-white rounded-2xl border-2 border-slate-100 shadow-sm p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <FileEdit className="w-4 h-4 text-indigo-500" />
                會議逐字稿輸入區
              </h2>
              <button 
                onClick={() => setInputText("")}
                disabled={!inputText}
                className="text-xs font-bold text-slate-400 hover:text-rose-500 transition-colors flex items-center gap-1 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                title="清空輸入框"
              >
                <Trash2 className="w-3.5 h-3.5" />
                清除內容
              </button>
            </div>

            {/* 文字方塊 */}
            <div className="relative">
              <textarea
                id="textarea_transcript"
                className="w-full h-80 p-5 bg-white border-2 border-slate-200 focus:border-indigo-500 rounded-2xl shadow-inner focus:outline-none transition-colors leading-relaxed text-slate-700 text-sm font-normal placeholder:text-slate-400"
                placeholder="請將會議逐字稿內容貼於此處...&#10;&#10;例如：&#10;張經理：大家早安，我們今天主要討論下半年的行銷預算...&#10;李小明：關於數位廣告的部分，我建議增加 20% 的投入..."
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  if (errorMessage) setErrorMessage("");
                }}
              />
              <div className="absolute bottom-4 right-4 text-2xs font-mono font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                字數: {inputText.length}
              </div>
            </div>

            {/* 一鍵體驗範例 */}
            <div className="flex flex-col gap-2 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
              <p className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                💡 快速載入繁體中文範例：
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                {SAMPLE_TRANSCRIPTS.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplySample(sample)}
                    className="flex-1 text-left px-3 py-2 bg-white hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-200 rounded-lg text-xs font-semibold text-slate-600 hover:text-indigo-700 transition-colors truncate"
                  >
                    {sample.title}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 智慧功能設定 (Geometric) */}
          <div id="card_settings" className="bg-white rounded-2xl border-2 border-slate-100 shadow-sm p-6 flex flex-col gap-4">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Settings className="w-4 h-4 text-indigo-500" />
              智慧功能設定
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* 紀錄範本選擇 */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500">
                  會議紀錄範本
                </label>
                <select
                  value={formatTemplate}
                  onChange={(e) => setFormatTemplate(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none transition-colors shadow-sm font-medium text-slate-700 cursor-pointer"
                >
                  <option value="standard">綜合標準會議記錄</option>
                  <option value="detailed">精準深度行政審查</option>
                  <option value="action-only">行動方案與決議優先</option>
                </select>
              </div>

              {/* 翻譯目標語言 */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                  <Languages className="w-3.5 h-3.5 text-indigo-500" />
                  語系翻譯目標
                </label>
                <select
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none transition-colors shadow-sm font-medium text-slate-700 cursor-pointer"
                >
                  <option value="none">不翻譯 (純繁體中文)</option>
                  <option value="English">翻譯成 英文 (English)</option>
                  <option value="日本語">翻譯成 日文 (日本語)</option>
                  <option value="한국어">翻譯成 韓文 (한국어)</option>
                  <option value="简体中文">翻譯成 簡體中文 (简体中文)</option>
                </select>
              </div>
            </div>

            {/* 錯誤警告區 */}
            <AnimatePresence>
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-xs flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-semibold">{errorMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 生成會議按鈕 (高質感 Geometric 按鈕) */}
            <button
              id="btn_generate"
              disabled={isLoading || !inputText.trim()}
              onClick={handleGenerate}
              className="h-14 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white disabled:text-slate-400 font-bold text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-current" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>正在極速處理排版中...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>生成會議總結與翻譯</span>
                </>
              )}
            </button>
          </div>

          {/* 歷史快取筆記 (僅當有項目時展示) */}
          {historyList.length > 0 && (
            <div id="card_history" className="bg-white rounded-2xl border-2 border-slate-100 shadow-sm p-6 flex flex-col gap-4">
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-500" />
                最近 5 筆會議快取
              </h2>

              <div className="flex flex-col gap-2.5">
                {historyList.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelectHistory(item)}
                    className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 group text-left ${
                      selectedHistoryId === item.id 
                        ? "bg-indigo-50/40 border-indigo-200 shadow-sm" 
                        : "bg-slate-50/50 hover:bg-slate-50 border-slate-100 hover:border-slate-200"
                    }`}
                  >
                    <div className="flex-1 min-w-0 flex items-start gap-2.5">
                      <FileText className={`w-4 h-4 mt-0.5 shrink-0 ${selectedHistoryId === item.id ? "text-indigo-600" : "text-slate-400"}`} />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xs font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                          {item.title}
                        </h3>
                        <p className="text-2xs font-mono font-medium text-slate-400 mt-0.5">
                          {item.time} ‧ {item.formatTemplate === "standard" ? "綜合" : item.formatTemplate === "detailed" ? "詳細" : "決議"}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={(e) => handleDeleteHistory(item.id, e)}
                      className="text-slate-450 hover:text-rose-600 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                      title="刪除紀錄"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* 右側：AI 結果區塊 (佔 7 欄，Geometric Balance 劃分) */}
        <section className="lg:col-span-7 flex flex-col pl-0 lg:pl-6 border-t lg:border-t-0 lg:border-l border-slate-200 pt-6 lg:pt-0">
          <div className="flex flex-col h-full gap-4">
            
            {/* 結果卡片 Header 導航列 */}
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                AI 處理結果 (Markdown)
              </h2>

              {outputText && (
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    onClick={() => setOutputTab("preview")}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                      outputTab === "preview" 
                        ? "bg-white text-indigo-700 shadow-sm" 
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    預覽排版結果
                  </button>
                  <button
                    onClick={() => setOutputTab("raw")}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                      outputTab === "raw" 
                        ? "bg-white text-indigo-700 shadow-sm" 
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    原始碼
                  </button>
                </div>
              )}
            </div>

            {/* 結果內容高質感容器 */}
            <div id="card_output" className="flex-1 bg-white border-2 border-slate-150 rounded-2xl p-6 md:p-8 min-h-[500px] shadow-sm relative overflow-hidden flex flex-col">
              <div className="flex-1 overflow-y-auto max-h-[720px] pr-2">
                <AnimatePresence mode="wait">
                  
                  {/* 1. 載入中狀態 */}
                  {isLoading ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-white/95 z-20"
                    >
                      <div className="relative mb-6">
                        <div className="absolute inset-[-8px] border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin w-16 h-16" />
                        <div className="w-16 h-16 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                          <Sparkles className="w-7 h-7" />
                        </div>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 mb-2">正在構建專業會議紀錄與翻譯</h3>
                      
                      {/* 動態變換的流程說明 */}
                      <AnimatePresence mode="wait">
                        <motion.p
                          key={loadingStep}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="text-sm text-slate-500 font-semibold text-center max-w-sm"
                        >
                          {loadingSteps[loadingStep]}
                        </motion.p>
                      </AnimatePresence>

                      {/* Progress bar */}
                      <div className="w-48 bg-slate-100 h-1.5 rounded-full mt-6 overflow-hidden border border-slate-200">
                        <motion.div 
                          className="bg-indigo-600 h-full"
                          animate={{ 
                            width: `${((loadingStep + 1) / loadingSteps.length) * 100}%` 
                          }}
                          transition={{ duration: 1 }}
                        />
                      </div>
                    </motion.div>
                  ) : outputText ? (
                    
                    // 2. 顯示生成結果
                    <motion.div
                      key="result"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="h-full"
                    >
                      {outputTab === "preview" ? (
                        <MarkdownRenderer content={outputText} />
                      ) : (
                        <textarea
                          className="w-full h-full min-h-[500px] p-4 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl outline-none leading-relaxed text-slate-700 resize-none font-medium"
                          readOnly
                          value={outputText}
                        />
                      )}
                    </motion.div>
                  ) : (
                    
                    // 3. 空白佔位符 (尚未生成)
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center"
                    >
                      <div className="w-20 h-20 rounded-2xl bg-slate-50 border-2 border-slate-100 flex items-center justify-center text-slate-400 mb-4 shadow-inner">
                        <FileText className="w-9 h-9" />
                      </div>
                      <h3 className="text-base font-bold text-slate-800 mb-1 tracking-tight">準備就緒 ‧ 等待生成指令</h3>
                      <p className="text-xs text-slate-400 max-w-xs leading-relaxed font-semibold">
                        在左側輸入或載入會議逐字稿內容，點擊「生成會議總結與翻譯」按鈕，AI 的精美分析結果將在幾秒內呈現於此。
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* 結果操作面板 (Geometric Footer) */}
              {outputText && !isLoading && (
                <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                  <span className="text-xs font-medium text-slate-455">
                    ⚡ 格式精確排版 ‧ 自動暫存本地
                  </span>

                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      onClick={handleDownload}
                      className="flex-1 sm:flex-initial px-4 py-2.5 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer bg-white shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      下載 MD
                    </button>

                    <button
                      onClick={handleCopy}
                      className="flex-1 sm:flex-initial px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-100 cursor-pointer"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-300" />
                          <span>已複製！</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>複製結果</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

      </main>

      {/* 頁尾 (Geometric Balance 完美貼合) */}
      <footer className="h-12 bg-white border-t border-slate-200 flex items-center justify-between px-8 text-xs text-slate-400 font-medium shrink-0">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
            系統狀態：正常
          </span>
          <span className="hidden sm:inline text-slate-300">|</span>
          <span className="hidden sm:inline text-slate-400">引擎版本：Gemini 3.5 Flash</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-slate-300">© 2026 AI 會議記錄 ‧ 繁體字專精授權</span>
        </div>
      </footer>
    </div>
  );
}
