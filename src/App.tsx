/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useCallback } from 'react';
import Papa from 'papaparse';
import { parse, differenceInMinutes, format } from 'date-fns';
import { Upload, DollarSign, Clock, Users, FileText, Trash2, AlertCircle, X, Calendar, Edit2, RotateCcw, Download } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'motion/react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AttendanceRow {
  項次: string;
  姓名: string;
  員工編號: string;
  打卡日期: string;
  上班時間: string;
  下班時間: string;
  '打卡機號(上班／下班)': string;
}

interface EmployeeSummary {
  id: string;
  name: string;
  totalMinutes: number;
  records: {
    date: string;
    start: string;
    end: string;
    minutes: number;
    isNextDay: boolean;
  }[];
}

export default function App() {
  const [data, setData] = useState<AttendanceRow[]>([]);
  const [hourlyWage, setHourlyWage] = useState<number>(190); // Default minimum wage in Taiwan approx
  const [isDragging, setIsDragging] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeSummary | null>(null);
  const [manualMinutes, setManualMinutes] = useState<Record<string, number>>({});

  const handleFileUpload = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedData = results.data as AttendanceRow[];
        // Basic validation: check if required headers exist
        if (parsedData.length > 0 && parsedData[0].姓名 && parsedData[0].上班時間) {
          setData(parsedData);
        } else {
          alert('CSV 格式不正確，請確認包含「姓名」、「上班時間」、「下班時間」等欄位。');
        }
      },
      error: (error) => {
        console.error('Error parsing CSV:', error);
        alert('解析 CSV 檔案時發生錯誤。');
      }
    });
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'text/csv') {
      handleFileUpload(file);
    } else {
      alert('請上傳 CSV 檔案。');
    }
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const employeeSummaries = useMemo(() => {
    const summaries: Record<string, EmployeeSummary> = {};

    data.forEach((row) => {
      const id = row.員工編號 || row.姓名;
      const name = row.姓名;
      
      if (!summaries[id]) {
        summaries[id] = { id, name, totalMinutes: 0, records: [] };
      }

      try {
        // Clean time strings: remove "(隔日)" and any extra spaces
        const cleanStart = row.上班時間?.replace(/\(.*\)/, '').trim();
        const cleanEnd = row.下班時間?.replace(/\(.*\)/, '').trim();

        if (!cleanStart || !cleanEnd) {
          console.warn(`Row ${row.項次} is missing start or end time:`, row);
          return;
        }

        const startTime = parse(cleanStart, 'HH:mm', new Date());
        const endTime = parse(cleanEnd, 'HH:mm', new Date());
        
        let minutes = differenceInMinutes(endTime, startTime);
        let isNextDay = row.下班時間?.includes('隔日');
        
        // Handle shifts crossing midnight (if end time is earlier than start time)
        // Or if the original string contained "(隔日)"
        if (minutes < 0 || isNextDay) {
          // If it was already positive but marked as (隔日), it means it's > 24h or just a long shift
          // But usually (隔日) with a smaller HH:mm means +24h
          if (minutes < 0) {
            minutes += 24 * 60;
            isNextDay = true;
          } else if (isNextDay) {
            // If it's something like 15:00 to 15:01(隔日), minutes is 1, but should be 24h + 1
            minutes += 24 * 60;
          }
        }

        if (!isNaN(minutes)) {
          summaries[id].totalMinutes += minutes;
          summaries[id].records.push({
            date: row.打卡日期,
            start: row.上班時間,
            end: row.下班時間,
            minutes,
            isNextDay: !!isNextDay
          });
        }
      } catch (e) {
        console.warn(`Row ${row.項次} has invalid time format:`, row);
      }
    });

    return Object.values(summaries).sort((a, b) => b.totalMinutes - a.totalMinutes);
  }, [data]);

  const formatHours = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours} 小時 ${mins} 分鐘`;
  };

  const calculateSalary = (minutes: number) => {
    return Math.round((minutes / 60) * hourlyWage);
  };

  const handleExport = () => {
    if (employeeSummaries.length === 0) return;

    const exportData = employeeSummaries.map(emp => {
      const currentMinutes = manualMinutes[emp.id] ?? emp.totalMinutes;
      const isAdjusted = manualMinutes[emp.id] !== undefined;
      
      return {
        '員工姓名': emp.name,
        '員工編號': emp.id,
        '出勤次數': emp.records.length,
        '系統計算工時': formatHours(emp.totalMinutes),
        '系統計算分鐘': emp.totalMinutes,
        '手動調整工時': isAdjusted ? formatHours(currentMinutes) : '未調整',
        '最終結算分鐘': currentMinutes,
        '設定時薪': hourlyWage,
        '預估薪資': calculateSalary(currentMinutes)
      };
    });

    const csv = Papa.unparse(exportData);
    const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `薪資結算表_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#1A1A1A] font-sans p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-zinc-900">員工出勤薪資計算</h1>
            <p className="text-zinc-500 mt-2">上傳 POS 匯出的 CSV 檔案，快速結算工時與薪資。</p>
            <p className="text-amber-600 text-xs mt-1 font-medium">※ 此工具僅供計算參考，實際薪資計算請店家再自行核對確認</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-zinc-200">
              <div className="flex flex-col">
                <label htmlFor="wage" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                  設定時薪 (TWD)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    id="wage"
                    type="text"
                    inputMode="numeric"
                    value={hourlyWage}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '').replace(/^0+/, '');
                      setHourlyWage(val === '' ? 0 : Number(val));
                    }}
                    className="pl-5 pr-2 py-1 text-xl font-medium focus:outline-none w-32"
                  />
                </div>
              </div>
            </div>

            {data.length > 0 && (
              <button
                onClick={handleExport}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-4 rounded-2xl font-bold shadow-lg shadow-emerald-200 transition-all active:scale-95"
              >
                <Download className="w-5 h-5" />
                匯出結算報表
              </button>
            )}
          </div>
        </header>

        {/* Main Content */}
        {data.length === 0 ? (
          <div className="space-y-8">
            <div
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              className={cn(
                "relative group cursor-pointer transition-all duration-500",
                "border-2 border-dashed rounded-[2.5rem] p-12 md:p-32",
                "flex flex-col items-center justify-center text-center",
                "overflow-hidden",
                isDragging 
                  ? "border-blue-500 bg-blue-50/50 scale-[0.98] shadow-2xl shadow-blue-100" 
                  : "border-zinc-200 bg-white hover:border-zinc-400 hover:shadow-xl hover:shadow-zinc-100"
              )}
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              {/* Decorative background elements */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-zinc-100 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <input
                id="file-upload"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              />
              
              <div className={cn(
                "w-24 h-24 rounded-3xl flex items-center justify-center transition-all duration-500 mb-8",
                isDragging ? "bg-blue-500 text-white rotate-12 scale-110" : "bg-zinc-100 text-zinc-400 group-hover:bg-zinc-900 group-hover:text-white group-hover:-rotate-6"
              )}>
                <Upload className="w-10 h-10" />
              </div>

              <div className="space-y-4 relative z-10">
                <h3 className="text-3xl font-bold tracking-tight text-zinc-900">
                  開始計算薪資
                </h3>
                <p className="text-zinc-500 max-w-md mx-auto leading-relaxed">
                  將您的 POS 系統匯出的 <span className="font-bold text-zinc-900">CSV 檔案</span> 拖曳至此處，或點擊區塊進行上傳。
                </p>
              </div>

              <div className="mt-10 flex flex-wrap justify-center gap-3">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 bg-zinc-100/50 px-4 py-2 rounded-full border border-zinc-100">
                  <FileText className="w-3 h-3" />
                  支援 .CSV 格式
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 bg-zinc-100/50 px-4 py-2 rounded-full border border-zinc-100">
                  <Users className="w-3 h-3" />
                  自動辨識員工
                </div>
              </div>

              {/* Dragging overlay hint */}
              <AnimatePresence>
                {isDragging && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-blue-500/10 backdrop-blur-[2px] flex items-center justify-center z-20"
                  >
                    <div className="bg-white px-8 py-4 rounded-2xl shadow-2xl border border-blue-100 flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
                      <span className="font-bold text-blue-600">放開以開始解析檔案</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Hint section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { title: '欄位確認', desc: '請確保檔案包含「姓名」、「上班時間」、「下班時間」等關鍵欄位。', icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-50' },
                { title: '跨夜處理', desc: '系統會自動偵測「(隔日)」標記，並正確計算跨午夜的工時。', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50' },
                { title: '手動調整', desc: '匯入後可針對個別員工進行工時微調，並即時更新薪資。', icon: Edit2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
              ].map((item, i) => (
                <div key={i} className="bg-white p-6 rounded-3xl border border-zinc-100 flex gap-4">
                  <div className={cn("shrink-0 w-10 h-10 rounded-xl flex items-center justify-center", item.bg)}>
                    <item.icon className={cn("w-5 h-5", item.color)} />
                  </div>
                  <div>
                    <h4 className="font-bold text-zinc-900 mb-1">{item.title}</h4>
                    <p className="text-xs text-zinc-500 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-50 rounded-xl">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">總人數</span>
                </div>
                <div className="text-4xl font-bold">{employeeSummaries.length} <span className="text-lg font-normal text-zinc-400">人</span></div>
              </div>

              <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-emerald-50 rounded-xl">
                    <Clock className="w-5 h-5 text-emerald-600" />
                  </div>
                  <span className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">總工時</span>
                </div>
                <div className="text-4xl font-bold">
                  {Math.floor(employeeSummaries.reduce((acc, curr) => acc + (manualMinutes[curr.id] ?? curr.totalMinutes), 0) / 60)} 
                  <span className="text-lg font-normal text-zinc-400"> 小時</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-amber-50 rounded-xl">
                    <DollarSign className="w-5 h-5 text-amber-600" />
                  </div>
                  <span className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">預估總薪資</span>
                </div>
                <div className="text-4xl font-bold">
                  ${employeeSummaries.reduce((acc, curr) => acc + calculateSalary(manualMinutes[curr.id] ?? curr.totalMinutes), 0).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Employee Table */}
            <div className="bg-white rounded-3xl shadow-sm border border-zinc-100 overflow-hidden">
              <div className="p-6 border-bottom border-zinc-100 flex items-center justify-between">
                <h2 className="text-xl font-bold">員工結算清單</h2>
                <button 
                  onClick={() => setData([])}
                  className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 font-medium transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  清除資料
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-zinc-50/50 border-y border-zinc-100">
                      <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">員工姓名 / 編號</th>
                      <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">出勤次數</th>
                      <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">系統計算工時</th>
                      <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">手動調整工時</th>
                      <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider text-right">預估薪資</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {employeeSummaries.map((emp) => {
                      const currentMinutes = manualMinutes[emp.id] ?? emp.totalMinutes;
                      const isAdjusted = manualMinutes[emp.id] !== undefined;

                      return (
                        <tr key={emp.id} className="hover:bg-zinc-50/50 transition-colors group">
                          <td className="px-6 py-5">
                            <div className="font-semibold text-lg">{emp.name}</div>
                            <div className="text-xs font-mono text-zinc-400">{emp.id}</div>
                          </td>
                          <td className="px-6 py-5">
                            <button 
                              onClick={() => setSelectedEmployee(emp)}
                              className="bg-zinc-100 hover:bg-zinc-200 px-2.5 py-1 rounded-full text-sm font-medium transition-colors cursor-pointer flex items-center gap-1.5"
                            >
                              {emp.records.length} 次
                              <span className="text-[10px] bg-zinc-400 text-white px-1 rounded">查看</span>
                            </button>
                          </td>
                          <td className="px-6 py-5">
                            <div className="text-sm text-zinc-500">{formatHours(emp.totalMinutes)}</div>
                            <div className="text-[10px] text-zinc-400">{(emp.totalMinutes / 60).toFixed(2)} 小時</div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-2">
                              <div className="relative flex items-center bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1 focus-within:border-zinc-400 transition-all">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  placeholder={Math.floor(emp.totalMinutes / 60).toString()}
                                  value={isAdjusted ? Math.floor(currentMinutes / 60) : ""}
                                  onChange={(e) => {
                                    const h = parseInt(e.target.value.replace(/[^0-9]/g, '') || "0");
                                    const m = currentMinutes % 60;
                                    setManualMinutes(prev => ({ ...prev, [emp.id]: h * 60 + m }));
                                  }}
                                  className="w-8 bg-transparent text-sm font-bold text-center focus:outline-none"
                                />
                                <span className="text-[10px] text-zinc-400 font-bold">H</span>
                                <span className="mx-1 text-zinc-300">|</span>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  placeholder={(emp.totalMinutes % 60).toString()}
                                  value={isAdjusted ? (currentMinutes % 60) : ""}
                                  onChange={(e) => {
                                    const m = Math.min(59, parseInt(e.target.value.replace(/[^0-9]/g, '') || "0"));
                                    const h = Math.floor(currentMinutes / 60);
                                    setManualMinutes(prev => ({ ...prev, [emp.id]: h * 60 + m }));
                                  }}
                                  className="w-8 bg-transparent text-sm font-bold text-center focus:outline-none"
                                />
                                <span className="text-[10px] text-zinc-400 font-bold">M</span>
                              </div>
                              {isAdjusted && (
                                <button 
                                  onClick={() => {
                                    const newManual = { ...manualMinutes };
                                    delete newManual[emp.id];
                                    setManualMinutes(newManual);
                                  }}
                                  className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                                  title="重設為系統計算"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <div className={cn(
                              "text-2xl font-bold transition-colors",
                              isAdjusted ? "text-blue-600" : "text-zinc-900"
                            )}>
                              ${calculateSalary(currentMinutes).toLocaleString()}
                            </div>
                            {isAdjusted && (
                              <div className="text-[10px] text-blue-400 font-bold uppercase tracking-tighter">已手動調整</div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Info Alert */}
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-500 shrink-0" />
              <div className="text-sm text-blue-700">
                <p className="font-semibold mb-1">計算說明</p>
                <ul className="list-disc list-inside space-y-1 opacity-80">
                  <li>薪資計算公式：(總分鐘數 / 60) × 時薪，結果四捨五入至整數。</li>
                  <li>若下班時間早於上班時間，系統會自動判定為跨夜班（加 24 小時）。</li>
                  <li>請確保 CSV 檔案編碼為 UTF-8 以避免亂碼。</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedEmployee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedEmployee(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <div>
                  <h3 className="text-2xl font-bold">{selectedEmployee.name}</h3>
                  <p className="text-sm text-zinc-500">出勤明細紀錄 ({selectedEmployee.records.length} 筆)</p>
                </div>
                <button 
                  onClick={() => setSelectedEmployee(null)}
                  className="p-2 hover:bg-zinc-200 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-4">
                  {selectedEmployee.records.map((record, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 rounded-2xl border border-zinc-100 bg-white hover:border-zinc-200 transition-all">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center",
                          record.isNextDay ? "bg-amber-100" : "bg-zinc-100"
                        )}>
                          {record.isNextDay ? (
                            <AlertCircle className="w-5 h-5 text-amber-600" />
                          ) : (
                            <Calendar className="w-5 h-5 text-zinc-500" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold flex items-center gap-2">
                            {record.date}
                            {record.isNextDay && (
                              <span className="text-[10px] bg-amber-500 text-white px-1.5 py-0.5 rounded-md font-bold animate-pulse">
                                隔日打卡
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-zinc-500 flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            {record.start} - {record.end}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-medium text-zinc-900">
                          {formatHours(record.minutes)}
                        </div>
                        <div className="text-xs text-zinc-400">
                          {(record.minutes / 60).toFixed(1)} 小時
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-zinc-100 bg-zinc-50/50 flex justify-between items-center">
                <div className="flex gap-6">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">總計時數</div>
                    <div className="text-lg font-bold">{formatHours(selectedEmployee.totalMinutes)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">預估薪資</div>
                    <div className="text-lg font-bold text-emerald-600">${calculateSalary(selectedEmployee.totalMinutes).toLocaleString()}</div>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedEmployee(null)}
                  className="px-6 py-2 bg-zinc-900 text-white rounded-xl font-semibold hover:bg-zinc-800 transition-colors"
                >
                  關閉
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
