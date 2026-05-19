import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = resolve(__dirname, "..", ".env");
let envText = "";
try {
  envText = readFileSync(envPath, "utf8");
} catch {
  // Ignore missing .env; we will fall back to process.env.
}

const env = Object.fromEntries(
  envText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const index = line.indexOf("=");
      const key = line.slice(0, index).trim();
      const value = line.slice(index + 1).trim();
      return [key, value];
    })
);

const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials. Check .env or environment variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const now = Date.now();
const pets = [
  {
    id: `pl-${now}-1`,
    name: "Luna",
    age: "2 lata",
    species: "Pies",
    shelter: "Schronisko Miejskie w Krakowie",
    city: "Krakow",
    photos: ["https://placedog.net/800/600?id=101"],
    behavior: "Spokojna w domu, lubi spacery",
    personality: "Lagodna i ufna",
  },
  {
    id: `pl-${now}-2`,
    name: "Max",
    age: "3 lata",
    species: "Pies",
    shelter: "Schronisko w Gdansku",
    city: "Gdansk",
    photos: ["https://placedog.net/800/600?id=102"],
    behavior: "Energiczny, kocha zabawe",
    personality: "Wierny i ciekawski",
  },
  {
    id: `pl-${now}-3`,
    name: "Mila",
    age: "1 rok",
    species: "Kot",
    shelter: "Azyl Kota",
    city: "Poznan",
    photos: ["https://placekitten.com/800/600"],
    behavior: "Cicha, dobrze dogaduje sie z kotami",
    personality: "Delikatna i czula",
  },
  {
    id: `pl-${now}-4`,
    name: "Oreo",
    age: "4 lata",
    species: "Kot",
    shelter: "Schronisko we Wroclawiu",
    city: "Wroclaw",
    photos: ["https://placekitten.com/801/600"],
    behavior: "Niezalezny, lubi drzemki przy oknie",
    personality: "Spokojny i pewny siebie",
  },
  {
    id: `pl-${now}-5`,
    name: "Bruno",
    age: "5 lat",
    species: "Pies",
    shelter: "Centrum Adopcyjne",
    city: "Lodz",
    photos: ["https://placedog.net/800/600?id=103"],
    behavior: "Nauczony czystosci, dobrze chodzi na smyczy",
    personality: "Przyjazny i stabilny",
  },
  {
    id: `pl-${now}-6`,
    name: "Nala",
    age: "2 lata",
    species: "Kot",
    shelter: "Szczecinskie Schronisko",
    city: "Szczecin",
    photos: ["https://placekitten.com/802/600"],
    behavior: "Lubi zabawki, delikatna dla dzieci",
    personality: "Towarzyska i wesola",
  },
];

const { error } = await supabase.from("pets").insert(pets);

if (error) {
  console.error("Seed failed:", error.message);
  process.exit(1);
}

console.log(`Inserted ${pets.length} pets into Supabase.`);
