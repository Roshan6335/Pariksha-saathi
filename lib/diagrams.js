// These diagrams are hand-authored and fixed — never AI-generated — because
// a mislabeled diagram (e.g. a wrong human eye cross-section) is worse than
// no diagram at all for exam prep. The notes API only ever suggests one of
// these exact keys; it can't invent a new diagram.

const INK = "#21283B";
const RED = "#C1443D";
const GOLD = "#C9972B";
const GREEN = "#2F7A4D";
const BLUE = "#3B5BA5";

export const DIAGRAMS = {
  human_eye: {
    label: "Human Eye — Cross Section",
    svg: `<svg viewBox="0 0 420 260" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
      <ellipse cx="220" cy="130" rx="150" ry="105" fill="none" stroke="${INK}" stroke-width="2.5"/>
      <path d="M70 130 Q45 130 45 130 Q45 90 90 75 Q75 100 75 130 Q75 160 90 185 Q45 170 70 130 Z" fill="#EAF0FA" stroke="${BLUE}" stroke-width="2"/>
      <ellipse cx="140" cy="130" rx="16" ry="42" fill="#FDF3DC" stroke="${GOLD}" stroke-width="2.5"/>
      <path d="M108 90 Q140 70 172 90" fill="none" stroke="${INK}" stroke-width="3"/>
      <path d="M108 170 Q140 190 172 170" fill="none" stroke="${INK}" stroke-width="3"/>
      <path d="M350 60 Q380 130 350 200" fill="none" stroke="${RED}" stroke-width="3"/>
      <line x1="370" y1="130" x2="410" y2="130" stroke="${INK}" stroke-width="4"/>
      <line x1="410" y1="130" x2="400" y2="122" stroke="${INK}" stroke-width="4"/>
      <line x1="410" y1="130" x2="400" y2="138" stroke="${INK}" stroke-width="4"/>
      <text x="55" y="65" font-size="13" fill="${BLUE}">Cornea</text>
      <line x1="80" y1="70" x2="80" y2="90" stroke="${BLUE}" stroke-width="1"/>
      <text x="118" y="55" font-size="13" fill="${GOLD}">Lens</text>
      <line x1="140" y1="60" x2="140" y2="88" stroke="${GOLD}" stroke-width="1"/>
      <text x="80" y="230" font-size="13" fill="${INK}">Iris</text>
      <line x1="105" y1="215" x2="105" y2="185" stroke="${INK}" stroke-width="1"/>
      <text x="300" y="240" font-size="13" fill="${RED}">Retina</text>
      <line x1="330" y1="225" x2="345" y2="195" stroke="${RED}" stroke-width="1"/>
      <text x="395" y="115" font-size="12" fill="${INK}" text-anchor="end">Optic nerve</text>
    </svg>`,
  },

  circuit_series: {
    label: "Series Electric Circuit",
    svg: `<svg viewBox="0 0 420 240" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
      <rect x="40" y="40" width="340" height="160" fill="none" stroke="${INK}" stroke-width="3"/>
      <line x1="150" y1="40" x2="150" y2="10" stroke="${INK}" stroke-width="3"/>
      <line x1="230" y1="40" x2="230" y2="10" stroke="${INK}" stroke-width="3"/>
      <line x1="140" y1="10" x2="140" y2="30" stroke="${INK}" stroke-width="5"/>
      <line x1="160" y1="15" x2="160" y2="25" stroke="${INK}" stroke-width="3"/>
      <line x1="220" y1="15" x2="220" y2="25" stroke="${INK}" stroke-width="5"/>
      <line x1="240" y1="10" x2="240" y2="30" stroke="${INK}" stroke-width="3"/>
      <text x="190" y="0" font-size="13" fill="${GOLD}" text-anchor="middle" dy="8">Battery</text>
      <circle cx="380" cy="120" r="26" fill="#FDF3DC" stroke="${GOLD}" stroke-width="2.5"/>
      <line x1="360" y1="102" x2="400" y2="138" stroke="${GOLD}" stroke-width="2"/>
      <line x1="400" y1="102" x2="360" y2="138" stroke="${GOLD}" stroke-width="2"/>
      <text x="380" y="165" font-size="13" fill="${GOLD}" text-anchor="middle">Bulb</text>
      <circle cx="220" cy="200" r="20" fill="#EAF5EE" stroke="${GREEN}" stroke-width="2.5"/>
      <text x="220" y="205" font-size="14" fill="${GREEN}" text-anchor="middle">A</text>
      <text x="220" y="232" font-size="13" fill="${GREEN}" text-anchor="middle">Ammeter</text>
      <line x1="70" y1="40" x2="90" y2="55" stroke="${RED}" stroke-width="3"/>
      <text x="60" y="30" font-size="13" fill="${RED}">Switch (open)</text>
    </svg>`,
  },

  trig_triangle: {
    label: "Right Triangle — Trigonometric Ratios",
    svg: `<svg viewBox="0 0 380 260" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
      <polygon points="50,220 330,220 330,60" fill="none" stroke="${INK}" stroke-width="3"/>
      <rect x="308" y="198" width="22" height="22" fill="none" stroke="${INK}" stroke-width="2"/>
      <path d="M85 220 A35 35 0 0 1 75 195" fill="none" stroke="${RED}" stroke-width="2"/>
      <text x="95" y="205" font-size="16" fill="${RED}">θ</text>
      <text x="185" y="245" font-size="14" fill="${INK}" text-anchor="middle">Adjacent</text>
      <text x="350" y="140" font-size="14" fill="${INK}" text-anchor="middle" transform="rotate(90 350 140)">Opposite</text>
      <text x="180" y="130" font-size="14" fill="${BLUE}" text-anchor="middle" transform="rotate(-30 180 130)">Hypotenuse</text>
      <text x="50" y="15" font-size="12" fill="${GOLD}">sin θ = Opposite / Hypotenuse</text>
      <text x="50" y="32" font-size="12" fill="${GOLD}">cos θ = Adjacent / Hypotenuse</text>
      <text x="50" y="49" font-size="12" fill="${GOLD}">tan θ = Opposite / Adjacent</text>
    </svg>`,
  },

  reflection_ray: {
    label: "Reflection of Light at a Plane Mirror",
    svg: `<svg viewBox="0 0 400 240" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
      <line x1="30" y1="180" x2="370" y2="180" stroke="${INK}" stroke-width="4"/>
      <text x="360" y="205" font-size="12" fill="${INK}" text-anchor="end">Mirror surface</text>
      <line x1="200" y1="180" x2="200" y2="30" stroke="${INK}" stroke-width="1.5" stroke-dasharray="6,5"/>
      <text x="205" y="25" font-size="12" fill="${INK}">Normal</text>
      <line x1="80" y1="60" x2="200" y2="180" stroke="${RED}" stroke-width="2.5"/>
      <polygon points="200,180 185,158 168,168" fill="${RED}"/>
      <text x="80" y="50" font-size="13" fill="${RED}">Incident ray</text>
      <line x1="200" y1="180" x2="320" y2="60" stroke="${GREEN}" stroke-width="2.5"/>
      <polygon points="320,60 300,68 308,85" fill="${GREEN}"/>
      <text x="270" y="50" font-size="13" fill="${GREEN}">Reflected ray</text>
      <path d="M180 160 A28 28 0 0 1 197 140" fill="none" stroke="${RED}" stroke-width="1.5"/>
      <text x="150" y="145" font-size="14" fill="${RED}">i</text>
      <path d="M203 140 A28 28 0 0 1 220 160" fill="none" stroke="${GREEN}" stroke-width="1.5"/>
      <text x="225" y="145" font-size="14" fill="${GREEN}">r</text>
      <text x="90" y="230" font-size="12" fill="${INK}">Law: ∠i = ∠r (angle of incidence = angle of reflection)</text>
    </svg>`,
  },
};

export const DIAGRAM_KEYS = Object.keys(DIAGRAMS);
