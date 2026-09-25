import {useState,useRef,useEffect} from "react";
import {useLearnerWorkspace} from "../workspace/LearnerWorkspace.jsx";
import {
  Filter,
  Info,
  MessageCircle,
  Paperclip,
  Search,
  Send,
  Smile,
} from "lucide-react";

export default function LearnerMessages() {
 const work=useLearnerWorkspace();const [selected,setSelected]=useState(work.data.threads.at(-1)?.name||""),[query,setQuery]=useState(""),[unread,setUnread]=useState(false),[draft,setDraft]=useState(""),[attachment,setAttachment]=useState(null),[error,setError]=useState("");const picker=useRef(null),bottom=useRef(null);const thread=work.data.threads.find(t=>t.name===selected);
 useEffect(()=>{bottom.current?.scrollIntoView({block:"nearest"});},[selected,thread?.messages.length]);
 function send(){if(!thread||(!draft.trim()&&!attachment))return;if(work.commit(d=>({...d,threads:d.threads.map(t=>t.name===selected?{...t,messages:[...t.messages,{text:draft.trim(),attachment,mine:true,at:new Date().toISOString(),local:true}]}:t)}))){setDraft("");setAttachment(null);}}
  return (
    <section className="mx-auto flex h-[calc(100dvh-58px)] min-h-[440px] max-w-[1400px] flex-col px-3 py-2 lg:px-3">
      <h1 className="text-2xl font-bold tracking-[-1px] text-[#101828]">
        Messages
      </h1>
      <p className="mt-1 text-xs font-medium text-[#173a9b]">
        Communicate with your tutors and manage your conversations.
      </p>
      <div className="mt-3 grid min-h-0 flex-1 grid-rows-[140px_minmax(0,1fr)] overflow-hidden rounded-xl border border-[#e0e7f0] bg-white shadow-[0_1px_3px_rgba(15,23,42,.03)] lg:grid-cols-[280px_minmax(0,1fr)] lg:grid-rows-1">
        <aside
          className="flex min-h-0 flex-col overflow-y-auto border-b border-[#e5ebf1] lg:border-b-0 lg:border-r"
          aria-label="Conversations"
        >
          <div className="flex gap-2 border-b border-[#e5ebf1] p-3">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Search conversations</span>
              <input
                type="search"
                value={query} onChange={e=>setQuery(e.target.value)}
                placeholder="Search conversations..."
                className="h-9 w-full rounded-md border border-[#dbe3ed] pl-9 pr-3 text-xs outline-none focus:border-[#087542] focus:ring-2 focus:ring-[#087542]/15"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#405276]" />
            </label>
            <button
              type="button"
              aria-label="Filter conversations" aria-pressed={unread} onClick={()=>setUnread(!unread)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-[#dbe3ed] text-[#173a9b] hover:bg-slate-50"
            >
              <Filter className="h-5 w-5" />
            </button>
          </div>
          {work.data.threads.filter(t=>t.name.toLowerCase().includes(query.toLowerCase())&&(!unread||t.unread)).map(t=><button key={t.name} className="border-b p-3 text-left text-xs" onClick={()=>{setSelected(t.name);setDraft('');setAttachment(null);work.commit(d=>({...d,threads:d.threads.map(x=>x.name===t.name?{...x,unread:0}:x)}));}}><b>{t.name}</b><p className="truncate text-slate-500">{t.messages.at(-1)?.text||'No messages yet'}</p></button>)}
          {!work.data.threads.length&&<p className="p-3 text-center text-xs text-slate-400">No conversations yet.</p>}
        </aside>
        <section
          className="flex min-h-0 min-w-0 flex-col"
          aria-label="Chat conversation"
        >
          <div className="flex min-h-16 shrink-0 items-center border-b border-[#e5ebf1] px-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-300">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-semibold text-slate-300">
                {thread?.name||"Select a conversation"}
              </p>
              <p className="mt-1 text-xs text-slate-300">
                Your messages will appear here.
              </p>
            </div>
          </div>
          <div className="flex min-h-0 flex-1 items-center overflow-y-auto justify-center px-3 text-center text-xs text-slate-400">
            {thread?<div className="w-full space-y-2 py-3 text-left">{thread.messages.map((m,i)=><div key={i} className={`rounded-lg p-3 ${m.mine?"ml-8 bg-green-50":"mr-8 bg-slate-100"}`}><p className="whitespace-pre-wrap break-words">{m.text}</p>{m.attachment&&<p>Attachment: {m.attachment.name}</p>}<small>{m.local?"Saved locally":m.at}</small></div>)}<div ref={bottom}/></div>:<p>Choose a conversation to start messaging.</p>}
          </div>
          <div className="shrink-0 border-t border-[#e5ebf1] p-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Attach file" disabled={!thread} onClick={()=>picker.current?.click()}
                className="grid h-9 w-6 shrink-0 place-items-center text-slate-400"
              >
                <Paperclip className="h-5 w-5" />
              </button>
              <div className="relative min-w-0 flex-1">
                <input
                  disabled={!thread} value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();send();}}} maxLength={3000}
                  placeholder="Type your message..."
                  className="h-9 w-full rounded-md border border-[#dbe3ed] bg-white px-4 pr-11 text-xs text-slate-400 disabled:cursor-not-allowed"
                />
                <button aria-label="Add smile emoji" disabled={!thread} onClick={()=>setDraft(d=>d+" \u{1F642}")} className="absolute right-3 top-2.5"><Smile className="h-4 w-4 text-slate-400"/></button>
              </div>
              <button
                disabled={!thread||(!draft.trim()&&!attachment)} onClick={send}
                type="button"
                className="flex h-9 w-14 shrink-0 items-center justify-center gap-1 rounded-md bg-[#087542] text-xs font-semibold text-white opacity-45"
              >
                <Send className="h-4 w-4" />
                Send
              </button>
            </div>
            <input hidden ref={picker} type="file" accept="image/*,.pdf" onChange={e=>{const f=e.target.files?.[0];if(!f)return;if(f.size>5*1024*1024)return setError("Choose a file under 5 MB.");setAttachment({name:f.name,type:f.type,size:f.size});setError("");}}/>{attachment&&<p className="mt-2 text-xs">{attachment.name} <button onClick={()=>setAttachment(null)}>Remove attachment</button></p>}{error&&<p role="alert">{error}</p>}
            <div className="mt-2 flex gap-2 rounded-md bg-[#effcf5] px-3 py-2 text-xs text-[#53627b]">
              <Info className="h-4 w-4 shrink-0 text-[#087542]" />
              <p>
                Keep your communication within CampusTutor for your safety.
                <br />
                Do not share personal contact information.
              </p>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
