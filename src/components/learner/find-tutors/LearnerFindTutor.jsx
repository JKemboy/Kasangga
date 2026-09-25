import {useState} from "react";
import {useLearnerWorkspace} from "../workspace/LearnerWorkspace.jsx";
import {
  BookOpen,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronDown,
  FlaskConical,
  GraduationCap,
  Grid2X2,
  List,
  MessageCircle,
  ShieldCheck,
  Star,
} from "lucide-react";

const tutors = [
  [
    "John Michael P.",
    "BS Mathematics",
    "Calculus, Algebra, Statistics",
    "4.9",
    "128",
    "₱350",
    "JM",
  ],
  [
    "Maria Angelica R.",
    "BS Physics",
    "Physics, General Physics",
    "4.8",
    "96",
    "₱400",
    "MA",
  ],
  [
    "Karl Jhon D.",
    "BSIT",
    "Programming, Web Development",
    "4.9",
    "154",
    "₱450",
    "KJ",
  ],
  [
    "Janine Claire T.",
    "BS English",
    "English, Essay Writing",
    "4.7",
    "82",
    "₱300",
    "JC",
  ],
];

const Select = ({ label, value, onChange, options=[] }) => (
  <label className="block text-xs font-semibold">
    <span>{label}</span>
    <span className="relative mt-1.5 block">
      <select
        value={value}
        onChange={e=>onChange(e.target.value)}
        className="h-9 w-full appearance-none rounded-md border border-[#dfe5ed] bg-white px-3 text-xs font-normal text-[#637191] outline-none"
      >
        {options.map(v=><option key={v}>{v}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-[#405276]" />
    </span>
  </label>
);

export default function LearnerFindTutor() {
  const work=useLearnerWorkspace();
  const [subject,setSubject]=useState("All Subjects"),[level,setLevel]=useState("All Levels"),[availability,setAvailability]=useState("All Availability"),[sort,setSort]=useState("Highest Rated"),[category,setCategory]=useState(""),[list,setList]=useState(false);
  const rows=tutors.filter(t=>(subject==="All Subjects"||t[2].toLowerCase().includes(subject.toLowerCase()))&&(!category||(category==="STEM"?/Calculus|Physics|Statistics/.test(t[2]):category==="IT & Computer Science"?/Programming/.test(t[2]):category==="Languages"?/English/.test(t[2]):false))).sort((a,b)=>sort==="Lowest Rate"?Number(a[5].replace(/[^0-9.]/g,""))-Number(b[5].replace(/[^0-9.]/g,"")):Number(b[3])-Number(a[3]));
  const record=(name,degree,subjects,rating,price)=>({name,degree,subjects,rating,price});
  return (
    <section className="mx-auto max-w-[1400px] px-4 py-3 lg:px-5">
      <h1 className="text-2xl font-bold tracking-[-1px] text-[#101828]">
        Find a Tutor
      </h1>
      <p className="mt-1 text-xs font-medium text-[#566aa3]">
        Discover verified CSU student tutors and find the perfect match for your
        learning goals.
      </p>
      <div className="mt-1 flex items-center gap-2 rounded-xl bg-[linear-gradient(100deg,#e9f8ef,#f1faf5)] px-3 py-2">
        <ShieldCheck className="h-6 w-6 shrink-0 text-[#087542]" />
        <div>
          <p className="font-bold text-[#087542]">Verified Tutors</p>
          <p className="text-xs text-[#405276]">
            All tutors have undergone credential verification to ensure a safe
            and reliable learning experience.
          </p>
        </div>
      </div>
      <section className="mt-1 rounded-xl border border-[#e0e7f0] bg-white p-2">
        <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
          <Select label="Subject" value={subject} onChange={setSubject} options={["All Subjects","Programming","Calculus","Physics","Statistics","English"]}/>
          <Select label="Level" value={level} onChange={setLevel} options={["All Levels","College"]}/>
          <Select label="Availability" value={availability} onChange={setAvailability} options={["All Availability","Online Now"]}/>
          <Select label="Sort By" value={sort} onChange={setSort} options={["Highest Rated","Lowest Rate"]}/>
        </div>
        <p className="mt-1 text-xs font-semibold">Popular Subjects</p>
        <div className="mt-1 flex flex-wrap gap-2">
          {[
            "Programming",
            "Calculus",
            "Physics",
            "Chemistry",
            "Statistics",
            "Accounting",
            "English",
            "More",
          ].map((item) => (
            <button
              key={item}
              onClick={()=>setSubject(item==="More"||subject===item?"All Subjects":item)}
              aria-pressed={subject===item}
              type="button"
              className="h-7 rounded-md border border-[#e1e7ef] px-2 text-xs hover:bg-slate-50"
            >
              {item}
              {item === "More" && (
                <ChevronDown className="ml-3 inline h-4 w-4" />
              )}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs font-semibold">Tutor Categories</p>
        <div className="mt-1 grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {[
            [FlaskConical, "STEM"],
            [GraduationCap, "IT & Computer Science"],
            [BriefcaseBusiness, "Business"],
            [MessageCircle, "Languages"],
            [BookOpen, "Education"],
            [Grid2X2, "Others"],
          ].map(([Icon, label]) => (
            <button
              key={label}
              onClick={()=>setCategory(category===label?"":label)}
              aria-pressed={category===label}
              type="button"
              className="flex min-h-9 items-center justify-center gap-1.5 rounded-md border border-[#e1e7ef] px-2 py-1 text-xs hover:bg-slate-50"
            >
              <Icon className="h-4 w-4 shrink-0 text-[#087542]" />
              {label}
            </button>
          ))}
        </div>
      </section>
      <div className="mt-3 flex items-center justify-between">
        <p className="text-sm font-bold">{rows.length} tutors found</p>
        <div className="flex items-center gap-2 text-xs text-[#637191]">
          View{" "}
          <button aria-label="Grid view" onClick={()=>setList(false)} className="grid h-7 w-8 place-items-center rounded-md bg-[#087542] text-white">
            <Grid2X2 className="h-5 w-5" />
          </button>
          <button aria-label="List view" onClick={()=>setList(true)} className="grid h-7 w-8 place-items-center rounded-md border border-[#dfe5ed]">
            <List className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className={list ? "mt-1 grid gap-2" : "mt-1 grid gap-2 sm:grid-cols-2 lg:grid-cols-4"}>
        {rows.map(
          ([name, degree, subjects, rating, reviews, price, initials]) => (
            <article
              key={name}
              className="relative rounded-xl border border-[#e0e7f0] bg-white px-3 pb-2 pt-6 text-center"
            >
              <span className="absolute left-2 top-2 rounded-full bg-[#dff8e8] px-2 py-0.5 text-xs font-semibold text-[#087542]">
                • Online
              </span>
              <button
                type="button"
                aria-label={`Save ${name}`}
                aria-pressed={work.data.saved.some(t=>t.name===name)}
                onClick={()=>work.toggleSave(record(name,degree,subjects,rating,price))}
                className="absolute right-2 top-2 text-[#087542]"
              >
                <BookOpen className="h-4 w-4" />
              </button>
              <div className="mx-auto grid h-8 w-8 place-items-center rounded-full bg-[linear-gradient(145deg,#e5e7eb,#cbd5e1)] text-xl font-bold text-[#405276]">
                {initials}
              </div>
              <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#dff8e8] px-2 py-0.5 text-xs font-semibold text-[#087542]">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Verified
              </div>
              <h2 className="mt-1 text-sm font-bold">{name}</h2>
              <p className="text-xs text-[#566584]">{degree}</p>
              <p className="mt-1 min-h-7 text-xs leading-4 text-[#637191]">
                {subjects}
              </p>
              <p className="mt-1 text-xs text-[#637191]">
                <Star className="mr-1 inline h-4 w-4 fill-[#ffb800] text-[#ffb800]" />
                {rating} ({reviews} reviews)
              </p>
              <p className="mt-1 text-sm font-bold text-[#087542]">
                {price}
                <span className="font-normal text-[#637191]"> / hour</span>
              </p>
              <div className="mt-1 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={()=>work.open("profile",record(name,degree,subjects,rating,price))}
                  className="h-7 rounded-md border border-[#15924f] text-xs font-semibold text-[#087542]"
                >
                  View Profile
                </button>
                <button
                  type="button"
                  onClick={()=>work.open("book",record(name,degree,subjects,rating,price))}
                  className="h-7 rounded-md bg-[#087542] text-xs font-semibold text-white"
                >
                  Book Now
                </button>
              </div>
            </article>
          ),
        )}
      </div>
      {(!rows.length||subject!=="All Subjects"||category)&&<button className="mt-2 text-xs text-green-800" onClick={()=>{setSubject("All Subjects");setCategory("");setLevel("All Levels");setAvailability("All Availability");}}>Reset Filters</button>}
    </section>
  );
}
