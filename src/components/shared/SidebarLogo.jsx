import "./sidebar-logo.css";

export default function SidebarLogo() {
  return (
    <span
      className="sidebar-logo"
      role="img"
      aria-label="Kasangga — Peer Tutoring, Caraga State University"
    >
      <img src="/images/kasangga-logo.png" alt="" />
      <img
        className="sidebar-logo-text"
        src="/images/kasangga-logo.png"
        alt=""
        aria-hidden="true"
      />
    </span>
  );
}
