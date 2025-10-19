import React, { useState, useMemo } from 'react'
import { displayToken } from '../utils/tokenHelpers'

export default function TokenSelect({ value, onChange, universe }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const query = q.trim().toLowerCase()
  
  const filtered = useMemo(() => {
    const filterTokens = (tokens) => !query ? tokens : tokens.filter(t => 
      (t.label.toLowerCase().includes(query) || (t.searchText || '').includes(query))
    )
    
    const baseGroups = universe.groups.map(g => ({ 
      ...g, 
      tokens: filterTokens(g.tokens || []) 
    }))
    
    const sub = (universe.subGroups || []).map(g => ({ 
      ...g, 
      tokens: filterTokens(g.tokens || []) 
    })).filter(g => g.tokens.length)
    
    return { baseGroups, subGroups: sub }
  }, [universe, query])
  
  const onPick = (id) => { 
    onChange(id)
    setOpen(false)
  }
  
  return (
    <div className="relative">
      <button 
        type="button" 
        onClick={() => setOpen(!open)} 
        className="rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white hover:bg-slate-50 min-w-[12rem] text-left"
      >
        {value ? displayToken(value) : '选择代币'}
      </button>
      
      {open && (
        <div className="absolute z-40 mt-2 w-[22rem] max-h-[22rem] rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
          <div className="p-2 border-b">
            <input 
              autoFocus 
              value={q} 
              onChange={(e) => setQ(e.target.value)} 
              placeholder="搜索 issuer / id / name / leg…" 
              className="w-full rounded-xl border border-slate-300 px-3 py-1.5 text-sm" 
            />
          </div>
          
          <div className="max-h-[18rem] overflow-auto p-2 space-y-3">
            {filtered.baseGroups.map(g => ((g.tokens && g.tokens.length > 0) && (
              <div key={g.key}>
                <div className="text-[11px] text-slate-500 mb-1 px-1">{g.label}</div>
                <div className="grid grid-cols-1 gap-1">
                  {g.tokens.map(t => (
                    <button 
                      key={t.id} 
                      onClick={() => onPick(t.id)} 
                      className="flex items-center justify-between px-3 py-2 rounded-lg border hover:bg-slate-50 text-sm"
                    >
                      <span>{t.label}</span>
                      {value === t.id && <span className="text-xs text-emerald-600">✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            )))}
            
            {filtered.subGroups && filtered.subGroups.length > 0 && (
              <div>
                <div className="text-[11px] text-slate-500 mb-1 px-1">其他资产</div>
                <div className="space-y-2">
                  {filtered.subGroups.map(g => (
                    <div key={g.key} className="rounded-xl border p-2">
                      <div className="text-[11px] text-slate-500 mb-1">{g.label}</div>
                      <div className="grid grid-cols-1 gap-1">
                        {g.tokens.map(t => (
                          <button 
                            key={t.id} 
                            onClick={() => onPick(t.id)} 
                            className="flex items-center justify-between px-3 py-2 rounded-lg border hover:bg-slate-50 text-sm"
                          >
                            <span>{t.label}</span>
                            {value === t.id && <span className="text-xs text-emerald-600">✓</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {!filtered.baseGroups.some(g => g.tokens && g.tokens.length) && 
             (!filtered.subGroups || filtered.subGroups.length === 0) && (
              <div className="text-xs text-slate-500 px-2 py-6 text-center">没有匹配的代币</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
