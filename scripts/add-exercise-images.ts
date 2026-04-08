/**
 * Add image URLs to exercise_library by matching against free-exercise-db.
 * Run with: npx tsx scripts/add-exercise-images.ts
 *
 * Strategy:
 *  1. Fetch free-exercise-db (same source we seeded from).
 *  2. Apply the same Spanish translation to each exercise name.
 *  3. Build a lookup: translatedName → imageUrl.
 *  4. Fetch our Supabase exercises and update video_url where a match is found.
 *
 * Image URL format: https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/{folder}/{file}
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

const FREE_EXERCISE_DB_URL =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";

const IMAGE_BASE =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";

// Same categories we filtered when seeding
const ALLOWED_CATEGORIES = new Set([
  "strength",
  "powerlifting",
  "olympic weightlifting",
  "plyometrics",
  "strongman",
]);

// ── Exact name overrides (same as translate-exercises.ts) ─────────────────────
const EXACT: Record<string, string> = {
  // ── Pecho ──────────────────────────────────────────────────────────────────
  "Barbell Bench Press": "Press de Banca con Barra",
  "Dumbbell Bench Press": "Press de Banca con Mancuernas",
  "Incline Barbell Bench Press": "Press Inclinado con Barra",
  "Incline Dumbbell Bench Press": "Press Inclinado con Mancuernas",
  "Decline Barbell Bench Press": "Press Declinado con Barra",
  "Decline Dumbbell Bench Press": "Press Declinado con Mancuernas",
  "Close-Grip Barbell Bench Press": "Press de Banca Agarre Cerrado",
  "Wide-Grip Barbell Bench Press": "Press de Banca Agarre Amplio",
  "Smith Machine Bench Press": "Press de Banca en Máquina Smith",
  "Smith Machine Incline Bench Press": "Press Inclinado en Máquina Smith",
  "Smith Machine Decline Bench Press": "Press Declinado en Máquina Smith",
  "Machine Bench Press": "Press de Banca en Máquina",
  "Dumbbell Fly": "Aperturas con Mancuernas",
  "Incline Dumbbell Fly": "Aperturas Inclinadas con Mancuernas",
  "Decline Dumbbell Fly": "Aperturas Declinadas con Mancuernas",
  "Cable Fly": "Aperturas en Polea",
  "Cable Crossover": "Cruce de Poleas",
  "Low Cable Fly": "Aperturas en Polea Baja",
  "High Cable Fly": "Aperturas en Polea Alta",
  "Pec Deck Fly": "Aperturas en Pec Deck",
  "Push-Up": "Flexiones",
  "Push-Ups": "Flexiones",
  "Incline Push-Up": "Flexiones Inclinadas",
  "Decline Push-Up": "Flexiones Declinadas",
  "Diamond Push-Up": "Flexiones en Diamante",
  "Wide Push-Up": "Flexiones Agarre Amplio",
  "Close-Grip Push-Up": "Flexiones Agarre Cerrado",
  "Archer Push-Up": "Flexiones en Arquero",
  "Chest Dip": "Fondos de Pecho",
  "Dips - Chest Version": "Fondos de Pecho",
  "Weighted Chest Dip": "Fondos de Pecho con Peso",
  "Chest Press": "Press de Pecho en Máquina",
  "Chest Squeeze Press": "Press de Pecho con Apriete",

  // ── Espalda ────────────────────────────────────────────────────────────────
  "Pull-Up": "Dominadas",
  "Pull-Ups": "Dominadas",
  "Wide-Grip Pull-Up": "Dominadas Agarre Amplio",
  "Close-Grip Pull-Up": "Dominadas Agarre Cerrado",
  "Neutral-Grip Pull-Up": "Dominadas Agarre Neutro",
  "Weighted Pull-Up": "Dominadas con Peso",
  "Band-Assisted Pull-Up": "Dominadas Asistidas con Banda",
  "Chin-Up": "Dominadas en Supino",
  "Chin-Ups": "Dominadas en Supino",
  "Neutral-Grip Chin-Up": "Dominadas Supinas Agarre Neutro",
  "Weighted Chin-Up": "Dominadas en Supino con Peso",
  "Barbell Row": "Remo con Barra",
  "Barbell Bent Over Row": "Remo Inclinado con Barra",
  "Pendlay Row": "Remo Pendlay",
  "Yates Row": "Remo Yates",
  "Dumbbell Row": "Remo con Mancuerna",
  "One-Arm Dumbbell Row": "Remo con Mancuerna a Un Brazo",
  "Dumbbell One-Arm Row": "Remo con Mancuerna a Un Brazo",
  "Kroc Row": "Remo Kroc",
  "Meadows Row": "Remo Meadows",
  "T-Bar Row": "Remo en T",
  "T Bar Row": "Remo en T",
  "Chest Supported Row": "Remo en Banco Inclinado",
  "Chest Supported Dumbbell Row": "Remo con Mancuernas en Banco Inclinado",
  "Seated Cable Row": "Remo en Polea Baja Sentado",
  "Cable Row": "Remo en Polea",
  "Wide-Grip Seated Cable Row": "Remo en Polea Baja Agarre Amplio",
  "Close-Grip Seated Cable Row": "Remo en Polea Baja Agarre Cerrado",
  "Lat Pulldown": "Jalón al Pecho",
  "Wide-Grip Lat Pulldown": "Jalón al Pecho Agarre Amplio",
  "Close-Grip Lat Pulldown": "Jalón al Pecho Agarre Cerrado",
  "Reverse-Grip Lat Pulldown": "Jalón al Pecho Agarre Supino",
  "Underhand Lat Pulldown": "Jalón al Pecho Agarre Supino",
  "Neutral-Grip Lat Pulldown": "Jalón al Pecho Agarre Neutro",
  "Smith Machine Bent Over Row": "Remo Inclinado en Máquina Smith",
  "Straight-Arm Pulldown": "Jalón de Brazos Rectos en Polea",
  "Straight Arm Pulldown": "Jalón de Brazos Rectos en Polea",
  "Single-Arm Lat Pulldown": "Jalón al Pecho a Un Brazo",
  "Hyperextension": "Hiperextensiones",
  "45 Degree Hyperextension": "Hiperextensiones a 45 Grados",
  "Back Extension": "Extensión de Espalda",
  "Good Morning": "Buenos Días",
  "Barbell Good Morning": "Buenos Días con Barra",
  "Seated Good Morning": "Buenos Días Sentado",
  "Rack Pull": "Peso Muerto Parcial desde Rack",
  "Face Pull": "Jalón a la Cara en Polea",
  "Straight-Arm Cable Pullover": "Pullover en Polea",
  "Dumbbell Pullover": "Pullover con Mancuerna",
  "Barbell Pullover": "Pullover con Barra",

  // ── Hombros ────────────────────────────────────────────────────────────────
  "Overhead Press": "Press Sobre la Cabeza",
  "Military Press": "Press Militar",
  "Barbell Shoulder Press": "Press de Hombros con Barra",
  "Seated Barbell Military Press": "Press Militar Sentado con Barra",
  "Seated Overhead Barbell Press": "Press de Hombros Sentado con Barra",
  "Standing Barbell Military Press": "Press Militar de Pie con Barra",
  "Dumbbell Shoulder Press": "Press de Hombros con Mancuernas",
  "Seated Dumbbell Shoulder Press": "Press de Hombros Sentado con Mancuernas",
  "Standing Dumbbell Shoulder Press": "Press de Hombros de Pie con Mancuernas",
  "Arnold Press": "Press Arnold",
  "Seated Arnold Press": "Press Arnold Sentado",
  "Push Press": "Press con Impulso",
  "Machine Shoulder Press": "Press de Hombros en Máquina",
  "Smith Machine Overhead Press": "Press de Hombros en Máquina Smith",
  "Lateral Raise": "Elevación Lateral",
  "Dumbbell Lateral Raise": "Elevación Lateral con Mancuernas",
  "Cable Lateral Raise": "Elevación Lateral en Polea",
  "Machine Lateral Raise": "Elevación Lateral en Máquina",
  "Seated Lateral Raise": "Elevación Lateral Sentado",
  "Front Raise": "Elevación Frontal",
  "Dumbbell Front Raise": "Elevación Frontal con Mancuernas",
  "Barbell Front Raise": "Elevación Frontal con Barra",
  "Cable Front Raise": "Elevación Frontal en Polea",
  "Plate Front Raise": "Elevación Frontal con Disco",
  "Rear Delt Fly": "Apertura Posterior",
  "Dumbbell Rear Delt Fly": "Apertura Posterior con Mancuernas",
  "Bent Over Dumbbell Rear Delt Fly": "Apertura Posterior Inclinado con Mancuernas",
  "Seated Rear Delt Fly": "Apertura Posterior Sentado",
  "Cable Rear Delt Fly": "Apertura Posterior en Polea",
  "Reverse Pec Deck": "Apertura Posterior en Pec Deck",
  "Upright Row": "Remo al Mentón",
  "Barbell Upright Row": "Remo al Mentón con Barra",
  "Dumbbell Upright Row": "Remo al Mentón con Mancuernas",
  "Cable Upright Row": "Remo al Mentón en Polea",
  "Shrug": "Encogimiento de Hombros",
  "Barbell Shrug": "Encogimiento con Barra",
  "Dumbbell Shrug": "Encogimiento con Mancuernas",
  "Cable Shrug": "Encogimiento en Polea",
  "Smith Machine Shrug": "Encogimiento en Máquina Smith",
  "Behind-the-Neck Press": "Press Detrás del Cuello",
  "Barbell Behind-the-Neck Press": "Press Detrás del Cuello con Barra",

  // ── Bíceps ────────────────────────────────────────────────────────────────
  "Barbell Curl": "Curl con Barra",
  "Standing Barbell Curl": "Curl con Barra de Pie",
  "Seated Barbell Curl": "Curl con Barra Sentado",
  "EZ-Bar Curl": "Curl con Barra EZ",
  "EZ Bar Curl": "Curl con Barra EZ",
  "Dumbbell Curl": "Curl con Mancuernas",
  "Alternating Dumbbell Curl": "Curl Alternado con Mancuernas",
  "Seated Dumbbell Curl": "Curl Sentado con Mancuernas",
  "Incline Dumbbell Curl": "Curl Inclinado con Mancuernas",
  "Hammer Curl": "Curl Martillo",
  "Dumbbell Hammer Curl": "Curl Martillo con Mancuernas",
  "Cross-Body Hammer Curl": "Curl Martillo Cruzado",
  "Cable Hammer Curl": "Curl Martillo en Polea",
  "Concentration Curl": "Curl Concentrado",
  "Preacher Curl": "Curl en Predicador (Scott)",
  "Barbell Preacher Curl": "Curl en Predicador con Barra",
  "Dumbbell Preacher Curl": "Curl en Predicador con Mancuerna",
  "EZ-Bar Preacher Curl": "Curl en Predicador con Barra EZ",
  "Cable Curl": "Curl en Polea",
  "Reverse Curl": "Curl Inverso",
  "Reverse Barbell Curl": "Curl Inverso con Barra",
  "Reverse EZ-Bar Curl": "Curl Inverso con Barra EZ",
  "Cable Reverse Curl": "Curl Inverso en Polea",
  "Spider Curl": "Curl Araña",
  "Machine Curl": "Curl en Máquina",
  "Rope Hammer Curl": "Curl Martillo con Cuerda en Polea",

  // ── Tríceps ────────────────────────────────────────────────────────────────
  "Triceps Pushdown": "Jalón de Tríceps en Polea",
  "Tricep Pushdown": "Jalón de Tríceps en Polea",
  "Cable Tricep Pushdown": "Jalón de Tríceps en Polea",
  "Rope Tricep Pushdown": "Jalón de Tríceps con Cuerda",
  "Straight Bar Tricep Pushdown": "Jalón de Tríceps con Barra Recta",
  "Reverse Tricep Pushdown": "Jalón de Tríceps Agarre Supino",
  "Skull Crusher": "Press Francés",
  "Barbell Skull Crusher": "Press Francés con Barra",
  "EZ-Bar Skull Crusher": "Press Francés con Barra EZ",
  "Dumbbell Skull Crusher": "Press Francés con Mancuernas",
  "Lying Tricep Extension": "Extensión de Tríceps Acostado",
  "Lying Barbell Tricep Extension": "Extensión de Tríceps Acostado con Barra",
  "Lying Dumbbell Tricep Extension": "Extensión de Tríceps Acostado con Mancuernas",
  "Overhead Tricep Extension": "Extensión de Tríceps Sobre la Cabeza",
  "Dumbbell Overhead Tricep Extension": "Extensión de Tríceps Sobre la Cabeza con Mancuerna",
  "Cable Overhead Tricep Extension": "Extensión de Tríceps Sobre la Cabeza en Polea",
  "Seated Overhead Tricep Extension": "Extensión de Tríceps Sobre la Cabeza Sentado",
  "Tricep Dip": "Fondos de Tríceps",
  "Dips - Triceps Version": "Fondos de Tríceps",
  "Weighted Tricep Dip": "Fondos de Tríceps con Peso",
  "Tricep Kickback": "Patada de Tríceps",
  "Dumbbell Kickback": "Patada de Tríceps con Mancuerna",
  "Cable Kickback": "Patada de Tríceps en Polea",
  "Close-Grip Bench Press": "Press de Banca Agarre Cerrado",
  "Machine Tricep Extension": "Extensión de Tríceps en Máquina",
  "Diamond Push-Ups": "Flexiones en Diamante",

  // ── Piernas / Cuádriceps ───────────────────────────────────────────────────
  "Barbell Squat": "Sentadilla con Barra",
  "Back Squat": "Sentadilla Trasera",
  "Front Squat": "Sentadilla Frontal",
  "Hack Squat": "Sentadilla Hack en Máquina",
  "Barbell Hack Squat": "Sentadilla Hack con Barra",
  "Box Squat": "Sentadilla en Cajón",
  "Sumo Squat": "Sentadilla Sumo",
  "Goblet Squat": "Sentadilla Goblet",
  "Dumbbell Squat": "Sentadilla con Mancuernas",
  "Smith Machine Squat": "Sentadilla en Máquina Smith",
  "Bulgarian Split Squat": "Sentadilla Búlgara",
  "Barbell Bulgarian Split Squat": "Sentadilla Búlgara con Barra",
  "Dumbbell Bulgarian Split Squat": "Sentadilla Búlgara con Mancuernas",
  "Overhead Squat": "Sentadilla Sobre la Cabeza",
  "Pause Squat": "Sentadilla con Pausa",
  "Zercher Squat": "Sentadilla Zercher",
  "Safety Bar Squat": "Sentadilla con Barra Safety",
  "Leg Press": "Prensa de Piernas",
  "45 Degree Leg Press": "Prensa de Piernas a 45 Grados",
  "Leg Extension": "Extensión de Cuádriceps",
  "Machine Leg Extension": "Extensión de Cuádriceps en Máquina",
  "Leg Curl": "Curl de Isquiotibiales",
  "Lying Leg Curl": "Curl de Isquiotibiales Acostado",
  "Seated Leg Curl": "Curl de Isquiotibiales Sentado",
  "Standing Leg Curl": "Curl de Isquiotibiales de Pie",
  "Machine Leg Curl": "Curl de Isquiotibiales en Máquina",
  "Barbell Lunge": "Zancadas con Barra",
  "Dumbbell Lunge": "Zancadas con Mancuernas",
  "Walking Lunge": "Zancadas Caminando",
  "Reverse Lunge": "Zancadas Inversas",
  "Lateral Lunge": "Zancadas Laterales",
  "Barbell Walking Lunge": "Zancadas Caminando con Barra",
  "Step-Up": "Subida al Cajón",
  "Barbell Step-Up": "Subida al Cajón con Barra",
  "Dumbbell Step-Up": "Subida al Cajón con Mancuernas",
  "Box Jump": "Salto al Cajón",
  "Broad Jump": "Salto en Longitud",
  "Jump Squat": "Sentadilla con Salto",
  "Split Squat": "Sentadilla en Zancada",
  "Barbell Split Squat": "Sentadilla en Zancada con Barra",
  "Pistol Squat": "Sentadilla a Una Pierna",

  // ── Isquiotibiales / Glúteos ───────────────────────────────────────────────
  "Deadlift": "Peso Muerto",
  "Barbell Deadlift": "Peso Muerto con Barra",
  "Romanian Deadlift": "Peso Muerto Rumano",
  "Barbell Romanian Deadlift": "Peso Muerto Rumano con Barra",
  "Dumbbell Romanian Deadlift": "Peso Muerto Rumano con Mancuernas",
  "Single-Leg Romanian Deadlift": "Peso Muerto Rumano a Una Pierna",
  "Dumbbell Single-Leg Romanian Deadlift": "Peso Muerto Rumano a Una Pierna con Mancuernas",
  "Stiff-Leg Deadlift": "Peso Muerto Piernas Rígidas",
  "Barbell Stiff-Leg Deadlift": "Peso Muerto Piernas Rígidas con Barra",
  "Sumo Deadlift": "Peso Muerto Sumo",
  "Sumo Deadlift High Pull": "Jalón Alto Peso Muerto Sumo",
  "Trap Bar Deadlift": "Peso Muerto con Barra Hexagonal",
  "Snatch-Grip Deadlift": "Peso Muerto Agarre de Arranque",
  "Nordic Hamstring Curl": "Curl Nórdico de Isquiotibiales",
  "Glute Bridge": "Puente de Glúteos",
  "Barbell Glute Bridge": "Puente de Glúteos con Barra",
  "Single-Leg Glute Bridge": "Puente de Glúteos a Una Pierna",
  "Hip Thrust": "Hip Thrust",
  "Barbell Hip Thrust": "Hip Thrust con Barra",
  "Dumbbell Hip Thrust": "Hip Thrust con Mancuerna",
  "Smith Machine Hip Thrust": "Hip Thrust en Máquina Smith",
  "Single-Leg Hip Thrust": "Hip Thrust a Una Pierna",
  "Cable Pull Through": "Jalón Entre Piernas en Polea",
  "Glute Kickback": "Patada de Glúteo",
  "Cable Glute Kickback": "Patada de Glúteo en Polea",
  "Machine Glute Kickback": "Patada de Glúteo en Máquina",
  "Donkey Kick": "Patada de Burro",
  "Hip Abduction": "Abducción de Cadera",
  "Machine Hip Abduction": "Abducción de Cadera en Máquina",
  "Cable Hip Abduction": "Abducción de Cadera en Polea",
  "Hip Adduction": "Aducción de Cadera",
  "Machine Hip Adduction": "Aducción de Cadera en Máquina",
  "Cable Hip Adduction": "Aducción de Cadera en Polea",

  // ── Pantorrillas ───────────────────────────────────────────────────────────
  "Calf Raise": "Elevación de Pantorrillas",
  "Standing Calf Raise": "Elevación de Pantorrillas de Pie",
  "Seated Calf Raise": "Elevación de Pantorrillas Sentado",
  "Donkey Calf Raise": "Elevación de Pantorrillas con Máquina Asno",
  "Leg Press Calf Raise": "Elevación de Pantorrillas en Prensa",
  "Single-Leg Calf Raise": "Elevación de Pantorrillas a Una Pierna",
  "Smith Machine Calf Raise": "Elevación de Pantorrillas en Máquina Smith",
  "Barbell Calf Raise": "Elevación de Pantorrillas con Barra",

  // ── Abdomen ────────────────────────────────────────────────────────────────
  "Crunch": "Crunch",
  "Bicycle Crunch": "Crunch de Bicicleta",
  "Cable Crunch": "Crunch en Polea",
  "Machine Crunch": "Crunch en Máquina",
  "Decline Crunch": "Crunch Declinado",
  "Weighted Crunch": "Crunch con Peso",
  "Plank": "Plancha",
  "Side Plank": "Plancha Lateral",
  "Weighted Plank": "Plancha con Peso",
  "Sit-Up": "Abdominal Completo",
  "Decline Sit-Up": "Abdominal Completo Declinado",
  "Weighted Sit-Up": "Abdominal Completo con Peso",
  "Leg Raise": "Elevación de Piernas",
  "Hanging Leg Raise": "Elevación de Piernas Colgado",
  "Lying Leg Raise": "Elevación de Piernas Acostado",
  "Hanging Knee Raise": "Elevación de Rodillas Colgado",
  "Russian Twist": "Giro Ruso",
  "Weighted Russian Twist": "Giro Ruso con Peso",
  "Ab Rollout": "Rueda Abdominal",
  "Barbell Rollout": "Rueda Abdominal con Barra",
  "Dragon Flag": "Bandera del Dragón",
  "V-Up": "Abdominal en V",
  "Hollow Body Hold": "Posición Hueca",
  "Toe Touch": "Toque de Pies",
  "Windshield Wiper": "Limpiaparabrisas",
  "Cable Woodchop": "Rotación con Polea",
  "Pallof Press": "Press Pallof",
  "Dead Bug": "Insecto Muerto",
  "Mountain Climber": "Escalador",
  "Flutter Kick": "Patadas Alternas",

  // ── Levantamiento Olímpico ─────────────────────────────────────────────────
  "Clean and Jerk": "Dos Tiempos",
  "Snatch": "Arranque",
  "Power Clean": "Cargada de Potencia",
  "Hang Clean": "Cargada desde Colgado",
  "Hang Power Clean": "Cargada de Potencia desde Colgado",
  "Power Snatch": "Arranque de Potencia",
  "Hang Snatch": "Arranque desde Colgado",
  "Hang Power Snatch": "Arranque de Potencia desde Colgado",
  "Clean Pull": "Tirón de Cargada",
  "Snatch Pull": "Tirón de Arranque",
  "Clean Deadlift": "Peso Muerto de Cargada",
  "Power Jerk": "Envión de Potencia",
  "Push Jerk": "Envión con Doblado de Rodillas",
  "Split Jerk": "Envión con Zancada",
  "Muscle Clean": "Cargada Muscular",
  "Muscle Snatch": "Arranque Muscular",
  "Clean": "Cargada",
  "Jerk": "Envión",
  "Block Clean": "Cargada desde Bloques",
  "Block Snatch": "Arranque desde Bloques",

  // ── Strongman ──────────────────────────────────────────────────────────────
  "Farmer's Walk": "Caminata del Granjero",
  "Farmers Walk": "Caminata del Granjero",
  "Farmers Carry": "Caminata del Granjero",
  "Tire Flip": "Volteo de Llanta",
  "Sled Push": "Empuje del Trineo",
  "Sled Pull": "Jalón del Trineo",
  "Log Press": "Press de Tronco",
  "Atlas Stone": "Piedra Atlas",
  "Atlas Stone To Platform": "Piedra Atlas a Plataforma",
  "Yoke Walk": "Caminata con Yugo",
  "Sandbag Carry": "Cargada de Bolsa de Arena",
  "Keg Toss": "Lanzamiento de Barril",
  "Axle Press": "Press con Eje",
  "Circus Dumbbell": "Mancuerna de Circo",
  "Loading Race": "Carrera de Cargas",

  // ── Pliométria ─────────────────────────────────────────────────────────────
  "Depth Jump": "Salto en Profundidad",
  "Tuck Jump": "Salto con Rodillas al Pecho",
  "Single-Leg Box Jump": "Salto al Cajón a Una Pierna",
  "Bounding": "Saltos Progresivos",
  "Depth Drop": "Caída en Profundidad",
  "Lateral Bound": "Salto Lateral",
  "Medicine Ball Slam": "Lanzamiento de Pelota Medicinal al Suelo",
  "Medicine Ball Throw": "Lanzamiento de Pelota Medicinal",
  "Hurdle Jump": "Salto de Valla",
  "Plyo Push-Up": "Flexiones Pliométricas",
  "Clap Push-Up": "Flexiones con Palmada",

  // ── Trapecios / Cuello ─────────────────────────────────────────────────────
  "Neck Extension": "Extensión de Cuello",
  "Neck Flexion": "Flexión de Cuello",
  "Neck Lateral Flexion": "Flexión Lateral de Cuello",
  "Neck Curl": "Curl de Cuello",
  "Barbell Neck Press": "Press de Cuello con Barra",
  "Overhead Shrug": "Encogimiento sobre la Cabeza",

  // ── Antebrazos / Muñecas ───────────────────────────────────────────────────
  "Wrist Curl": "Curl de Muñeca",
  "Barbell Wrist Curl": "Curl de Muñeca con Barra",
  "Dumbbell Wrist Curl": "Curl de Muñeca con Mancuerna",
  "Reverse Wrist Curl": "Curl de Muñeca Invertido",
  "Barbell Reverse Wrist Curl": "Curl de Muñeca Invertido con Barra",
  "Wrist Roller": "Rodillo de Muñeca",
  "Plate Pinch": "Pellizco de Disco",
  "Farmer's Hold": "Agarre del Granjero",
  "Dead Hang": "Colgada Estática",
};

// ── Word-level substitution fallback ─────────────────────────────────────────
const WORD_MAP: [RegExp, string][] = [
  [/\bSmith Machine\b/gi, "en Máquina Smith"],
  [/\bKettlebell(s)?\b/gi, "con Kettlebell"],
  [/\bBarbell\b/gi, "con Barra"],
  [/\bDumbbell(s)?\b/gi, "con Mancuernas"],
  [/\bEZ-Bar\b/gi, "con Barra EZ"],
  [/\bEZ Bar\b/gi, "con Barra EZ"],
  [/\bCable\b/gi, "en Polea"],
  [/\bMachine\b/gi, "en Máquina"],
  [/\bBand(s)?\b/gi, "con Banda"],
  [/\bRope(s)?\b/gi, "con Cuerda"],
  [/\bPlate(s)?\b/gi, "con Disco"],
  [/\bChain(s)?\b/gi, "con Cadenas"],
  [/\bSandbag\b/gi, "con Bolsa de Arena"],
  [/\bMedicine Ball\b/gi, "con Pelota Medicinal"],
  [/\bBall\b/gi, "con Pelota"],
  [/\bSled\b/gi, "con Trineo"],
  [/\bRing(s)?\b/gi, "en Anillas"],
  [/\bTRX\b/gi, "en TRX"],
  [/\bSuspension\b/gi, "en Suspensión"],
  [/\bBattling Ropes?\b/gi, "Cuerdas de Batalla"],
  [/\bClose-Grip\b/gi, "Agarre Cerrado"],
  [/\bWide-Grip\b/gi, "Agarre Amplio"],
  [/\bNeutral-Grip\b/gi, "Agarre Neutro"],
  [/\bReverse-Grip\b/gi, "Agarre Supino"],
  [/\bSnatch-Grip\b/gi, "Agarre de Arranque"],
  [/\bUnderhand\b/gi, "Agarre Supino"],
  [/\bOverhand\b/gi, "Agarre Prono"],
  [/\bAlternating\b/gi, "Alternado"],
  [/\bAlternate\b/gi, "Alternado"],
  [/\bWeighted\b/gi, "con Peso"],
  [/\bAssisted\b/gi, "Asistido"],
  [/\bSeated\b/gi, "Sentado"],
  [/\bStanding\b/gi, "de Pie"],
  [/\bLying\b/gi, "Acostado"],
  [/\bIncline(d)?\b/gi, "Inclinado"],
  [/\bDecline(d)?\b/gi, "Declinado"],
  [/\bOverhead\b/gi, "Sobre la Cabeza"],
  [/\bBehind-the-Neck\b/gi, "Detrás del Cuello"],
  [/\bOne-Arm\b/gi, "a Un Brazo"],
  [/\bSingle-Arm\b/gi, "a Un Brazo"],
  [/\bOne-Leg\b/gi, "a Una Pierna"],
  [/\bSingle-Leg\b/gi, "a Una Pierna"],
  [/\bBent Over\b/gi, "Inclinado"],
  [/\bProne\b/gi, "Prono"],
  [/\bSupine\b/gi, "Supino"],
  [/\bFloor\b/gi, "en Suelo"],
  [/\bWall\b/gi, "en Pared"],
  [/\bBench\b/gi, "en Banco"],
  [/\bBox\b/gi, "en Cajón"],
  [/\bHang(ing)?\b/gi, "Colgado"],
  [/\bAdvanced\b/gi, "Avanzado"],
  [/\bBench Press\b/gi, "Press de Banca"],
  [/\bShoulder Press\b/gi, "Press de Hombros"],
  [/\bMilitary Press\b/gi, "Press Militar"],
  [/\bArnold Press\b/gi, "Press Arnold"],
  [/\bPush Press\b/gi, "Press con Impulso"],
  [/\bOverhead Press\b/gi, "Press Sobre la Cabeza"],
  [/\bDeadlift\b/gi, "Peso Muerto"],
  [/\bSquat\b/gi, "Sentadilla"],
  [/\bLunge(s)?\b/gi, "Zancada"],
  [/\bPull-Up\b/gi, "Dominada"],
  [/\bPullup\b/gi, "Dominada"],
  [/\bChin-Up\b/gi, "Dominada en Supino"],
  [/\bPulldown\b/gi, "Jalón al Pecho"],
  [/\bPull-Down\b/gi, "Jalón al Pecho"],
  [/\bRow\b/gi, "Remo"],
  [/\bCurl\b/gi, "Curl"],
  [/\bPress\b/gi, "Press"],
  [/\bExtension\b/gi, "Extensión"],
  [/\bRaise(s)?\b/gi, "Elevación"],
  [/\bFly\b/gi, "Apertura"],
  [/\bFlye\b/gi, "Apertura"],
  [/\bShrug(s)?\b/gi, "Encogimiento"],
  [/\bDip(s)?\b/gi, "Fondos"],
  [/\bPush-?Up(s)?\b/gi, "Flexión"],
  [/\bCrunch(es)?\b/gi, "Crunch"],
  [/\bPlank\b/gi, "Plancha"],
  [/\bTwist\b/gi, "Giro"],
  [/\bThrust\b/gi, "Empuje"],
  [/\bBridge\b/gi, "Puente"],
  [/\bKickback(s)?\b/gi, "Patada"],
  [/\bStep-?Up(s)?\b/gi, "Subida al Cajón"],
  [/\bHyperextension(s)?\b/gi, "Hiperextensión"],
  [/\bGood Morning(s)?\b/gi, "Buenos Días"],
  [/\bSnatch\b/gi, "Arranque"],
  [/\bClean\b/gi, "Cargada"],
  [/\bJerk\b/gi, "Envión"],
  [/\bThruster(s)?\b/gi, "Thruster"],
  [/\bCarry\b/gi, "Caminata"],
  [/\bWalk(ing)?\b/gi, "Caminata"],
  [/\bDrag\b/gi, "Arrastre"],
  [/\bPush\b/gi, "Empuje"],
  [/\bPull\b/gi, "Jalón"],
  [/\bJump(s)?\b/gi, "Salto"],
  [/\bBound(ing|s)?\b/gi, "Salto"],
  [/\bHop(s)?\b/gi, "Salto"],
  [/\bSprint(s)?\b/gi, "Sprint"],
  [/\bWindmill\b/gi, "Molino"],
  [/\bSwing(s)?\b/gi, "Balanceo"],
  [/\bSit-?Up(s)?\b/gi, "Abdominal Completo"],
  [/\bRollout\b/gi, "Rueda Abdominal"],
  [/\bRomanian\b/gi, "Rumano"],
  [/\bSumo\b/gi, "Sumo"],
  [/\bHack\b/gi, "Hack"],
  [/\bFront\b/gi, "Frontal"],
  [/\bReverse\b/gi, "Inverso"],
  [/\bLateral\b/gi, "Lateral"],
  [/\bRear\b/gi, "Posterior"],
  [/\bNordic\b/gi, "Nórdico"],
  [/\bBulgarian\b/gi, "Búlgaro"],
  [/\bZercher\b/gi, "Zercher"],
  [/\bPendlay\b/gi, "Pendlay"],
  [/\bDiagonal\b/gi, "Diagonal"],
  [/\bCross-?Body\b/gi, "Cruzado"],
  [/\bConcentration\b/gi, "Concentrado"],
  [/\bPreacher\b/gi, "en Predicador"],
  [/\bSpider\b/gi, "Araña"],
  [/\bHammer\b/gi, "Martillo"],
  [/\bPallof\b/gi, "Pallof"],
  [/\bGlute\b/gi, "Glúteo"],
  [/\bHip\b/gi, "Cadera"],
  [/\bNarrow\b/gi, "Agarre Estrecho"],
  [/\bWide\b/gi, "Amplio"],
  [/\bStiff-?Leg(ged)?\b/gi, "Piernas Rígidas"],
  [/\bStraight-?Arm\b/gi, "Brazos Rectos"],
];

function applyWordMap(name: string): string {
  let result = name;
  for (const [pattern, replacement] of WORD_MAP) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

function translateName(name: string): string {
  if (EXACT[name]) return EXACT[name];
  const lowerName = name.toLowerCase();
  for (const [key, val] of Object.entries(EXACT)) {
    if (key.toLowerCase() === lowerName) return val;
  }
  return applyWordMap(name);
}

interface RawExercise {
  id: string;
  name: string;
  category: string;
  images: string[];
}

async function main() {
  console.log("Fetching free-exercise-db...");
  const res = await fetch(FREE_EXERCISE_DB_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const raw: RawExercise[] = await res.json();

  // Filter to the same categories we seeded from
  const filtered = raw.filter((ex) => ALLOWED_CATEGORIES.has(ex.category.toLowerCase()));
  console.log(`Total: ${raw.length}, after category filter: ${filtered.length}`);

  // Build lookup: translatedName (lowercase) → image URL
  // Also add original English name as fallback (for exercises not translated)
  const imageMap = new Map<string, string>();
  for (const ex of filtered) {
    if (!ex.images || ex.images.length === 0) continue;
    const imageUrl = IMAGE_BASE + ex.images[0];
    const translated = translateName(ex.name).toLowerCase();
    const original = ex.name.toLowerCase();
    // Translated name takes priority; original English name as fallback
    imageMap.set(translated, imageUrl);
    if (!imageMap.has(original)) {
      imageMap.set(original, imageUrl);
    }
  }

  console.log(`Built image map with ${imageMap.size} entries.`);

  // Fetch all exercises from Supabase (with or without video_url — update all)
  console.log("Fetching exercises from Supabase...");
  const { data: dbExercises, error } = await supabase
    .from("exercise_library")
    .select("id, name, video_url");

  if (error) throw error;
  if (!dbExercises || dbExercises.length === 0) {
    console.log("No exercises found in DB.");
    return;
  }

  console.log(`Found ${dbExercises.length} exercises in DB.`);

  let matched = 0;
  let notFound = 0;
  const notFoundList: string[] = [];

  const updates: { id: string; video_url: string }[] = [];

  for (const ex of dbExercises) {
    const key = ex.name.toLowerCase();
    const imageUrl = imageMap.get(key);
    if (imageUrl) {
      updates.push({ id: ex.id, video_url: imageUrl });
      matched++;
    } else {
      notFound++;
      notFoundList.push(ex.name);
    }
  }

  console.log(`\nMatched: ${matched}, Not found: ${notFound}`);

  if (updates.length === 0) {
    console.log("Nothing to update.");
    return;
  }

  // Apply updates in batches of 50
  const BATCH = 50;
  let applied = 0;

  for (let i = 0; i < updates.length; i += BATCH) {
    const batch = updates.slice(i, i + BATCH);
    for (const u of batch) {
      const { error: upErr } = await supabase
        .from("exercise_library")
        .update({ video_url: u.video_url })
        .eq("id", u.id);

      if (upErr) {
        console.error(`Error updating ${u.id}:`, upErr.message);
      } else {
        applied++;
      }
    }
    console.log(`Updated ${Math.min(i + BATCH, updates.length)}/${updates.length}`);
  }

  console.log(`\nDone! Updated ${applied} exercises with image URLs.`);

  if (notFoundList.length > 0) {
    const sample = notFoundList.slice(0, 20);
    console.log(`\nNo image found for (${notFoundList.length} total, showing first 20):`);
    sample.forEach((n) => console.log(`  - ${n}`));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
