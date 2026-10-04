// Demo profile content supplied in the reference designs.
export const profileSamples = {
  "Maria Angelica R.": {
    degree: "BS Mathematics, 3rd Year",
    verified: true,
    online: true,
    rating: 4.8,
    reviews: 96,
    completed: 164,
    rate: 400,
    about:
      "Physics major who loves turning formulas into pictures. I use worked examples and quick concept checks, and I adjust the pace to how you learn.",
    expertise: ["General Physics", "Mechanics", "Calculus 1", "Statistics"],
    services: [
      {
        name: "Physics",
        category: "STEM",
        rate: 400,
        topics: [
          "Kinematics",
          "Newton's Laws of Motion",
          "Work, Energy and Power",
        ],
      },
      {
        name: "Calculus 1",
        category: "STEM",
        rate: 400,
        topics: ["Derivatives", "Limits", "Applications of Derivatives"],
      },
      {
        name: "Statistics",
        category: "STEM",
        rate: 400,
        topics: ["Probability Distributions", "Descriptive Statistics"],
      },
    ],
    types: ["Online", "In-person"],
    platform: "Zoom",
    location: "CSU Science Building, Room 204",
    levels: ["Introductory", "Intermediate"],
    weeklyAvailability: {
      Tue: "1 PM–5 PM",
      Thu: "1 PM–5 PM",
      Sat: "9 AM–12 PM",
    },
    reviewEntries: [
      {
        name: "Juan Dela Cruz",
        date: "Sep 13, 2026",
        rating: 5,
        text: "Excellent tutor! Explained the concepts clearly and made difficult topics easy to understand.",
      },
      {
        name: "Paolo S.",
        date: "Aug 26, 2026",
        rating: 5,
        text: "Kinematics finally makes sense.",
      },
    ],
  },
};
