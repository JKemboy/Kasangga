import { Bookmark, CheckCircle2, Star } from "lucide-react";
import { savedService } from "../../../services/savedTutors.js";
import PortalAvatar from "../../shared/PortalAvatar.jsx";
import { useLearnerWorkspace } from "../workspace/LearnerWorkspace.jsx";
import "./tutor-service-card.css";
export default function TutorServiceCard({ tutor, service, list = false }) {
  const work = useLearnerWorkspace();
  const { name, degree, rating } = tutor;
  const bookmark = savedService(tutor, service);
  const courseCode = (service.subtitle || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/([a-z])\s*(\d)/gi, "$1 $2")
    .toUpperCase();
  return (
    <article
      className={`tutor-service-card relative flex h-full min-w-0 flex-col rounded-xl border border-[#e0e7f0] transition-[border-color,box-shadow] hover:border-[#22c55e] focus-within:border-[#22c55e] bg-white px-3 pb-2 pt-8 text-center ${list ? "lg:grid lg:items-center lg:gap-4 lg:text-left lg:grid-cols-[90px_minmax(0,1fr)_220px]" : ""}`}
    >
      <span className="absolute left-2 top-2 rounded-full bg-[#dff8e8] px-2 py-0.5 text-xs text-[#087542]">
        {service.type === "Both" ? "Online / In-person" : service.type}
      </span>
      <button
        type="button"
        aria-label={`${work.isSaved(bookmark) ? "Unsave" : "Save"} ${service.name} by ${name}`}
        title={work.isSaved(bookmark) ? "Unsave service" : "Save service"}
        aria-pressed={work.isSaved(bookmark)}
        disabled={work.savedLoading || work.isSaving(bookmark)}
        onClick={() => work.toggleSave(bookmark)}
        className="absolute right-1 top-1 grid h-8 w-8 place-items-center rounded-md text-[#087542] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087542]"
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
          className="mx-auto grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-[linear-gradient(145deg,#e5e7eb,#cbd5e1)] text-base font-bold text-[#405276]"
        />
        <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#dff8e8] px-2 py-0.5 text-xs font-semibold text-[#087542]">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Verified
        </div>
      </div>
      <div className="min-w-0 [overflow-wrap:anywhere]">
        <h2 className="tutor-service-title mt-1 text-sm font-bold">
          {[courseCode, service.name].filter(Boolean).join(" - ")}
        </h2>
        {service.description && (
          <p className="tutor-service-description mt-1 whitespace-pre-line break-words text-xs leading-4 text-[#637191]">
            {service.description}
          </p>
        )}
        <p className="tutor-service-name mt-2 text-xs font-semibold">{name}</p>
        <p className="tutor-service-degree text-xs text-[#566584]">{degree}</p>
      </div>
      <div className="mt-auto min-w-0 pt-1">
        <p className="tutor-service-rating mt-1 text-xs text-[#637191]">
          <Star className="mr-1 inline h-4 w-4 fill-[#ffb800] text-[#ffb800]" />
          {rating ? Number(rating).toFixed(1) : "No ratings yet"}
          {Number.isInteger(tutor.reviewCount) && (
            <span className="ml-1">
              ({tutor.reviewCount}{" "}
              {tutor.reviewCount === 1 ? "review" : "reviews"})
            </span>
          )}
        </p>
        <p className="tutor-service-rate mt-1 text-sm font-bold text-[#087542]">
          {"\u20b1"}
          {service.rate.toLocaleString()}
          <span className="font-normal text-[#637191]"> / hour</span>
        </p>
        <div className="mt-1 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => work.open("profile", bookmark)}
            className="min-h-8 cursor-pointer rounded-md border border-[#15924f] px-2 py-1 text-xs font-semibold text-[#087542] transition-colors hover:bg-[#e5f5eb] active:bg-[#ccebd8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087542]"
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
            className="min-h-8 cursor-pointer rounded-md bg-[#087542] px-2 py-1 text-xs font-semibold text-white transition-colors hover:bg-[#065c34] active:bg-[#004727] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087542]"
          >
            Book Now
          </button>
        </div>
      </div>
    </article>
  );
}
