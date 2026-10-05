export type Role = "BATTER" | "BOWLER" | "ALL_ROUNDER" | "WICKETKEEPER";

export type PlayerSeed = {
  id: string;
  name: string;
  shortName: string;
  country: string;
  role: Role;
  battingStyle: string | null;
  bowlingStyle: string | null;
  isOverseas: boolean;
  capped: boolean;
  age: number | null;
  basePrice: number;
  megaBasePrice: number;
  actual2026Price: number | null;
  actual2026TeamId: string | null;
  acquisition: string;
  setCode: string;
  battingMatches: number | null;
  battingInns: number | null;
  runs: number | null;
  battingAvg: number | null;
  strikeRate: number | null;
  fours: number | null;
  sixes: number | null;
  fifties: number | null;
  hundreds: number | null;
  bowlingMatches: number | null;
  overs: number | null;
  wickets: number | null;
  economy: number | null;
  bowlingAvg: number | null;
  bowlingSr: number | null;
  bestBowling: string | null;
  statsSource: string;
  statsSourceUrl: string | null;
  statsVerifiedAt: string | null;
  dataNotes: string | null;
};

const L = 100_000;
const C = 10_000_000;
const INR = (lakhs: number) => lakhs * L;

type Bat = {
  m: number;
  i?: number;
  r: number;
  avg: number;
  sr: number;
  f: number;
  s: number;
  fifties?: number;
  hundreds?: number;
};

type Bowl = {
  m: number;
  o: number;
  w: number;
  eco: number;
  avg: number;
  sr?: number;
  best: string;
};

const IPL_STATS_URL = "https://www.ipl.com/series/indian-premier-league-2026-129908/stats";
const IPL_DATE = "2026-09-13";

const BAT: Record<string, Bat> = {
  "Vaibhav Sooryavanshi": { m: 16, r: 776, avg: 48.5, sr: 237.31, f: 63, s: 72, fifties: 5, hundreds: 1 },
  "Shubman Gill": { m: 16, r: 732, avg: 45.75, sr: 163.03, f: 74, s: 33, fifties: 6, hundreds: 1 },
  "Sai Sudharsan": { m: 17, r: 722, avg: 45.13, sr: 157.99, f: 75, s: 30, fifties: 8, hundreds: 1 },
  "Virat Kohli": { m: 16, r: 675, avg: 56.25, sr: 165.85, f: 73, s: 25, fifties: 5, hundreds: 1 },
  "Heinrich Klaasen": { m: 15, r: 624, avg: 48, sr: 160, f: 48, s: 31, fifties: 6, hundreds: 0 },
  "Ishan Kishan": { m: 15, r: 602, avg: 40.13, sr: 182.42, f: 60, s: 32, fifties: 6, hundreds: 0 },
  "KL Rahul": { m: 14, r: 593, avg: 45.62, sr: 174.41, f: 56, s: 31, fifties: 5, hundreds: 0 },
  "Abhishek Sharma": { m: 15, r: 563, avg: 40.21, sr: 204.73, f: 50, s: 43 },
  "Mitchell Marsh": { m: 13, r: 563, avg: 43.31, sr: 163.19, f: 51, s: 36 },
  "Jos Buttler": { m: 17, r: 526, avg: 37.57, sr: 152.46, f: 51, s: 26 },
  "Dhruv Jurel": { m: 16, r: 515, avg: 36.79, sr: 154.65, f: 47, s: 24 },
  "Prabhsimran Singh": { m: 14, i: 13, r: 510, avg: 42.5, sr: 168.87, f: 55, s: 23 },
  "Rajat Patidar": { m: 15, i: 14, r: 501, avg: 41.75, sr: 192.69, f: 30, s: 42 },
  "Shreyas Iyer": { m: 14, i: 13, r: 498, avg: 55.33, sr: 168.81, f: 39, s: 30 },
  "Cooper Connolly": { m: 14, i: 13, r: 491, avg: 44.64, sr: 163.12, f: 43, s: 32 },
  "Sanju Samson": { m: 14, r: 477, avg: 43.36, sr: 165.63, f: 53, s: 24 },
  "Devdutt Padikkal": { m: 16, i: 15, r: 464, avg: 33.14, sr: 168.73, f: 49, s: 24 },
  "Ryan Rickelton": { m: 12, r: 448, avg: 40.73, sr: 186.67, f: 31, s: 38 },
  "Yashasvi Jaiswal": { m: 16, r: 427, avg: 30.5, sr: 152.5, f: 52, s: 18 },
  "Angkrish Raghuvanshi": { m: 13, i: 12, r: 422, avg: 42.2, sr: 146.53, f: 40, s: 19 },
  "Travis Head": { m: 15, r: 410, avg: 27.33, sr: 170.12, f: 46, s: 23 },
  "Washington Sundar": { m: 17, i: 16, r: 377, avg: 37.7, sr: 150.2, f: 40, s: 12 },
  "Priyansh Arya": { m: 13, r: 364, avg: 28, sr: 211.63, f: 27, s: 32 },
  "Tilak Varma": { m: 14, r: 359, avg: 29.92, sr: 145.93, f: 30, s: 17 },
  "Finn Allen": { m: 11, r: 349, avg: 34.9, sr: 214.11, f: 33, s: 28 },
  "Ruturaj Gaikwad": { m: 14, r: 337, avg: 28.08, sr: 123.44, f: 29, s: 12 },
  "Ajinkya Rahane": { m: 14, r: 335, avg: 25.77, sr: 135.08, f: 25, s: 18 },
  "Cameron Green": { m: 14, r: 322, avg: 32.2, sr: 145.7, f: 22, s: 17 },
  "Naman Dhir": { m: 14, r: 318, avg: 26.5, sr: 147.22, f: 31, s: 13 },
  "Donovan Ferreira": { m: 15, i: 13, r: 317, avg: 35.22, sr: 179.1, f: 25, s: 23 },
  "Rishabh Pant": { m: 14, i: 13, r: 312, avg: 28.36, sr: 138.05, f: 30, s: 11 },
  "Riyan Parag": { m: 14, r: 309, avg: 23.77, sr: 157.65, f: 24, s: 21 },
  "Tim David": { m: 16, i: 15, r: 305, avg: 33.89, sr: 188.27, f: 22, s: 23 },
  "Nitish Kumar Reddy": { m: 14, i: 13, r: 302, avg: 30.2, sr: 171.59, f: 19, s: 21 },
  "Rinku Singh": { m: 14, i: 11, r: 295, avg: 59, sr: 148.99, f: 27, s: 11 },
  "Kartik Sharma": { m: 11, r: 295, avg: 32.78, sr: 136.57, f: 24, s: 16 },
  "Rohit Sharma": { m: 9, r: 283, avg: 35.38, sr: 157.22, f: 21, s: 21 },
  "Pathum Nissanka": { m: 10, r: 278, avg: 27.8, sr: 158.86, f: 33, s: 12 },
  "Tristan Stubbs": { m: 14, i: 13, r: 275, avg: 34.38, sr: 127.31, f: 18, s: 9 },
  "Shivam Dube": { m: 13, i: 12, r: 270, avg: 38.57, sr: 158.82, f: 24, s: 15 },
  "Suryakumar Yadav": { m: 13, r: 270, avg: 20.77, sr: 147.54, f: 28, s: 10 },
  "Josh Inglis": { m: 5, r: 266, avg: 53.2, sr: 186.01, f: 32, s: 12 },
  "Ravindra Jadeja": { m: 14, i: 11, r: 266, avg: 66.5, sr: 135.03, f: 24, s: 5 },
  "Sameer Rizvi": { m: 11, i: 9, r: 252, avg: 36, sr: 147.37, f: 15, s: 17 },
  "Nicholas Pooran": { m: 14, r: 234, avg: 18, sr: 127.87, f: 11, s: 19 },
  "Aiden Markram": { m: 12, i: 11, r: 231, avg: 25.67, sr: 138.32, f: 20, s: 11 },
  "Krunal Pandya": { m: 16, i: 9, r: 226, avg: 37.67, sr: 145.81, f: 20, s: 11 },
  "Nitish Rana": { m: 9, r: 225, avg: 25, sr: 151.01, f: 27, s: 10 },
  "Marcus Stoinis": { m: 13, i: 9, r: 216, avg: 36, sr: 180, f: 23, s: 11 },
  "Ayush Badoni": { m: 10, r: 215, avg: 21.5, sr: 152.48, f: 23, s: 9 },
};

const BOWL: Record<string, Bowl> = {
  "Kagiso Rabada": { m: 17, o: 64.4, w: 29, eco: 9.68, avg: 21.58, best: "3/25" },
  "Bhuvneshwar Kumar": { m: 16, o: 63, w: 28, eco: 7.95, avg: 17.89, best: "4/23" },
  "Jofra Archer": { m: 16, o: 60, w: 25, eco: 9.31, avg: 22.36, best: "3/17" },
  "Rashid Khan": { m: 17, o: 56.5, w: 21, eco: 9.07, avg: 24.57, best: "4/33" },
  "Anshul Kamboj": { m: 14, o: 50.2, w: 21, eco: 10.52, avg: 25.23, best: "3/22" },
};

type Row = {
  name: string;
  country: string;
  role: Role;
  bat?: string;
  bowl?: string;
  capped: boolean;
  overseas?: boolean;
  age?: number;
  baseL: number;
  soldL?: number;
  team: string | null;
  acq: string;
  set: string;
};

function slug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function megaBase(row: Row): number {
  if (row.acq === "auction" || row.acq === "unsold") return INR(row.baseL);
  if (!row.capped) return INR(30);
  if (row.role === "ALL_ROUNDER" && row.overseas) return 2 * C;
  if (["Virat Kohli", "Jasprit Bumrah", "Rohit Sharma", "Rashid Khan", "Jos Buttler", "Pat Cummins", "Hardik Pandya", "Shubman Gill", "Rishabh Pant", "MS Dhoni", "Suryakumar Yadav", "Yashasvi Jaiswal", "KL Rahul", "Heinrich Klaasen", "Nicholas Pooran", "Jofra Archer", "Kagiso Rabada", "Trent Boult", "Sunil Narine"].includes(row.name)) {
    return 2 * C;
  }
  if (row.capped) return INR(150);
  return INR(30);
}

function toPlayer(row: Row): PlayerSeed {
  const bat = BAT[row.name];
  const bowl = BOWL[row.name];
  const overseas = row.overseas ?? row.country !== "India";
  const short = row.name.split(" ").slice(-1)[0];
  const hasStats = Boolean(bat || bowl);
  return {
    id: slug(row.name),
    name: row.name,
    shortName: short,
    country: row.country,
    role: row.role,
    battingStyle: row.bat ?? null,
    bowlingStyle: row.bowl ?? null,
    isOverseas: overseas,
    capped: row.capped,
    age: row.age ?? null,
    basePrice: INR(row.baseL),
    megaBasePrice: megaBase(row),
    actual2026Price: row.soldL != null ? INR(row.soldL) : null,
    actual2026TeamId: row.team,
    acquisition: row.acq,
    setCode: row.set,
    battingMatches: bat?.m ?? null,
    battingInns: bat?.i ?? bat?.m ?? null,
    runs: bat?.r ?? null,
    battingAvg: bat?.avg ?? null,
    strikeRate: bat?.sr ?? null,
    fours: bat?.f ?? null,
    sixes: bat?.s ?? null,
    fifties: bat?.fifties ?? null,
    hundreds: bat?.hundreds ?? null,
    bowlingMatches: bowl?.m ?? null,
    overs: bowl?.o ?? null,
    wickets: bowl?.w ?? null,
    economy: bowl?.eco ?? null,
    bowlingAvg: bowl?.avg ?? null,
    bowlingSr: bowl?.sr ?? null,
    bestBowling: bowl?.best ?? null,
    statsSource: hasStats ? "IPL.com / Indian Express 2026 season tables" : "unknown",
    statsSourceUrl: hasStats ? IPL_STATS_URL : null,
    statsVerifiedAt: hasStats ? IPL_DATE : null,
    dataNotes: hasStats
      ? "Season 2026 figures from official/public leaderboards. Missing fields are unknown, not zero."
      : "No verified 2026 season line recorded in this dataset.",
  };
}

const ROWS: Row[] = [
  // CSK
  { name: "Ruturaj Gaikwad", country: "India", role: "BATTER", bat: "Right Hand", bowl: "Right Arm Off Break", capped: true, age: 26, baseL: 200, team: "csk", acq: "retained", set: "M1" },
  { name: "MS Dhoni", country: "India", role: "WICKETKEEPER", bat: "Right Hand", bowl: "Right Arm Medium", capped: true, age: 45, baseL: 200, team: "csk", acq: "retained", set: "M1" },
  { name: "Dewald Brevis", country: "South Africa", role: "BATTER", bat: "Right Hand", bowl: "Right Arm Leg Break", capped: true, overseas: true, baseL: 200, team: "csk", acq: "retained", set: "OV" },
  { name: "Urvil Patel", country: "India", role: "WICKETKEEPER", bat: "Right Hand", capped: false, baseL: 30, team: "csk", acq: "retained", set: "WK" },
  { name: "Anshul Kamboj", country: "India", role: "ALL_ROUNDER", bat: "Right Hand", bowl: "Right Arm Medium", capped: true, baseL: 150, team: "csk", acq: "retained", set: "AR" },
  { name: "Shivam Dube", country: "India", role: "ALL_ROUNDER", bat: "Left Hand", bowl: "Right Arm Medium", capped: true, baseL: 200, team: "csk", acq: "retained", set: "AR" },
  { name: "Noor Ahmad", country: "Afghanistan", role: "BOWLER", bowl: "Left Arm Wrist Spin", capped: true, overseas: true, baseL: 200, team: "csk", acq: "retained", set: "BWL" },
  { name: "Mukesh Choudhary", country: "India", role: "BOWLER", bowl: "Left Arm Medium", capped: false, baseL: 30, team: "csk", acq: "retained", set: "IU" },
  { name: "Shreyas Gopal", country: "India", role: "BOWLER", bowl: "Right Arm Leg Break", capped: false, baseL: 30, team: "csk", acq: "retained", set: "IU" },
  { name: "Gurjapneet Singh", country: "India", role: "BOWLER", bowl: "Left Arm Medium", capped: false, baseL: 30, team: "csk", acq: "retained", set: "IU" },
  { name: "Sanju Samson", country: "India", role: "WICKETKEEPER", bat: "Right Hand", capped: true, age: 31, baseL: 200, team: "csk", acq: "trade", set: "M1" },
  { name: "Akeal Hosein", country: "West Indies", role: "BOWLER", bowl: "Left Arm Orthodox", capped: true, overseas: true, baseL: 200, soldL: 200, team: "csk", acq: "auction", set: "BWL" },
  { name: "Prashant Veer", country: "India", role: "ALL_ROUNDER", bat: "Left Hand", bowl: "Left Arm Orthodox", capped: false, baseL: 30, soldL: 1420, team: "csk", acq: "auction", set: "EM" },
  { name: "Kartik Sharma", country: "India", role: "WICKETKEEPER", bat: "Left Hand", capped: false, baseL: 30, soldL: 1420, team: "csk", acq: "auction", set: "WK" },
  { name: "Matthew Short", country: "Australia", role: "ALL_ROUNDER", bat: "Right Hand", bowl: "Right Arm Off Break", capped: true, overseas: true, baseL: 150, soldL: 150, team: "csk", acq: "auction", set: "AR" },
  { name: "Aman Khan", country: "India", role: "ALL_ROUNDER", bat: "Right Hand", bowl: "Right Arm Medium", capped: false, baseL: 30, soldL: 40, team: "csk", acq: "auction", set: "IU" },
  { name: "Sarfaraz Khan", country: "India", role: "BATTER", bat: "Right Hand", bowl: "Right Arm Leg Break", capped: true, baseL: 75, soldL: 75, team: "csk", acq: "auction", set: "IC" },
  { name: "Rahul Chahar", country: "India", role: "BOWLER", bowl: "Right Arm Leg Break", capped: true, baseL: 100, soldL: 520, team: "csk", acq: "auction", set: "BWL" },
  { name: "Matt Henry", country: "New Zealand", role: "BOWLER", bowl: "Right Arm Fast", capped: true, overseas: true, baseL: 200, soldL: 200, team: "csk", acq: "auction", set: "BWL" },
  { name: "Zak Foulkes", country: "New Zealand", role: "ALL_ROUNDER", bat: "Right Hand", bowl: "Right Arm Medium", capped: true, overseas: true, baseL: 75, soldL: 75, team: "csk", acq: "auction", set: "AR" },
  { name: "Akash Madhwal", country: "India", role: "BOWLER", bowl: "Right Arm Medium", capped: false, baseL: 30, soldL: 30, team: "csk", acq: "replacement", set: "IU" },
  { name: "Dian Forrester", country: "England", role: "ALL_ROUNDER", overseas: true, capped: true, baseL: 75, soldL: 75, team: "csk", acq: "replacement", set: "AR" },
  { name: "Macneil Noronha", country: "India", role: "ALL_ROUNDER", capped: false, baseL: 30, soldL: 30, team: "csk", acq: "replacement", set: "IU" },
  { name: "Kuldip Yadav", country: "India", role: "BOWLER", bowl: "Left Arm Medium", capped: false, baseL: 30, soldL: 30, team: "csk", acq: "replacement", set: "IU" },
  { name: "Spencer Johnson", country: "Australia", role: "BOWLER", bowl: "Left Arm Fast", capped: true, overseas: true, baseL: 150, soldL: 150, team: "csk", acq: "replacement", set: "BWL" },

  // DC
  { name: "KL Rahul", country: "India", role: "WICKETKEEPER", bat: "Right Hand", capped: true, age: 34, baseL: 200, team: "dc", acq: "retained", set: "M1" },
  { name: "Karun Nair", country: "India", role: "BATTER", bat: "Right Hand", capped: true, baseL: 75, team: "dc", acq: "retained", set: "IC" },
  { name: "Abishek Porel", country: "India", role: "WICKETKEEPER", bat: "Left Hand", capped: false, baseL: 30, team: "dc", acq: "retained", set: "WK" },
  { name: "Tristan Stubbs", country: "South Africa", role: "BATTER", bat: "Right Hand", capped: true, overseas: true, baseL: 200, team: "dc", acq: "retained", set: "OV" },
  { name: "Axar Patel", country: "India", role: "ALL_ROUNDER", bat: "Left Hand", bowl: "Left Arm Orthodox", capped: true, baseL: 200, team: "dc", acq: "retained", set: "AR" },
  { name: "Sameer Rizvi", country: "India", role: "BATTER", bat: "Right Hand", capped: false, baseL: 30, team: "dc", acq: "retained", set: "IU" },
  { name: "Ashutosh Sharma", country: "India", role: "BATTER", bat: "Right Hand", capped: false, baseL: 30, team: "dc", acq: "retained", set: "IU" },
  { name: "Vipraj Nigam", country: "India", role: "ALL_ROUNDER", capped: false, baseL: 30, team: "dc", acq: "retained", set: "IU" },
  { name: "Ajay Mandal", country: "India", role: "ALL_ROUNDER", capped: false, baseL: 30, team: "dc", acq: "retained", set: "IU" },
  { name: "Tripurana Vijay", country: "India", role: "ALL_ROUNDER", capped: false, baseL: 30, team: "dc", acq: "retained", set: "IU" },
  { name: "Madhav Tiwari", country: "India", role: "ALL_ROUNDER", capped: false, baseL: 30, team: "dc", acq: "retained", set: "IU" },
  { name: "Mitchell Starc", country: "Australia", role: "BOWLER", bowl: "Left Arm Fast", capped: true, overseas: true, age: 36, baseL: 200, team: "dc", acq: "retained", set: "BWL" },
  { name: "T Natarajan", country: "India", role: "BOWLER", bowl: "Left Arm Medium", capped: true, baseL: 150, team: "dc", acq: "retained", set: "BWL" },
  { name: "Mukesh Kumar", country: "India", role: "BOWLER", bowl: "Right Arm Medium", capped: true, baseL: 150, team: "dc", acq: "retained", set: "BWL" },
  { name: "Dushmantha Chameera", country: "Sri Lanka", role: "BOWLER", bowl: "Right Arm Fast", capped: true, overseas: true, baseL: 75, team: "dc", acq: "retained", set: "OV" },
  { name: "Kuldeep Yadav", country: "India", role: "BOWLER", bowl: "Left Arm Wrist Spin", capped: true, baseL: 200, team: "dc", acq: "retained", set: "BWL" },
  { name: "Nitish Rana", country: "India", role: "BATTER", bat: "Left Hand", bowl: "Right Arm Off Break", capped: true, baseL: 150, team: "dc", acq: "trade", set: "IC" },
  { name: "Auqib Dar", country: "India", role: "ALL_ROUNDER", bat: "Right Hand", bowl: "Right Arm Medium", capped: false, baseL: 30, soldL: 840, team: "dc", acq: "auction", set: "EM" },
  { name: "David Miller", country: "South Africa", role: "BATTER", bat: "Left Hand", capped: true, overseas: true, age: 37, baseL: 200, soldL: 200, team: "dc", acq: "auction", set: "BAT" },
  { name: "Pathum Nissanka", country: "Sri Lanka", role: "BATTER", bat: "Right Hand", capped: true, overseas: true, baseL: 75, soldL: 400, team: "dc", acq: "auction", set: "OV" },
  { name: "Lungi Ngidi", country: "South Africa", role: "BOWLER", bowl: "Right Arm Fast", capped: true, overseas: true, baseL: 200, soldL: 200, team: "dc", acq: "auction", set: "BWL" },
  { name: "Sahil Parakh", country: "India", role: "BATTER", capped: false, baseL: 30, soldL: 30, team: "dc", acq: "auction", set: "IU" },
  { name: "Prithvi Shaw", country: "India", role: "BATTER", bat: "Right Hand", capped: true, baseL: 75, soldL: 75, team: "dc", acq: "auction", set: "IC" },
  { name: "Kyle Jamieson", country: "New Zealand", role: "BOWLER", bowl: "Right Arm Fast", capped: true, overseas: true, baseL: 200, soldL: 200, team: "dc", acq: "auction", set: "BWL" },
  { name: "Rehan Ahmed", country: "England", role: "BOWLER", bowl: "Right Arm Leg Break", capped: true, overseas: true, baseL: 75, soldL: 75, team: "dc", acq: "replacement", set: "OV" },

  // GT
  { name: "Shubman Gill", country: "India", role: "BATTER", bat: "Right Hand", capped: true, age: 26, baseL: 200, team: "gt", acq: "retained", set: "M1" },
  { name: "Sai Sudharsan", country: "India", role: "BATTER", bat: "Left Hand", capped: true, baseL: 200, team: "gt", acq: "retained", set: "BAT" },
  { name: "Kumar Kushagra", country: "India", role: "WICKETKEEPER", capped: false, baseL: 30, team: "gt", acq: "retained", set: "WK" },
  { name: "Anuj Rawat", country: "India", role: "WICKETKEEPER", capped: false, baseL: 30, team: "gt", acq: "retained", set: "WK" },
  { name: "Jos Buttler", country: "England", role: "WICKETKEEPER", bat: "Right Hand", capped: true, overseas: true, age: 35, baseL: 200, team: "gt", acq: "retained", set: "M1" },
  { name: "Nishant Sindhu", country: "India", role: "ALL_ROUNDER", capped: false, baseL: 30, team: "gt", acq: "retained", set: "IU" },
  { name: "Glenn Phillips", country: "New Zealand", role: "ALL_ROUNDER", bat: "Right Hand", capped: true, overseas: true, baseL: 200, team: "gt", acq: "retained", set: "AR" },
  { name: "Washington Sundar", country: "India", role: "ALL_ROUNDER", bat: "Left Hand", bowl: "Right Arm Off Break", capped: true, baseL: 200, team: "gt", acq: "retained", set: "AR" },
  { name: "Arshad Khan", country: "India", role: "BOWLER", bowl: "Left Arm Medium", capped: false, baseL: 30, team: "gt", acq: "retained", set: "IU" },
  { name: "Shahrukh Khan", country: "India", role: "BATTER", capped: false, baseL: 50, team: "gt", acq: "retained", set: "IU" },
  { name: "Rahul Tewatia", country: "India", role: "ALL_ROUNDER", bat: "Left Hand", bowl: "Right Arm Leg Break", capped: false, baseL: 75, team: "gt", acq: "retained", set: "AR" },
  { name: "Kagiso Rabada", country: "South Africa", role: "BOWLER", bowl: "Right Arm Fast", capped: true, overseas: true, age: 31, baseL: 200, team: "gt", acq: "retained", set: "BWL" },
  { name: "Mohammed Siraj", country: "India", role: "BOWLER", bowl: "Right Arm Fast", capped: true, baseL: 200, team: "gt", acq: "retained", set: "BWL" },
  { name: "Prasidh Krishna", country: "India", role: "BOWLER", bowl: "Right Arm Fast", capped: true, baseL: 200, team: "gt", acq: "retained", set: "BWL" },
  { name: "Ishant Sharma", country: "India", role: "BOWLER", bowl: "Right Arm Fast", capped: true, age: 37, baseL: 75, team: "gt", acq: "retained", set: "IC" },
  { name: "Gurnoor Singh Brar", country: "India", role: "BOWLER", bowl: "Right Arm Fast", capped: false, baseL: 30, team: "gt", acq: "retained", set: "IU" },
  { name: "Rashid Khan", country: "Afghanistan", role: "BOWLER", bowl: "Right Arm Leg Break", capped: true, overseas: true, age: 27, baseL: 200, team: "gt", acq: "retained", set: "M1" },
  { name: "Manav Suthar", country: "India", role: "BOWLER", bowl: "Left Arm Orthodox", capped: false, baseL: 30, team: "gt", acq: "retained", set: "IU" },
  { name: "Sai Kishore", country: "India", role: "BOWLER", bowl: "Left Arm Orthodox", capped: true, baseL: 75, team: "gt", acq: "retained", set: "IC" },
  { name: "Jayant Yadav", country: "India", role: "BOWLER", bowl: "Right Arm Off Break", capped: true, baseL: 75, team: "gt", acq: "retained", set: "IC" },
  { name: "Ashok Sharma", country: "India", role: "BOWLER", capped: false, baseL: 30, soldL: 90, team: "gt", acq: "auction", set: "IU" },
  { name: "Jason Holder", country: "West Indies", role: "ALL_ROUNDER", bat: "Right Hand", bowl: "Right Arm Fast", capped: true, overseas: true, baseL: 200, soldL: 700, team: "gt", acq: "auction", set: "AR" },
  { name: "Luke Wood", country: "England", role: "BOWLER", bowl: "Left Arm Medium", capped: true, overseas: true, baseL: 75, soldL: 75, team: "gt", acq: "auction", set: "OV" },
  { name: "Tom Banton", country: "England", role: "WICKETKEEPER", bat: "Right Hand", capped: true, overseas: true, baseL: 200, soldL: 200, team: "gt", acq: "auction", set: "WK" },
  { name: "Connor Esterhuizen", country: "South Africa", role: "WICKETKEEPER", overseas: true, capped: true, baseL: 75, soldL: 75, team: "gt", acq: "replacement", set: "WK" },
  { name: "Kulwant Khejroliya", country: "India", role: "BOWLER", bowl: "Left Arm Medium", capped: false, baseL: 30, soldL: 30, team: "gt", acq: "replacement", set: "IU" },

  // KKR
  { name: "Ajinkya Rahane", country: "India", role: "BATTER", bat: "Right Hand", capped: true, age: 38, baseL: 150, team: "kkr", acq: "retained", set: "IC" },
  { name: "Rinku Singh", country: "India", role: "BATTER", bat: "Left Hand", capped: true, baseL: 200, team: "kkr", acq: "retained", set: "BAT" },
  { name: "Angkrish Raghuvanshi", country: "India", role: "BATTER", bat: "Right Hand", capped: false, baseL: 30, team: "kkr", acq: "retained", set: "EM" },
  { name: "Manish Pandey", country: "India", role: "BATTER", bat: "Right Hand", capped: true, age: 36, baseL: 75, team: "kkr", acq: "retained", set: "IC" },
  { name: "Rovman Powell", country: "West Indies", role: "ALL_ROUNDER", bat: "Right Hand", capped: true, overseas: true, baseL: 150, team: "kkr", acq: "retained", set: "OV" },
  { name: "Anukul Roy", country: "India", role: "ALL_ROUNDER", capped: false, baseL: 30, team: "kkr", acq: "retained", set: "IU" },
  { name: "Ramandeep Singh", country: "India", role: "BATTER", capped: true, baseL: 75, team: "kkr", acq: "retained", set: "IC" },
  { name: "Vaibhav Arora", country: "India", role: "BOWLER", bowl: "Right Arm Medium", capped: false, baseL: 50, team: "kkr", acq: "retained", set: "IU" },
  { name: "Sunil Narine", country: "West Indies", role: "ALL_ROUNDER", bat: "Left Hand", bowl: "Right Arm Off Break", capped: true, overseas: true, age: 38, baseL: 200, team: "kkr", acq: "retained", set: "M1" },
  { name: "Varun Chakaravarthy", country: "India", role: "BOWLER", bowl: "Right Arm Mystery", capped: true, baseL: 200, team: "kkr", acq: "retained", set: "BWL" },
  { name: "Umran Malik", country: "India", role: "BOWLER", bowl: "Right Arm Fast", capped: true, baseL: 75, team: "kkr", acq: "retained", set: "IC" },
  { name: "Cameron Green", country: "Australia", role: "ALL_ROUNDER", bat: "Right Hand", bowl: "Right Arm Fast", capped: true, overseas: true, age: 27, baseL: 200, soldL: 2520, team: "kkr", acq: "auction", set: "M1" },
  { name: "Finn Allen", country: "New Zealand", role: "WICKETKEEPER", bat: "Right Hand", capped: true, overseas: true, baseL: 200, soldL: 200, team: "kkr", acq: "auction", set: "WK" },
  { name: "Tejasvi Singh", country: "India", role: "WICKETKEEPER", capped: false, baseL: 30, soldL: 300, team: "kkr", acq: "auction", set: "WK" },
  { name: "Prashant Solanki", country: "India", role: "BOWLER", bowl: "Right Arm Leg Break", capped: false, baseL: 30, soldL: 30, team: "kkr", acq: "auction", set: "IU" },
  { name: "Kartik Tyagi", country: "India", role: "BOWLER", bowl: "Right Arm Fast", capped: false, baseL: 30, soldL: 30, team: "kkr", acq: "auction", set: "IU" },
  { name: "Rahul Tripathi", country: "India", role: "BATTER", bat: "Right Hand", capped: true, baseL: 75, soldL: 75, team: "kkr", acq: "auction", set: "IC" },
  { name: "Tim Seifert", country: "New Zealand", role: "WICKETKEEPER", bat: "Right Hand", capped: true, overseas: true, baseL: 150, soldL: 150, team: "kkr", acq: "auction", set: "WK" },
  { name: "Sarthak Ranjan", country: "India", role: "ALL_ROUNDER", capped: false, baseL: 30, soldL: 30, team: "kkr", acq: "auction", set: "IU" },
  { name: "Daksh Kamra", country: "India", role: "ALL_ROUNDER", capped: false, baseL: 30, soldL: 30, team: "kkr", acq: "auction", set: "IU" },
  { name: "Rachin Ravindra", country: "New Zealand", role: "ALL_ROUNDER", bat: "Left Hand", bowl: "Left Arm Orthodox", capped: true, overseas: true, baseL: 200, soldL: 200, team: "kkr", acq: "auction", set: "AR" },
  { name: "Matheesha Pathirana", country: "Sri Lanka", role: "BOWLER", bowl: "Right Arm Fast", capped: true, overseas: true, baseL: 200, soldL: 1800, team: "kkr", acq: "auction", set: "BWL" },
  { name: "Mustafizur Rahman", country: "Bangladesh", role: "BOWLER", bowl: "Left Arm Fast", capped: true, overseas: true, baseL: 200, soldL: 920, team: "kkr", acq: "auction", set: "BWL" },
  { name: "Akash Deep", country: "India", role: "BOWLER", bowl: "Right Arm Fast", capped: true, baseL: 100, soldL: 100, team: "kkr", acq: "auction", set: "IC" },
  { name: "Navdeep Saini", country: "India", role: "BOWLER", bowl: "Right Arm Fast", capped: true, baseL: 75, soldL: 75, team: "kkr", acq: "replacement", set: "IC" },
  { name: "Luvnith Sisodia", country: "India", role: "WICKETKEEPER", capped: false, baseL: 30, soldL: 30, team: "kkr", acq: "replacement", set: "WK" },
  { name: "Saurabh Dubey", country: "India", role: "BOWLER", capped: false, baseL: 30, soldL: 30, team: "kkr", acq: "replacement", set: "IU" },
  { name: "Blessing Muzarabani", country: "Zimbabwe", role: "BOWLER", bowl: "Right Arm Fast", capped: true, overseas: true, baseL: 75, team: "kkr", acq: "replacement", set: "OV" },

  // LSG
  { name: "Rishabh Pant", country: "India", role: "WICKETKEEPER", bat: "Left Hand", capped: true, age: 28, baseL: 200, team: "lsg", acq: "retained", set: "M1" },
  { name: "Ayush Badoni", country: "India", role: "ALL_ROUNDER", bat: "Right Hand", capped: false, baseL: 50, team: "lsg", acq: "retained", set: "AR" },
  { name: "Abdul Samad", country: "India", role: "BATTER", bat: "Right Hand", capped: false, baseL: 50, team: "lsg", acq: "retained", set: "IU" },
  { name: "Aiden Markram", country: "South Africa", role: "BATTER", bat: "Right Hand", bowl: "Right Arm Off Break", capped: true, overseas: true, baseL: 200, team: "lsg", acq: "retained", set: "OV" },
  { name: "Himmat Singh", country: "India", role: "BATTER", capped: false, baseL: 30, team: "lsg", acq: "retained", set: "IU" },
  { name: "Matthew Breetzke", country: "South Africa", role: "BATTER", overseas: true, capped: true, baseL: 75, team: "lsg", acq: "retained", set: "OV" },
  { name: "Nicholas Pooran", country: "West Indies", role: "WICKETKEEPER", bat: "Left Hand", capped: true, overseas: true, baseL: 200, team: "lsg", acq: "retained", set: "M1" },
  { name: "Mitchell Marsh", country: "Australia", role: "BATTER", bat: "Right Hand", bowl: "Right Arm Medium", capped: true, overseas: true, baseL: 200, team: "lsg", acq: "retained", set: "BAT" },
  { name: "Shahbaz Ahamad", country: "India", role: "ALL_ROUNDER", bat: "Left Hand", bowl: "Left Arm Orthodox", capped: false, baseL: 50, team: "lsg", acq: "retained", set: "AR" },
  { name: "Arshin Kulkarni", country: "India", role: "ALL_ROUNDER", capped: false, baseL: 30, team: "lsg", acq: "retained", set: "EM" },
  { name: "Mayank Yadav", country: "India", role: "BOWLER", bowl: "Right Arm Fast", capped: true, baseL: 200, team: "lsg", acq: "retained", set: "BWL" },
  { name: "Avesh Khan", country: "India", role: "BOWLER", bowl: "Right Arm Fast", capped: true, baseL: 150, team: "lsg", acq: "retained", set: "BWL" },
  { name: "Mohsin Khan", country: "India", role: "BOWLER", bowl: "Left Arm Medium", capped: false, baseL: 50, team: "lsg", acq: "retained", set: "IU" },
  { name: "M Siddharth", country: "India", role: "BOWLER", bowl: "Left Arm Orthodox", capped: false, baseL: 30, team: "lsg", acq: "retained", set: "IU" },
  { name: "Digvesh Rathi", country: "India", role: "BOWLER", capped: false, baseL: 30, team: "lsg", acq: "retained", set: "IU" },
  { name: "Prince Yadav", country: "India", role: "BOWLER", capped: false, baseL: 30, team: "lsg", acq: "retained", set: "IU" },
  { name: "Akash Singh", country: "India", role: "BOWLER", bowl: "Left Arm Medium", capped: false, baseL: 30, team: "lsg", acq: "retained", set: "IU" },
  { name: "Arjun Tendulkar", country: "India", role: "BOWLER", bowl: "Left Arm Medium", capped: false, baseL: 30, team: "lsg", acq: "trade", set: "IU" },
  { name: "Mohammed Shami", country: "India", role: "BOWLER", bowl: "Right Arm Fast", capped: true, age: 35, baseL: 200, team: "lsg", acq: "trade", set: "BWL" },
  { name: "Anrich Nortje", country: "South Africa", role: "BOWLER", bowl: "Right Arm Fast", capped: true, overseas: true, baseL: 200, soldL: 200, team: "lsg", acq: "auction", set: "BWL" },
  { name: "Wanindu Hasaranga", country: "Sri Lanka", role: "ALL_ROUNDER", bat: "Right Hand", bowl: "Right Arm Leg Break", capped: true, overseas: true, baseL: 200, soldL: 200, team: "lsg", acq: "auction", set: "AR" },
  { name: "Mukul Choudhary", country: "India", role: "WICKETKEEPER", capped: false, baseL: 30, soldL: 260, team: "lsg", acq: "auction", set: "WK" },
  { name: "Naman Tiwari", country: "India", role: "ALL_ROUNDER", capped: false, baseL: 30, soldL: 100, team: "lsg", acq: "auction", set: "IU" },
  { name: "Akshat Raghuwanshi", country: "India", role: "BATTER", capped: false, baseL: 30, soldL: 220, team: "lsg", acq: "auction", set: "IU" },
  { name: "Josh Inglis", country: "Australia", role: "WICKETKEEPER", bat: "Right Hand", capped: true, overseas: true, baseL: 200, soldL: 860, team: "lsg", acq: "auction", set: "WK" },
  { name: "George Linde", country: "South Africa", role: "ALL_ROUNDER", overseas: true, capped: true, baseL: 100, soldL: 100, team: "lsg", acq: "replacement", set: "AR" },

  // MI
  { name: "Rohit Sharma", country: "India", role: "BATTER", bat: "Right Hand", bowl: "Right Arm Off Break", capped: true, age: 39, baseL: 200, team: "mi", acq: "retained", set: "M1" },
  { name: "Suryakumar Yadav", country: "India", role: "BATTER", bat: "Right Hand", capped: true, age: 35, baseL: 200, team: "mi", acq: "retained", set: "M1" },
  { name: "Robin Minz", country: "India", role: "WICKETKEEPER", capped: false, baseL: 30, team: "mi", acq: "retained", set: "WK" },
  { name: "Ryan Rickelton", country: "South Africa", role: "WICKETKEEPER", bat: "Left Hand", capped: true, overseas: true, baseL: 150, team: "mi", acq: "retained", set: "WK" },
  { name: "Tilak Varma", country: "India", role: "BATTER", bat: "Left Hand", capped: true, baseL: 200, team: "mi", acq: "retained", set: "BAT" },
  { name: "Hardik Pandya", country: "India", role: "ALL_ROUNDER", bat: "Right Hand", bowl: "Right Arm Medium", capped: true, age: 32, baseL: 200, team: "mi", acq: "retained", set: "M1" },
  { name: "Naman Dhir", country: "India", role: "ALL_ROUNDER", bat: "Right Hand", capped: false, baseL: 50, team: "mi", acq: "retained", set: "AR" },
  { name: "Will Jacks", country: "England", role: "ALL_ROUNDER", bat: "Right Hand", bowl: "Right Arm Off Break", capped: true, overseas: true, baseL: 200, team: "mi", acq: "retained", set: "AR" },
  { name: "Corbin Bosch", country: "South Africa", role: "ALL_ROUNDER", overseas: true, capped: true, baseL: 75, team: "mi", acq: "retained", set: "OV" },
  { name: "Trent Boult", country: "New Zealand", role: "BOWLER", bowl: "Left Arm Fast", capped: true, overseas: true, age: 36, baseL: 200, team: "mi", acq: "retained", set: "BWL" },
  { name: "Jasprit Bumrah", country: "India", role: "BOWLER", bowl: "Right Arm Fast", capped: true, age: 32, baseL: 200, team: "mi", acq: "retained", set: "M1" },
  { name: "Deepak Chahar", country: "India", role: "BOWLER", bowl: "Right Arm Medium", capped: true, baseL: 150, team: "mi", acq: "retained", set: "BWL" },
  { name: "Ashwani Kumar", country: "India", role: "BOWLER", capped: false, baseL: 30, team: "mi", acq: "retained", set: "IU" },
  { name: "Raghu Sharma", country: "India", role: "BOWLER", capped: false, baseL: 30, team: "mi", acq: "retained", set: "IU" },
  { name: "Allah Ghazanfar", country: "Afghanistan", role: "BOWLER", bowl: "Right Arm Off Break", capped: true, overseas: true, baseL: 75, team: "mi", acq: "retained", set: "OV" },
  { name: "Mayank Markande", country: "India", role: "BOWLER", bowl: "Right Arm Leg Break", capped: false, baseL: 30, team: "mi", acq: "trade", set: "IU" },
  { name: "Shardul Thakur", country: "India", role: "ALL_ROUNDER", bat: "Right Hand", bowl: "Right Arm Medium", capped: true, baseL: 150, team: "mi", acq: "trade", set: "AR" },
  { name: "Sherfane Rutherford", country: "West Indies", role: "BATTER", bat: "Left Hand", capped: true, overseas: true, baseL: 150, team: "mi", acq: "trade", set: "OV" },
  { name: "Quinton de Kock", country: "South Africa", role: "WICKETKEEPER", bat: "Left Hand", capped: true, overseas: true, age: 33, baseL: 100, soldL: 100, team: "mi", acq: "auction", set: "WK" },
  { name: "Mohammad Izhar", country: "India", role: "BOWLER", capped: false, baseL: 30, soldL: 30, team: "mi", acq: "auction", set: "IU" },
  { name: "Danish Malewar", country: "India", role: "BATTER", capped: false, baseL: 30, soldL: 30, team: "mi", acq: "auction", set: "IU" },
  { name: "Atharva Ankolekar", country: "India", role: "ALL_ROUNDER", capped: false, baseL: 30, soldL: 30, team: "mi", acq: "auction", set: "IU" },
  { name: "Mayank Rawat", country: "India", role: "ALL_ROUNDER", capped: false, baseL: 30, soldL: 30, team: "mi", acq: "auction", set: "IU" },
  { name: "Keshav Maharaj", country: "South Africa", role: "BOWLER", bowl: "Left Arm Orthodox", capped: true, overseas: true, baseL: 75, soldL: 75, team: "mi", acq: "replacement", set: "OV" },
  { name: "Mahipal Lomror", country: "India", role: "ALL_ROUNDER", capped: false, baseL: 50, soldL: 50, team: "mi", acq: "replacement", set: "IU" },
  { name: "Krish Bhagat", country: "India", role: "BOWLER", capped: false, baseL: 30, soldL: 30, team: "mi", acq: "replacement", set: "IU" },

  // PBKS
  { name: "Shreyas Iyer", country: "India", role: "BATTER", bat: "Right Hand", capped: true, age: 31, baseL: 200, team: "pbks", acq: "retained", set: "M1" },
  { name: "Nehal Wadhera", country: "India", role: "BATTER", bat: "Left Hand", capped: false, baseL: 50, team: "pbks", acq: "retained", set: "IU" },
  { name: "Vishnu Vinod", country: "India", role: "WICKETKEEPER", capped: false, baseL: 30, team: "pbks", acq: "retained", set: "WK" },
  { name: "Harnoor Pannu", country: "India", role: "BATTER", capped: false, baseL: 30, team: "pbks", acq: "retained", set: "IU" },
  { name: "Pyla Avinash", country: "India", role: "BATTER", capped: false, baseL: 30, team: "pbks", acq: "retained", set: "IU" },
  { name: "Prabhsimran Singh", country: "India", role: "WICKETKEEPER", bat: "Right Hand", capped: false, baseL: 50, team: "pbks", acq: "retained", set: "WK" },
  { name: "Shashank Singh", country: "India", role: "BATTER", bat: "Right Hand", capped: false, baseL: 50, team: "pbks", acq: "retained", set: "IU" },
  { name: "Marcus Stoinis", country: "Australia", role: "ALL_ROUNDER", bat: "Right Hand", bowl: "Right Arm Medium", capped: true, overseas: true, baseL: 200, team: "pbks", acq: "retained", set: "AR" },
  { name: "Harpreet Brar", country: "India", role: "ALL_ROUNDER", bat: "Left Hand", bowl: "Left Arm Orthodox", capped: false, baseL: 50, team: "pbks", acq: "retained", set: "AR" },
  { name: "Marco Jansen", country: "South Africa", role: "ALL_ROUNDER", bat: "Right Hand", bowl: "Left Arm Fast", capped: true, overseas: true, baseL: 200, team: "pbks", acq: "retained", set: "AR" },
  { name: "Azmatullah Omarzai", country: "Afghanistan", role: "ALL_ROUNDER", capped: true, overseas: true, baseL: 150, team: "pbks", acq: "retained", set: "AR" },
  { name: "Priyansh Arya", country: "India", role: "ALL_ROUNDER", bat: "Left Hand", capped: false, baseL: 30, team: "pbks", acq: "retained", set: "EM" },
  { name: "Musheer Khan", country: "India", role: "ALL_ROUNDER", capped: false, baseL: 30, team: "pbks", acq: "retained", set: "EM" },
  { name: "Suryansh Shedge", country: "India", role: "ALL_ROUNDER", capped: false, baseL: 30, team: "pbks", acq: "retained", set: "IU" },
  { name: "Mitch Owen", country: "Australia", role: "ALL_ROUNDER", overseas: true, capped: true, baseL: 75, team: "pbks", acq: "retained", set: "OV" },
  { name: "Arshdeep Singh", country: "India", role: "BOWLER", bowl: "Left Arm Medium", capped: true, baseL: 200, team: "pbks", acq: "retained", set: "BWL" },
  { name: "Yuzvendra Chahal", country: "India", role: "BOWLER", bowl: "Right Arm Leg Break", capped: true, age: 35, baseL: 200, team: "pbks", acq: "retained", set: "BWL" },
  { name: "Vyshak Vijaykumar", country: "India", role: "BOWLER", bowl: "Right Arm Medium", capped: false, baseL: 30, team: "pbks", acq: "retained", set: "IU" },
  { name: "Yash Thakur", country: "India", role: "BOWLER", bowl: "Right Arm Medium", capped: false, baseL: 50, team: "pbks", acq: "retained", set: "IU" },
  { name: "Xavier Bartlett", country: "Australia", role: "BOWLER", bowl: "Right Arm Fast", capped: true, overseas: true, baseL: 75, team: "pbks", acq: "retained", set: "OV" },
  { name: "Lockie Ferguson", country: "New Zealand", role: "BOWLER", bowl: "Right Arm Fast", capped: true, overseas: true, baseL: 200, team: "pbks", acq: "retained", set: "BWL" },
  { name: "Cooper Connolly", country: "Australia", role: "ALL_ROUNDER", bat: "Left Hand", bowl: "Left Arm Orthodox", capped: true, overseas: true, baseL: 200, soldL: 300, team: "pbks", acq: "auction", set: "AR" },
  { name: "Ben Dwarshuis", country: "Australia", role: "ALL_ROUNDER", bowl: "Left Arm Fast", capped: true, overseas: true, baseL: 100, soldL: 440, team: "pbks", acq: "auction", set: "AR" },
  { name: "Vishal Nishad", country: "India", role: "BOWLER", capped: false, baseL: 30, soldL: 30, team: "pbks", acq: "auction", set: "IU" },
  { name: "Pravin Dubey", country: "India", role: "BOWLER", bowl: "Right Arm Leg Break", capped: false, baseL: 30, soldL: 30, team: "pbks", acq: "auction", set: "IU" },

  // RR
  { name: "Shubham Dubey", country: "India", role: "BATTER", capped: false, baseL: 30, team: "rr", acq: "retained", set: "IU" },
  { name: "Vaibhav Sooryavanshi", country: "India", role: "BATTER", bat: "Left Hand", capped: false, age: 15, baseL: 30, team: "rr", acq: "retained", set: "EM" },
  { name: "Lhuan-dre Pretorius", country: "South Africa", role: "BATTER", overseas: true, capped: true, baseL: 75, team: "rr", acq: "retained", set: "OV" },
  { name: "Shimron Hetmyer", country: "West Indies", role: "BATTER", bat: "Left Hand", capped: true, overseas: true, baseL: 150, team: "rr", acq: "retained", set: "OV" },
  { name: "Yashasvi Jaiswal", country: "India", role: "BATTER", bat: "Left Hand", capped: true, age: 24, baseL: 200, team: "rr", acq: "retained", set: "M1" },
  { name: "Dhruv Jurel", country: "India", role: "WICKETKEEPER", bat: "Right Hand", capped: true, baseL: 150, team: "rr", acq: "retained", set: "WK" },
  { name: "Riyan Parag", country: "India", role: "BATTER", bat: "Right Hand", bowl: "Right Arm Off Break", capped: true, baseL: 200, team: "rr", acq: "retained", set: "BAT" },
  { name: "Yudhvir Singh Charak", country: "India", role: "ALL_ROUNDER", capped: false, baseL: 30, team: "rr", acq: "retained", set: "IU" },
  { name: "Jofra Archer", country: "England", role: "BOWLER", bowl: "Right Arm Fast", capped: true, overseas: true, age: 31, baseL: 200, team: "rr", acq: "retained", set: "BWL" },
  { name: "Tushar Deshpande", country: "India", role: "BOWLER", bowl: "Right Arm Medium", capped: true, baseL: 75, team: "rr", acq: "retained", set: "IC" },
  { name: "Sandeep Sharma", country: "India", role: "BOWLER", bowl: "Right Arm Medium", capped: false, baseL: 50, team: "rr", acq: "retained", set: "IU" },
  { name: "Kwena Maphaka", country: "South Africa", role: "BOWLER", bowl: "Left Arm Fast", capped: true, overseas: true, baseL: 75, team: "rr", acq: "retained", set: "OV" },
  { name: "Nandre Burger", country: "South Africa", role: "BOWLER", bowl: "Left Arm Fast", capped: true, overseas: true, baseL: 75, team: "rr", acq: "retained", set: "OV" },
  { name: "Ravindra Jadeja", country: "India", role: "ALL_ROUNDER", bat: "Left Hand", bowl: "Left Arm Orthodox", capped: true, age: 37, baseL: 200, team: "rr", acq: "trade", set: "M1" },
  { name: "Dasun Shanaka", country: "Sri Lanka", role: "ALL_ROUNDER", overseas: true, capped: true, baseL: 75, team: "rr", acq: "replacement", set: "AR" },
  { name: "Donovan Ferreira", country: "South Africa", role: "WICKETKEEPER", bat: "Right Hand", capped: true, overseas: true, baseL: 75, team: "rr", acq: "trade", set: "WK" },
  { name: "Ravi Bishnoi", country: "India", role: "BOWLER", bowl: "Right Arm Leg Break", capped: true, baseL: 200, soldL: 720, team: "rr", acq: "auction", set: "BWL" },
  { name: "Sushant Mishra", country: "India", role: "BOWLER", bowl: "Left Arm Medium", capped: false, baseL: 30, soldL: 90, team: "rr", acq: "auction", set: "IU" },
  { name: "Vignesh Puthur", country: "India", role: "BOWLER", capped: false, baseL: 30, soldL: 30, team: "rr", acq: "auction", set: "IU" },
  { name: "Yash Raj Punja", country: "India", role: "BOWLER", capped: false, baseL: 30, soldL: 30, team: "rr", acq: "auction", set: "IU" },
  { name: "Brijesh Sharma", country: "India", role: "BOWLER", capped: false, baseL: 30, soldL: 30, team: "rr", acq: "auction", set: "IU" },
  { name: "Aman Rao", country: "India", role: "BATTER", capped: false, baseL: 30, soldL: 30, team: "rr", acq: "auction", set: "IU" },
  { name: "Adam Milne", country: "New Zealand", role: "BOWLER", bowl: "Right Arm Fast", capped: true, overseas: true, baseL: 200, soldL: 240, team: "rr", acq: "auction", set: "BWL" },
  { name: "Kuldeep Sen", country: "India", role: "BOWLER", bowl: "Right Arm Fast", capped: true, baseL: 75, soldL: 75, team: "rr", acq: "auction", set: "IC" },
  { name: "Ravi Singh", country: "India", role: "ALL_ROUNDER", capped: false, baseL: 30, soldL: 95, team: "rr", acq: "auction", set: "IU" },

  // RCB
  { name: "Rajat Patidar", country: "India", role: "BATTER", bat: "Right Hand", capped: true, baseL: 200, team: "rcb", acq: "retained", set: "BAT" },
  { name: "Virat Kohli", country: "India", role: "BATTER", bat: "Right Hand", bowl: "Right Arm Medium", capped: true, age: 37, baseL: 200, team: "rcb", acq: "retained", set: "M1" },
  { name: "Tim David", country: "Australia", role: "ALL_ROUNDER", bat: "Right Hand", capped: true, overseas: true, baseL: 200, team: "rcb", acq: "retained", set: "AR" },
  { name: "Devdutt Padikkal", country: "India", role: "BATTER", bat: "Left Hand", capped: true, baseL: 150, team: "rcb", acq: "retained", set: "IC" },
  { name: "Phil Salt", country: "England", role: "WICKETKEEPER", bat: "Right Hand", capped: true, overseas: true, baseL: 200, team: "rcb", acq: "retained", set: "WK" },
  { name: "Jitesh Sharma", country: "India", role: "WICKETKEEPER", bat: "Right Hand", capped: true, baseL: 150, team: "rcb", acq: "retained", set: "WK" },
  { name: "Krunal Pandya", country: "India", role: "ALL_ROUNDER", bat: "Left Hand", bowl: "Left Arm Orthodox", capped: true, baseL: 200, team: "rcb", acq: "retained", set: "AR" },
  { name: "Jacob Bethell", country: "England", role: "ALL_ROUNDER", bat: "Left Hand", capped: true, overseas: true, baseL: 150, team: "rcb", acq: "retained", set: "AR" },
  { name: "Romario Shepherd", country: "West Indies", role: "ALL_ROUNDER", bat: "Right Hand", bowl: "Right Arm Medium", capped: true, overseas: true, baseL: 150, team: "rcb", acq: "retained", set: "AR" },
  { name: "Swapnil Singh", country: "India", role: "ALL_ROUNDER", capped: false, baseL: 30, team: "rcb", acq: "retained", set: "IU" },
  { name: "Josh Hazlewood", country: "Australia", role: "BOWLER", bowl: "Right Arm Fast", capped: true, overseas: true, age: 35, baseL: 200, team: "rcb", acq: "retained", set: "BWL" },
  { name: "Bhuvneshwar Kumar", country: "India", role: "BOWLER", bowl: "Right Arm Medium", capped: true, age: 36, baseL: 200, team: "rcb", acq: "retained", set: "BWL" },
  { name: "Rasikh Salam", country: "India", role: "BOWLER", bowl: "Right Arm Medium", capped: false, baseL: 30, team: "rcb", acq: "retained", set: "IU" },
  { name: "Yash Dayal", country: "India", role: "BOWLER", bowl: "Left Arm Medium", capped: false, baseL: 50, team: "rcb", acq: "retained", set: "IU" },
  { name: "Suyash Sharma", country: "India", role: "BOWLER", bowl: "Right Arm Leg Break", capped: false, baseL: 50, team: "rcb", acq: "retained", set: "IU" },
  { name: "Abhinandan Singh", country: "India", role: "BOWLER", capped: false, baseL: 30, team: "rcb", acq: "retained", set: "IU" },
  { name: "Venkatesh Iyer", country: "India", role: "ALL_ROUNDER", bat: "Left Hand", bowl: "Right Arm Medium", capped: true, baseL: 200, soldL: 700, team: "rcb", acq: "auction", set: "AR" },
  { name: "Jacob Duffy", country: "New Zealand", role: "BOWLER", bowl: "Right Arm Fast", capped: true, overseas: true, baseL: 200, soldL: 200, team: "rcb", acq: "auction", set: "BWL" },
  { name: "Mangesh Yadav", country: "India", role: "ALL_ROUNDER", capped: false, baseL: 30, soldL: 520, team: "rcb", acq: "auction", set: "EM" },
  { name: "Satvik Deswal", country: "India", role: "ALL_ROUNDER", capped: false, baseL: 30, soldL: 30, team: "rcb", acq: "auction", set: "IU" },
  { name: "Jordan Cox", country: "England", role: "BATTER", overseas: true, capped: true, baseL: 75, soldL: 75, team: "rcb", acq: "auction", set: "OV" },
  { name: "Kanishk Chouhan", country: "India", role: "ALL_ROUNDER", capped: false, baseL: 30, soldL: 30, team: "rcb", acq: "auction", set: "IU" },
  { name: "Vihaan Malhotra", country: "India", role: "ALL_ROUNDER", capped: false, baseL: 30, soldL: 30, team: "rcb", acq: "auction", set: "IU" },
  { name: "Vicky Ostwal", country: "India", role: "ALL_ROUNDER", bowl: "Left Arm Orthodox", capped: false, baseL: 30, soldL: 30, team: "rcb", acq: "auction", set: "IU" },
  { name: "Richard Gleeson", country: "England", role: "BOWLER", bowl: "Right Arm Fast", capped: true, overseas: true, baseL: 75, soldL: 160, team: "rcb", acq: "replacement", set: "OV" },

  // SRH
  { name: "Travis Head", country: "Australia", role: "BATTER", bat: "Left Hand", bowl: "Right Arm Off Break", capped: true, overseas: true, baseL: 200, team: "srh", acq: "retained", set: "M1" },
  { name: "Abhishek Sharma", country: "India", role: "ALL_ROUNDER", bat: "Left Hand", bowl: "Left Arm Orthodox", capped: true, baseL: 200, team: "srh", acq: "retained", set: "AR" },
  { name: "Aniket Verma", country: "India", role: "BATTER", capped: false, baseL: 30, team: "srh", acq: "retained", set: "IU" },
  { name: "R Smaran", country: "India", role: "BATTER", capped: false, baseL: 30, team: "srh", acq: "retained", set: "IU" },
  { name: "Ishan Kishan", country: "India", role: "WICKETKEEPER", bat: "Left Hand", capped: true, baseL: 200, team: "srh", acq: "retained", set: "WK" },
  { name: "Heinrich Klaasen", country: "South Africa", role: "WICKETKEEPER", bat: "Right Hand", capped: true, overseas: true, baseL: 200, team: "srh", acq: "retained", set: "M1" },
  { name: "Nitish Kumar Reddy", country: "India", role: "ALL_ROUNDER", bat: "Right Hand", bowl: "Right Arm Medium", capped: true, baseL: 200, team: "srh", acq: "retained", set: "AR" },
  { name: "Harsh Dubey", country: "India", role: "ALL_ROUNDER", capped: false, baseL: 30, team: "srh", acq: "retained", set: "IU" },
  { name: "Kamindu Mendis", country: "Sri Lanka", role: "ALL_ROUNDER", overseas: true, capped: true, baseL: 75, team: "srh", acq: "retained", set: "OV" },
  { name: "Harshal Patel", country: "India", role: "ALL_ROUNDER", bat: "Right Hand", bowl: "Right Arm Medium", capped: true, baseL: 150, team: "srh", acq: "retained", set: "AR" },
  { name: "Pat Cummins", country: "Australia", role: "BOWLER", bowl: "Right Arm Fast", capped: true, overseas: true, age: 33, baseL: 200, team: "srh", acq: "retained", set: "M1" },
  { name: "Jaydev Unadkat", country: "India", role: "BOWLER", bowl: "Left Arm Medium", capped: true, baseL: 75, team: "srh", acq: "retained", set: "IC" },
  { name: "Eshan Malinga", country: "Sri Lanka", role: "BOWLER", bowl: "Right Arm Fast", capped: true, overseas: true, baseL: 75, team: "srh", acq: "retained", set: "OV" },
  { name: "Zeeshan Ansari", country: "India", role: "BOWLER", capped: false, baseL: 30, team: "srh", acq: "retained", set: "IU" },
  { name: "Shivang Kumar", country: "India", role: "ALL_ROUNDER", capped: false, baseL: 30, soldL: 30, team: "srh", acq: "auction", set: "IU" },
  { name: "Salil Arora", country: "India", role: "WICKETKEEPER", capped: false, baseL: 30, soldL: 150, team: "srh", acq: "auction", set: "WK" },
  { name: "Krains Fuletra", country: "India", role: "BOWLER", capped: false, baseL: 30, soldL: 30, team: "srh", acq: "auction", set: "IU" },
  { name: "Praful Hinge", country: "India", role: "BOWLER", capped: false, baseL: 30, soldL: 30, team: "srh", acq: "auction", set: "IU" },
  { name: "Amit Kumar", country: "India", role: "BOWLER", capped: false, baseL: 30, soldL: 30, team: "srh", acq: "auction", set: "IU" },
  { name: "Onkar Tarmale", country: "India", role: "BOWLER", capped: false, baseL: 30, soldL: 30, team: "srh", acq: "auction", set: "IU" },
  { name: "Sakib Hussain", country: "India", role: "BOWLER", capped: false, baseL: 30, soldL: 30, team: "srh", acq: "auction", set: "IU" },
  { name: "Liam Livingstone", country: "England", role: "ALL_ROUNDER", bat: "Right Hand", bowl: "Right Arm Leg Break", capped: true, overseas: true, baseL: 200, soldL: 1300, team: "srh", acq: "auction", set: "AR" },
  { name: "Jack Edwards", country: "Australia", role: "ALL_ROUNDER", overseas: true, capped: true, baseL: 50, soldL: 300, team: "srh", acq: "auction", set: "AR" },
  { name: "Shivam Mavi", country: "India", role: "BOWLER", bowl: "Right Arm Fast", capped: true, baseL: 75, soldL: 75, team: "srh", acq: "auction", set: "IC" },
  { name: "Dilshan Madushanka", country: "Sri Lanka", role: "BOWLER", bowl: "Left Arm Fast", capped: true, overseas: true, baseL: 75, soldL: 75, team: "srh", acq: "replacement", set: "OV" },
  { name: "Gerald Coetzee", country: "South Africa", role: "BOWLER", bowl: "Right Arm Fast", capped: true, overseas: true, baseL: 200, team: "srh", acq: "replacement", set: "BWL" },

  // Unsold / additional pool (Sportstar 16 Dec 2025)
  { name: "Jake Fraser-McGurk", country: "Australia", role: "BATTER", bat: "Right Hand", capped: true, overseas: true, baseL: 200, team: null, acq: "unsold", set: "OV" },
  { name: "Atharva Taide", country: "India", role: "BATTER", capped: false, baseL: 30, team: null, acq: "unsold", set: "IU" },
  { name: "Anmolpreet Singh", country: "India", role: "BATTER", capped: true, baseL: 30, team: null, acq: "unsold", set: "IC" },
  { name: "Abhinav Manohar", country: "India", role: "BATTER", capped: false, baseL: 30, team: null, acq: "unsold", set: "IU" },
  { name: "Sediqullah Atal", country: "Afghanistan", role: "BATTER", overseas: true, capped: true, baseL: 75, team: null, acq: "unsold", set: "OV" },
  { name: "Manan Vohra", country: "India", role: "BATTER", capped: true, baseL: 30, team: null, acq: "unsold", set: "IC" },
  { name: "Swastik Chikara", country: "India", role: "BATTER", capped: false, baseL: 30, team: null, acq: "unsold", set: "EM" },
  { name: "Taskin Ahmed", country: "Bangladesh", role: "BOWLER", bowl: "Right Arm Fast", capped: true, overseas: true, baseL: 75, team: null, acq: "unsold", set: "OV" },
  { name: "Riley Meredith", country: "Australia", role: "BOWLER", bowl: "Right Arm Fast", capped: true, overseas: true, baseL: 150, team: null, acq: "unsold", set: "OV" },
  { name: "Gus Atkinson", country: "England", role: "BOWLER", bowl: "Right Arm Fast", capped: true, overseas: true, baseL: 200, team: null, acq: "unsold", set: "BWL" },
  { name: "Sean Abbott", country: "Australia", role: "ALL_ROUNDER", capped: true, overseas: true, baseL: 200, team: null, acq: "unsold", set: "AR" },
  { name: "Michael Bracewell", country: "New Zealand", role: "ALL_ROUNDER", capped: true, overseas: true, baseL: 200, team: null, acq: "unsold", set: "AR" },
  { name: "Daryl Mitchell", country: "New Zealand", role: "ALL_ROUNDER", bat: "Right Hand", bowl: "Right Arm Medium", capped: true, overseas: true, baseL: 200, team: null, acq: "unsold", set: "AR" },
  { name: "Rahmanullah Gurbaz", country: "Afghanistan", role: "WICKETKEEPER", bat: "Right Hand", capped: true, overseas: true, baseL: 150, team: null, acq: "unsold", set: "WK" },
  { name: "Jamie Smith", country: "England", role: "WICKETKEEPER", bat: "Right Hand", capped: true, overseas: true, baseL: 200, team: null, acq: "unsold", set: "WK" },
  { name: "KS Bharat", country: "India", role: "WICKETKEEPER", capped: true, baseL: 75, team: null, acq: "unsold", set: "WK" },
  { name: "Mayank Dagar", country: "India", role: "ALL_ROUNDER", capped: false, baseL: 30, team: null, acq: "unsold", set: "IU" },
  { name: "Tushar Raheja", country: "India", role: "WICKETKEEPER", capped: false, baseL: 30, team: null, acq: "unsold", set: "WK" },
];

export const SETS: { code: string; name: string; order: number }[] = [
  { code: "M1", name: "Marquee Players", order: 1 },
  { code: "BAT", name: "Marquee Batters", order: 2 },
  { code: "BWL", name: "Marquee Bowlers", order: 3 },
  { code: "AR", name: "All-rounders", order: 4 },
  { code: "WK", name: "Wicketkeepers", order: 5 },
  { code: "OV", name: "Overseas", order: 6 },
  { code: "IC", name: "Indian Capped", order: 7 },
  { code: "EM", name: "Emerging Players", order: 8 },
  { code: "IU", name: "Indian Uncapped", order: 9 },
  { code: "ACCEL", name: "Accelerated Round", order: 99 },
];

export const PLAYER_SEEDS: PlayerSeed[] = ROWS.map(toPlayer);
