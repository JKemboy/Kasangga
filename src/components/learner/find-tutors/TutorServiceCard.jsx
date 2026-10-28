import { Bookmark, CheckCircle2, Star } from "lucide-react";
import { savedService } from "../../../services/savedTutors.js";
import PortalAvatar from "../../shared/PortalAvatar.jsx";
import { useLearnerWorkspace } from "../workspace/LearnerWorkspace.jsx";
export default function TutorServiceCard({ tutor, service, list = false }) {
  const work = useLearnerWorkspace();
  const { name, degree, rating } = tutor;
  const bookmark = savedService(tutor, service);
  const session = work.data.sessions
    .filter((record) =>
      record.serviceId != null
        ? String(record.serviceId) === String(service.id)
        : Boolean(tutor.userId) &&
          record.tutorUserId === tutor.userId &&
          record.course === service.name,
    )
    .sort((a, b) => new Date(b.startAt) - new Date(a.startAt))[0];
  return (
    <article
      className={`relative rounded-xl border border-[#e0e7f0] transition-[border-color,box-shadow] hover:border-[#22c55e] focus-within:border-[#22c55e] bg-white px-3 pb-2 pt-8 ${list ? "grid items-center gap-4 text-left md:grid-cols-[90px_minmax(0,1fr)_220px]" : "text-center"}`}
    >
      <span className="absolute left-2 top-2 rounded-full bg-[#dff8e8] px-2 py-0.5 text-xs text-[#087542]">
        {service.type === "Both" ? "Online / In-person" : service.type}
      </span>
      <button
        type="button"
        aria-label={`Save ${name}`}
        aria-pressed={work.isSaved(bookmark)}
        disabled={work.savedLoading || work.isSaving(bookmark)}
        onClick={() => work.toggleSave(bookmark)}
        className="absolute right-2 top-2 text-[#087542]"
      >
        <Bookmark
          className="h-4 w-4"
          fill={work.isSaved(bookmark) ? "#087542" : "none"}
        />
      </button>
      <div>
        <PortalAvatar
          name={name}
          userId={tutor.avatarUserId}
          className="mx-auto grid h-14 w-14 place-items-center overflow-hidden rounded-full bg-[linear-gradient(145deg,#e5e7eb,#cbd5e1)] text-base font-bold text-[#405276]"
        />
        <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#dff8e8] px-2 py-0.5 text-xs font-semibold text-[#087542]">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Verified
        </div>
      </div>
      <div>
        <h2 className="mt-2 text-sm font-bold">{service.name}</h2>
        <p className="mt-1 text-xs font-semibold">{name}</p>
        <p className="text-xs text-[#566584]">{degree}</p>
        <p className="mt-1 min-h-7 text-xs leading-4 text-[#637191]">
          {service.subtitle}
        </p>
        <p className="mt-1 text-xs text-[#637191]">
          <Star className="mr-1 inline h-4 w-4 fill-[#ffb800] text-[#ffb800]" />
          {rating ? Number(rating).toFixed(1) : "No ratings yet"}
          {Number.isInteger(tutor.reviewCount) && (
            <span className="ml-1">
              ({tutor.reviewCount}{" "}
              {tutor.reviewCount === 1 ? "review" : "reviews"})
            </span>
          )}
        </p>
      </div>
      <div>
        <p className="mt-1 text-sm font-bold text-[#087542]">
          {"\u20b1"}
          {service.rate.toLocaleString()}
          <span className="font-normal text-[#637191]"> / hour</span>
        </p>
        <div className="mt-1 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => work.open("profile", bookmark)}
            className="min-h-8 cursor-pointer rounded-md border border-[#15924f] px-2 text-xs font-semibold text-[#087542] transition-colors hover:bg-[#e5f5eb] active:bg-[#ccebd8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087542]"
          >
            View Profile
          </button>
          <button
            type="button"
            onClick={() =>
              work.open("book", {
                ...bookmark,
              })
            }
            className="min-h-8 cursor-pointer rounded-md bg-[#087542] px-2 text-xs font-semibold text-white transition-colors hover:bg-[#065c34] active:bg-[#004727] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087542]"
          >
            Book Now
          </button>
          <button
            type="button"
            disabled={!session}
            title={
              session
                ? "View your most recent session for this service"
                : "No booked session for this service yet"
            }
            onClick={() => session && work.open("details", session)}
            className="col-span-2 min-h-8 cursor-pointer rounded-md border border-[#15924f] px-2 text-xs font-semibold text-[#087542] transition-colors hover:bg-[#e5f5eb] active:bg-[#ccebd8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087542] disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
          >
            View Session
          </button>
        </div>
      </div>
    </article>
  );
}
