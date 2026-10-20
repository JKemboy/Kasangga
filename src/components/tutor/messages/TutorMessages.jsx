import {
  Filter,
  Info,
  MessageCircle,
  Paperclip,
  Search,
  Send,
  Smile,
} from "lucide-react";

export default function TutorMessages() {
  return (
    <section className="mx-auto max-w-[1400px] px-5 py-6 lg:px-7">
      <h1 className="text-3xl font-bold tracking-[-1px] text-[#101828]">
        Messages
      </h1>
      <p className="mt-1 text-sm font-medium text-[#173a9b]">
        Communicate with your students and manage your conversations.
      </p>
      <div className="mt-4 grid min-h-[670px] overflow-hidden rounded-xl border border-[#e0e7f0] bg-white shadow-[0_1px_3px_rgba(15,23,42,.03)] lg:grid-cols-[440px_minmax(0,1fr)]">
        <aside
          className="border-b border-[#e5ebf1] lg:border-b-0 lg:border-r"
          aria-label="Conversations"
        >
          <div className="flex gap-3 border-b border-[#e5ebf1] p-4">
            <label className="relative flex-1">
              <span className="sr-only">Search conversations</span>
              <input
                type="search"
                placeholder="Search conversations..."
                className="h-12 w-full rounded-md border border-[#dbe3ed] pl-11 pr-3 text-sm outline-none focus:border-[#087542] focus:ring-2 focus:ring-[#087542]/15"
              />
              <Search className="absolute left-3 top-3.5 h-5 w-5 text-[#405276]" />
            </label>
            <button
              type="button"
              aria-label="Filter conversations"
              className="grid h-12 w-12 place-items-center rounded-md border border-[#dbe3ed] text-[#173a9b] hover:bg-slate-50"
            >
              <Filter className="h-5 w-5" />
            </button>
          </div>
          <div className="grid min-h-48 place-items-center px-6 text-center text-sm text-slate-400">
            <div>
              <MessageCircle className="mx-auto mb-3 h-9 w-9 text-slate-300" />
              <p>No conversations yet.</p>
            </div>
          </div>
        </aside>
        <section
          className="flex min-h-[450px] flex-col"
          aria-label="Chat conversation"
        >
          <div className="flex min-h-24 items-center border-b border-[#e5ebf1] px-5">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-slate-100 text-slate-300">
              <MessageCircle className="h-7 w-7" />
            </div>
            <div className="ml-4">
              <p className="text-lg font-semibold text-slate-300">
                Select a conversation
              </p>
              <p className="mt-1 text-sm text-slate-300">
                Your messages will appear here.
              </p>
            </div>
          </div>
          <div className="flex flex-1 items-center justify-center px-5 text-center text-sm text-slate-400">
            <p>Choose a conversation to start messaging.</p>
          </div>
          <div className="border-t border-[#e5ebf1] p-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Attach file"
                className="grid h-11 w-8 place-items-center text-slate-400"
              >
                <Paperclip className="h-5 w-5" />
              </button>
              <div className="relative flex-1">
                <input
                  disabled
                  placeholder="Type your message..."
                  className="h-12 w-full rounded-md border border-[#dbe3ed] bg-white px-4 pr-11 text-sm text-slate-400 disabled:cursor-not-allowed"
                />
                <Smile className="absolute right-3 top-3.5 h-5 w-5 text-slate-400" />
              </div>
              <button
                disabled
                type="button"
                className="flex h-12 w-16 items-center justify-center gap-1 rounded-md bg-[#087542] text-xs font-semibold text-white opacity-45"
              >
                <Send className="h-4 w-4" />
                Send
              </button>
            </div>
            <div className="mt-3 flex gap-3 rounded-md bg-[#effcf5] px-4 py-3 text-xs text-[#53627b]">
              <Info className="h-6 w-6 shrink-0 text-[#087542]" />
              <p>
                Keep your communication within Kasangga for your safety.
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
