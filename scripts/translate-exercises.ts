/**
 * Translate exercise names in exercise_library to proper Spanish gym terminology.
 * Run with: npx tsx scripts/translate-exercises.ts
 *
 * Uses specific exercise name mappings based on standard Spanish gym vocabulary
 * used in Argentina and Latin America. Not a direct translation — names use the
 * terms actually used in gyms.
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

// ── Exact name overrides ──────────────────────────────────────────────────────
// Full exercise name → proper Spanish gym name.
// These take priority over the pattern-based fallback.
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
  "One-Arm Push-Up": "Flexiones a Un Brazo",
  "One-Arm Push-Ups": "Flexiones a Un Brazo",
  "Single-Arm Push-Up": "Flexiones a Un Brazo",
  "Feet-Elevated Push-Up": "Flexiones con Pies Elevados",
  "Feet Elevated Push-Up": "Flexiones con Pies Elevados",
  "Feet-Elevated Push-Ups": "Flexiones con Pies Elevados",
  "Pike Push-Up": "Flexiones en Pica",
  "Pike Push-Ups": "Flexiones en Pica",
  "Pseudo Planche Push-Up": "Flexiones Pseudo Plancha",
  "Ring Push-Up": "Flexiones en Anillas",
  "Hindu Push-Up": "Flexiones Hindú",
  "Chest Dip": "Fondos de Pecho",
  "Dips - Chest Version": "Fondos de Pecho",
  "Weighted Chest Dip": "Fondos de Pecho con Peso",
  "Chest Press": "Press de Pecho en Máquina",
  "Chest Squeeze Press": "Press de Pecho con Apriete",

  // ── Espalda ────────────────────────────────────────────────────────────────
  "Pull-Up": "Dominadas",
  "Pull-Ups": "Dominadas",
  "Pullup": "Dominadas",
  "Pullups": "Dominadas",
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
  "Single-Leg Lateral Bound": "Salto Lateral a Una Pierna",
  "Single-Leg Lateral Jump": "Salto Lateral a Una Pierna",
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

  // ── Nombres que quedaron mal en corridas anteriores (español incorrecto) ──
  "con Banda Buenos Días": "Buenos Días con Banda",
  "con Banda Buenos Días (Jalón Through)": "Buenos Días con Banda (Jalón)",
  "Back Flyes — con con Banda": "Aperturas Posteriores con Banda",
  "Arnold con Mancuernas Press": "Press Arnold con Mancuernas",
  "Arnold Press con Mancuernas": "Press Arnold con Mancuernas",
  "en Polea Press de Hombros Alternado": "Press de Hombros en Polea Alternado",
  "Inclinado con Mancuernas Curl Alternado": "Curl Alternado con Mancuernas Inclinado",
  "con Barra Ab Rueda Abdominal": "Rueda Abdominal con Barra",
  "con Barra Curls Acostado Against An Inclinado": "Curl con Barra Acostado en Banco Inclinado",
  "con Barra en Banco Press — Medium Grip": "Press de Banca con Barra — Agarre Medio",
  "con Pelota Leg Curl": "Curl de Isquiotibiales con Pelota",
  "Backward con Pelota Medicinal Throw": "Lanzamiento de Pelota Medicinal Hacia Atrás",
  "Backward Arrastre": "Arrastre Hacia Atrás",
  "Leg Diagonal Salto Alternado": "Salto Diagonal Alternado",
  "Deltoid Elevación Alternado": "Elevación de Deltoides Alternado",
  "Colgado Cargada Alternado": "Cargada desde Colgado Alternado",

  // ── Sin traducción específica ──────────────────────────────────────────────
  "Ab Roller": "Rueda Abdominal",
  "Atlas Stones": "Piedras Atlas",
  "Atlas Stone Trainer": "Entrenador de Piedra Atlas",
  "Around The Worlds": "Giros Completos con Mancuerna",
  "Anti-Gravity Press": "Press Anti-Gravedad",
  "Heel Touchers Alternado": "Toque de Talones Alternado",
  "Heel Touchers": "Toque de Talones",
  "Air Squat": "Sentadilla al Aire",
  "Burpee": "Burpee",
  "Burpees": "Burpees",
  "Thruster": "Thruster",
  "Thrusters": "Thrusters",
  "Turkish Get-Up": "Levantada Turca",
  "Windmill": "Molino",
  "Get Up Sit Up": "Incorporación",
  "Bear Crawl": "Arrastre del Oso",
  "Inchworm": "Oruga",
  "World's Greatest Stretch": "El Gran Estiramiento",

  // ── Kettlebell específicos ─────────────────────────────────────────────────
  "con con con con con Kettlebell Arranque a Un Brazo": "Arranque con Kettlebell a Un Brazo",
  "con con con con con Kettlebell Balanceo a Un Brazo": "Balanceo con Kettlebell a Un Brazo",
  "con con con con con Kettlebell Cargada a Un Brazo": "Cargada con Kettlebell a Un Brazo",
  "con con con con con Kettlebell Cargada and Envión a Un Brazo": "Cargada y Envión con Kettlebell a Un Brazo",
  "con con con con con Kettlebell Colgado Cargada": "Cargada desde Colgado con Kettlebell",
  "con con con con con Kettlebell Dead Cargada": "Cargada Muerta con Kettlebell",
  "con con con con con Kettlebell Envión a Un Brazo": "Envión con Kettlebell a Un Brazo",
  "con con con con con Kettlebell Figure 8": "Figure 8 con Kettlebell",
  "con con con con con Kettlebell Molino": "Molino con Kettlebell",
  "con con con con con Kettlebell One-Legged Peso Muerto": "Peso Muerto con Kettlebell a Una Pierna",
  "con con con con con Kettlebell Para Press a Un Brazo": "Press con Kettlebell a Un Brazo (Para)",
  "con con con con con Kettlebell Pass Between The Legs": "Paso con Kettlebell Entre Las Piernas",
  "con con con con con Kettlebell Pirate Ships": "Pirate Ships con Kettlebell",
  "con con con con con Kettlebell Pistol Sentadilla": "Sentadilla Pistola con Kettlebell",
  "con con con con con Kettlebell Press Alternado": "Press con Kettlebell Alternado",
  "con con con con con Kettlebell Press Arnold": "Press Arnold con Kettlebell",
  "con con con con con Kettlebell Press Militar To The Side a Un Brazo": "Press Militar Lateral con Kettlebell a Un Brazo",
  "con con con con con Kettlebell Press con Impulso a Un Brazo": "Press con Impulso con Kettlebell a Un Brazo",
  "con con con con con Kettlebell Remo Alternado": "Remo con Kettlebell Alternado",
  "con con con con con Kettlebell Remo a Un Brazo": "Remo con Kettlebell a Un Brazo",
  "con con con con con Kettlebell Seesaw Press": "Press Balancín con Kettlebell",
  "con con con con con Kettlebell Sentado Press": "Press Sentado con Kettlebell",
  "con con con con con Kettlebell Split Arranque a Un Brazo": "Arranque en Zancada con Kettlebell a Un Brazo",
  "con con con con con Kettlebell Split Envión a Un Brazo": "Envión en Zancada con Kettlebell a Un Brazo",
  "con con con con con Kettlebell Sumo High Jalón": "Jalón Alto Sumo con Kettlebell",
  "con con con con con Kettlebell Thruster": "Thruster con Kettlebell",
  "con con con con con Kettlebell Turkish Get-Up (Sentadilla style)": "Levantada Turca con Kettlebell (Estilo Sentadilla)",
  "con con con con con Kettlebell Turkish Get-Up (Zancada style)": "Levantada Turca con Kettlebell (Estilo Zancada)",
  "con con con con con Kettlebell en Suelo Press a Un Brazo": "Press en Suelo con Kettlebell a Un Brazo",
  "Double con con con con con Kettlebell Alternado Colgado Cargada": "Cargada desde Colgado con Dos Kettlebells Alternado",
  "Double con con con con con Kettlebell Arranque": "Arranque con Dos Kettlebells",
  "Double con con con con con Kettlebell Envión": "Envión con Dos Kettlebells",
  "Double con con con con con Kettlebell Molino": "Molino con Dos Kettlebells",
  "Double con con con con con Kettlebell Press con Impulso": "Press con Impulso con Dos Kettlebells",
  "Two-Arm con con con con con Kettlebell Cargada": "Cargada con Dos Kettlebells",
  "Two-Arm con con con con con Kettlebell Envión": "Envión con Dos Kettlebells",
  "Two-Arm con con con con con Kettlebell Press Militar": "Press Militar con Dos Kettlebells",
  "Two-Arm con con con con con Kettlebell Remo": "Remo con Dos Kettlebells",
  "Avanzado con con con con con Kettlebell Molino": "Molino con Kettlebell Avanzado",
  "Extended Range a Un Brazo con con con con con Kettlebell en Suelo Press": "Press en Suelo con Kettlebell a Un Brazo — Rango Extendido",
  "Frontal Squats con Two con con con con con Kettlebell": "Sentadilla Frontal con Dos Kettlebells",
  "Open Palm con con con con con Kettlebell Cargada": "Cargada con Kettlebell Palma Abierta",
  "Open Palm con con con con con Kettlebell Cargada a Un Brazo": "Cargada con Kettlebell Palma Abierta a Un Brazo",
  "Plyo con con con con con Kettlebell Flexión": "Flexiones Pliométricas con Kettlebell",
  "Sobre la Cabeza con con con con con Kettlebell Squats a Un Brazo": "Sentadilla Sobre la Cabeza con Kettlebell a Un Brazo",

  // ── Banda / Cadenas (cleanup de "con con") ─────────────────────────────────
  "Abdominal Completo — con con Banda con Peso": "Abdominal Completo con Banda y Peso",
  "Cadera Extensión con con Banda": "Extensión de Cadera con Banda",
  "Cadera Flexion con con Banda": "Flexión de Cadera con Banda",
  "Cadera Lift con con Banda": "Elevación de Cadera con Banda",
  "Calf Elevación — con con Banda": "Elevación de Pantorrillas con Banda",
  "Cross Over — con con Banda": "Cruce de Poleas con Banda",
  "External Rotation con con Banda": "Rotación Externa con Banda",
  "Flexión con con Pies Elevados": "Flexiones con Pies Elevados",
  "Internal Rotation con con Banda": "Rotación Interna con Banda",
  "Lateral Elevación — con con Banda": "Elevación Lateral con Banda",
  "Peso Muerto con con Banda": "Peso Muerto con Banda",
  "Peso Muerto con con Cadenas": "Peso Muerto con Cadenas",
  "Press de Hombros — con con Banda": "Press de Hombros con Banda",
  "Rack Jalón con con Banda": "Jalón desde Rack con Banda",
  "Sentadilla con con Banda": "Sentadilla con Banda",
  "Sentadilla con con Cadenas": "Sentadilla con Cadenas",
  "Sentadilla con con Disco Movers": "Sentadilla con Disco (Movers)",
  "Split Sentadilla con con Mancuernas": "Sentadilla Split con Mancuernas",
  "Squats — con con Banda": "Sentadilla con Banda",
  "Sumo Peso Muerto con con Banda": "Peso Muerto Sumo con Banda",
  "Sumo Peso Muerto con con Cadenas": "Peso Muerto Sumo con Cadenas",
  "Triceps Sobre la Cabeza Extensión con con Cuerda": "Extensión de Tríceps Sobre la Cabeza con Cuerda",
  "Upright Remo — con con Banda": "Remo al Mentón con Banda",
  "en Banco Press con con Cadenas": "Press de Banca con Cadenas",
  "en Banco Press — con con Banda": "Press de Banca con Banda",
  "en Cajón Sentadilla con con Banda": "Sentadilla en Cajón con Banda",
  "en Cajón Sentadilla con con Cadenas": "Sentadilla en Cajón con Cadenas",
  "en Suelo Press con con Cadenas": "Press en Suelo con Cadenas",
  "con Barra EZ Curl con con Banda Agarre Cerrado": "Curl con Barra EZ y Banda Agarre Cerrado",

  // ── Nombres con "con X" al inicio (reubicados) ─────────────────────────────
  "con Banda Asistido Dominada": "Dominada Asistida con Banda",
  "con Banda Cadera Adductions": "Aducción de Cadera con Banda",
  "con Barra EZ Curl Agarre Cerrado": "Curl con Barra EZ Agarre Cerrado",
  "con Barra EZ Press Agarre Cerrado": "Press con Barra EZ Agarre Cerrado",
  "con Barra EZ Skullcrusher": "Press Francés con Barra EZ",
  "con Barra Full Sentadilla": "Sentadilla Completa con Barra",
  "con Barra Inclinado Shoulder Elevación": "Elevación de Hombros Inclinado con Barra",
  "con Barra Inclinado en Banco Press — Medium Grip": "Press Inclinado con Barra — Agarre Medio",
  "con Barra Posterior Delt Remo": "Remo de Deltoides Posterior con Barra",
  "con Barra Sentadilla hasta en Banco": "Sentadilla hasta el Banco con Barra",
  "con Barra Side Bend": "Flexión Lateral con Barra",
  "con Bolsa de Arena Load": "Carga con Bolsa de Arena",
  "con Cadenas Handle Extensión": "Extensión con Manija de Cadenas",
  "con Cadenas Press": "Press con Cadenas",
  "con Cuerda Brazos Rectos Jalón al Pecho": "Jalón al Pecho Brazos Rectos con Cuerda",
  "con Cuerda Climb": "Escalada en Cuerda",
  "con Cuerda Crunch": "Crunch con Cuerda en Polea",
  "con Disco Giro": "Giro con Disco",
  "con Mancuernas Acostado Posterior Lateral Elevación": "Elevación Lateral Posterior Acostado con Mancuernas",
  "con Mancuernas Acostado Pronation": "Pronación Acostado con Mancuernas",
  "con Mancuernas Acostado Supination": "Supinación Acostado con Mancuernas",
  "con Mancuernas Acostado a Un Brazo Posterior Lateral Elevación": "Elevación Lateral Posterior Acostado a Un Brazo con Mancuernas",
  "con Mancuernas Alternado Bicep Curl": "Curl de Bíceps Alternado con Mancuernas",
  "con Mancuernas Bicep Curl": "Curl de Bíceps con Mancuernas",
  "con Mancuernas Cargada": "Cargada con Mancuernas",
  "con Mancuernas Elevación": "Elevación con Mancuernas",
  "con Mancuernas Flyes": "Aperturas con Mancuernas",
  "con Mancuernas Inclinado Remo": "Remo Inclinado con Mancuernas",
  "con Mancuernas Inclinado Shoulder Elevación": "Elevación de Hombros Inclinado con Mancuernas",
  "con Mancuernas Posterior Zancada": "Zancada Posterior con Mancuernas",
  "con Mancuernas Press Agarre Cerrado": "Press Agarre Cerrado con Mancuernas",
  "con Mancuernas Prono Inclinado Curl": "Curl Prono Inclinado con Mancuernas",
  "con Mancuernas Scaption": "Scaption con Mancuernas",
  "con Palms Facing In Inclinado con Mancuernas en Banco": "Press Inclinado con Mancuernas en Banco — Palmas Enfrentadas",
  "con Mancuernas Sentadilla hasta en Banco": "Sentadilla hasta el Banco con Mancuernas",
  "con Mancuernas Sentado a Una Pierna Calf Elevación": "Elevación de Pantorrillas Sentado a Una Pierna con Mancuernas",
  "con Mancuernas Sentado en Cajón Salto": "Salto desde Cajón Sentado con Mancuernas",
  "con Mancuernas Side Bend": "Flexión Lateral con Mancuernas",
  "con Mancuernas Step Ups": "Subida al Cajón con Mancuernas",
  "con Mancuernas Tricep Extensión -Pronated Grip": "Extensión de Tríceps con Mancuernas — Agarre Prono",
  "con Mancuernas Zancada": "Zancadas con Mancuernas",
  "con Mancuernas a Un Brazo Press de Hombros": "Press de Hombros a Un Brazo con Mancuerna",
  "con Mancuernas a Un Brazo Triceps Extensión": "Extensión de Tríceps a Un Brazo con Mancuerna",
  "con Mancuernas a Un Brazo Upright Remo": "Remo al Mentón a Un Brazo con Mancuerna",
  "con Mancuernas en Banco Press con Neutral Grip": "Press en Banco con Mancuernas — Agarre Neutro",
  "con Mancuernas en Suelo Press": "Press en Suelo con Mancuernas",
  "con Pelota Hiperextensión con Peso": "Hiperextensión con Pelota y Peso",
  "con Pelota Medicinal Chest Pass": "Pase de Pecho con Pelota Medicinal",
  "con Pelota Medicinal Full Giro": "Giro Completo con Pelota Medicinal",
  "con Pelota Medicinal Scoop Throw": "Lanzamiento en Paleo con Pelota Medicinal",
  "con Pelota Medicinal Slam a Un Brazo": "Lanzamiento al Suelo con Pelota Medicinal a Un Brazo",
  "con Pelota Side Bend con Peso": "Flexión Lateral con Pelota y Peso",
  "con Trineo Arrastre — Harness": "Arrastre con Trineo — Arnés",
  "con Trineo Inverso Apertura": "Apertura Inversa con Trineo",
  "con Trineo Remo": "Remo con Trineo",
  "con Trineo Sobre la Cabeza Backward Caminata": "Caminata hacia Atrás con Trineo Sobre la Cabeza",
  "con Trineo Sobre la Cabeza Triceps Extensión": "Extensión de Tríceps Sobre la Cabeza con Trineo",
  "en Anillas Fondos": "Fondos en Anillas",
  "en Banco Fondos": "Fondos en Banco",
  "en Banco Fondos con Peso": "Fondos en Banco con Peso",
  "en Banco Press - (((((Powerlifting)))))": "Press de Banca (Powerlifting)",
  "en Banco Salto": "Salto desde Banco",
  "en Banco Sprint": "Sprint en Banco",
  "en Cajón Salto (Multiple Response)": "Salto al Cajón (Respuesta Múltiple)",
  "en Cajón Skip": "Skip en Cajón",
  "en Máquina Bicep Curl": "Curl de Bíceps en Máquina",
  "en Máquina Shoulder (Military) Press": "Press Militar en Máquina",
  "en Máquina Smith Agarre Cerrado en Banco Press": "Press de Banca Agarre Cerrado en Máquina Smith",
  "en Máquina Smith Behind the Back Encogimiento": "Encogimiento Detrás de la Espalda en Máquina Smith",
  "en Máquina Smith Cadera Elevación": "Elevación de Cadera en Máquina Smith",
  "en Máquina Smith Colgado Power Cargada": "Cargada de Potencia desde Colgado en Máquina Smith",
  "en Máquina Smith Declinado Press": "Press Declinado en Máquina Smith",
  "en Máquina Smith Inverso Calf Elevación": "Elevación de Pantorrillas Inversa en Máquina Smith",
  "en Máquina Smith Leg Press": "Prensa de Piernas en Máquina Smith",
  "en Máquina Smith Piernas Rígidas Peso Muerto": "Peso Muerto Piernas Rígidas en Máquina Smith",
  "en Máquina Smith Pistol Sentadilla": "Sentadilla Pistola en Máquina Smith",
  "en Máquina Smith Sobre la Cabeza Press de Hombros": "Press de Hombros Sobre la Cabeza en Máquina Smith",
  "en Máquina Smith Upright Remo": "Remo al Mentón en Máquina Smith",
  "en Máquina Smith a Un Brazo Upright Remo": "Remo al Mentón a Un Brazo en Máquina Smith",
  "en Máquina Triceps Extensión": "Extensión de Tríceps en Máquina",
  "en Máquina en Predicador Curls": "Curl en Predicador en Máquina",
  "en Polea Acostado Triceps Extensión": "Extensión de Tríceps Acostado en Polea",
  "en Polea Chest Press": "Press de Pecho en Polea",
  "en Polea Crossover a Un Brazo": "Cruce de Poleas a Un Brazo",
  "en Polea Deadlifts": "Peso Muerto en Polea",
  "en Polea Encogimiento": "Encogimiento en Polea",
  "en Polea Inclinado Pushdown": "Jalón de Tríceps Inclinado en Polea",
  "en Polea Inclinado Triceps Extensión": "Extensión de Tríceps Inclinado en Polea",
  "en Polea Internal Rotation": "Rotación Interna en Polea",
  "en Polea Inverso Crunch": "Crunch Inverso en Polea",
  "en Polea Iron Cross": "Cruz de Hierro en Polea",
  "en Polea Judo Flip": "Volteo de Judo en Polea",
  "en Polea Martillo Curls — con Cuerda Attachment": "Curl Martillo en Polea — Accesorio de Cuerda",
  "en Polea One Arm Tricep Extensión": "Extensión de Tríceps a Un Brazo en Polea",
  "en Polea Press de Hombros": "Press de Hombros en Polea",
  "en Polea Pulldowns Agarre Supino": "Jalón al Pecho Agarre Supino en Polea",
  "en Polea Russian Twists": "Giro Ruso en Polea",
  "en Polea Sentado Crunch": "Crunch Sentado en Polea",
  "en Polea Sentado Lateral Elevación": "Elevación Lateral Sentado en Polea",
  "en Polea Wrist Curl": "Curl de Muñeca en Polea",
  "en Polea con Cuerda Posterior-Delt Rows": "Remo de Deltoides Posterior con Cuerda en Polea",
  "en Polea con Cuerda Sobre la Cabeza Triceps Extensión": "Extensión de Tríceps Sobre la Cabeza con Cuerda en Polea",
  "en Polea en Predicador Curl": "Curl en Predicador en Polea",
  "en Predicador Martillo con Mancuernas Curl": "Curl Martillo en Predicador con Mancuernas",
  "en Suelo Glúteo-Ham Elevación": "Elevación Glúteo-Isquiotibiales en Suelo",
  "en Suelo Press": "Press en Suelo",
  "en Suelo Press Alternado": "Press en Suelo Alternado",

  // ── Segunda ronda de mal ordenados ─────────────────────────────────────────
  "con Barra Ab Rueda Abdominal — On Knees": "Rueda Abdominal con Barra — De Rodillas",
  "con Barra Guillotine en Banco Press": "Press Guillotina con Barra en Banco",
  "con Banda Jalón Apart": "Jalón con Banda Separado",
  "con Banda Skull Crusher": "Press Francés con Banda",
  "Stance Squats Agarre Estrecho": "Sentadilla Agarre Estrecho",
  "con Barra Rueda Abdominal from en Banco": "Rueda Abdominal con Barra desde Banco",
  "con Barra Sentado Calf Elevación": "Elevación de Pantorrillas Sentado con Barra",
  "con Barra Encogimiento Behind The Back": "Encogimiento con Barra Detrás de la Espalda",
  "con Barra Side Split Sentadilla": "Sentadilla Split Lateral con Barra",
  "con Barra Step Ups": "Subida al Cajón con Barra",
  "Atlas Stone Entrenador": "Piedra Atlas de Entrenamiento",
  "Bicicleta de Aire": "Bicicleta de Aire",
};

// ── Description translations ──────────────────────────────────────────────────
// Common English phrases in descriptions → Spanish equivalents
const DESC_PHRASES: [RegExp, string][] = [
  [/\bStand up straight\b/gi, "Párate derecho"],
  [/\bStand with your feet\b/gi, "Párate con los pies"],
  [/\bLie down\b/gi, "Acuéstate"],
  [/\bLie face down\b/gi, "Acuéstate boca abajo"],
  [/\bLie on your back\b/gi, "Acuéstate boca arriba"],
  [/\bLie on a flat bench\b/gi, "Acuéstate en un banco plano"],
  [/\bSit on (a|the)\b/gi, "Siéntate en"],
  [/\bGrasp the bar\b/gi, "Agarra la barra"],
  [/\bGrip the bar\b/gi, "Agarra la barra"],
  [/\bWith a shoulder.width grip\b/gi, "con agarre al ancho de hombros"],
  [/\bshoulder.width apart\b/gi, "al ancho de hombros"],
  [/\bshoulder width\b/gi, "ancho de hombros"],
  [/\bKeep your back straight\b/gi, "Mantén la espalda recta"],
  [/\bKeep your chest up\b/gi, "Mantén el pecho arriba"],
  [/\bKeep your core tight\b/gi, "Mantén el core tenso"],
  [/\bEngage your core\b/gi, "Activa el core"],
  [/\bBreathe in\b/gi, "Inhala"],
  [/\bBreathe out\b/gi, "Exhala"],
  [/\bInhale\b/gi, "Inhala"],
  [/\bExhale\b/gi, "Exhala"],
  [/\bLower the weight\b/gi, "Baja el peso"],
  [/\bLower the bar\b/gi, "Baja la barra"],
  [/\bPress the weight\b/gi, "Empuja el peso"],
  [/\bPress the bar\b/gi, "Empuja la barra"],
  [/\bReturn to (the |the starting )?position\b/gi, "Vuelve a la posición inicial"],
  [/\bReturn to start\b/gi, "Vuelve al inicio"],
  [/\bRepeat (for|on) the other side\b/gi, "Repite del otro lado"],
  [/\busing a\b/gi, "usando"],
  [/\bwith a\b/gi, "con"],
  [/\bwith both\b/gi, "con ambos"],
  [/\buntil your\b/gi, "hasta que"],
  [/\bat the top\b/gi, "en la parte superior"],
  [/\bat the bottom\b/gi, "en la parte inferior"],
  [/\bSecondary muscles?:\s*/gi, "Músculos secundarios: "],
];

function translateName(name: string): string {
  // 1. Exact match
  if (EXACT[name]) return EXACT[name];

  // 2. Case-insensitive exact match
  const lowerName = name.toLowerCase();
  for (const [key, val] of Object.entries(EXACT)) {
    if (key.toLowerCase() === lowerName) return val;
  }

  // 3. Pattern-based word substitution → clean duplicate prepositions → reorder modifiers
  return reorderSpanish(cleanupSpanish(applyWordMap(name)));
}

// ── Word-level substitution map ───────────────────────────────────────────────
// Applied left-to-right; longer phrases must come before shorter ones.
const WORD_MAP: [RegExp, string][] = [
  // ─── Equipment ──────────────────────────────────────────────────────────
  [/\bSmith Machine\b/gi, "en Máquina Smith"],
  [/(?<!con )\bKettlebell(s)?\b/gi, "con Kettlebell"],
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

  // ─── Grips ──────────────────────────────────────────────────────────────
  [/\bClose-Grip\b/gi, "Agarre Cerrado"],
  [/\bWide-Grip\b/gi, "Agarre Amplio"],
  [/\bNeutral-Grip\b/gi, "Agarre Neutro"],
  [/\bReverse-Grip\b/gi, "Agarre Supino"],
  [/\bSnatch-Grip\b/gi, "Agarre de Arranque"],
  [/\bUnderhand\b/gi, "Agarre Supino"],
  [/\bOverhand\b/gi, "Agarre Prono"],

  // ─── Position modifiers ─────────────────────────────────────────────────
  [/\bFeet.?Elevated\b/gi, "con Pies Elevados"],
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
  [/\bTwo-Arm\b/gi, "a Dos Brazos"],
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
  [/\bDouble\b/gi, "Doble"],

  // ─── Base movements (compound forms first) ──────────────────────────────
  [/\bBicep(s)? Curl\b/gi, "Curl de Bíceps"],
  [/\bTricep(s)? (Push-?[Dd]own|Pushdown)\b/gi, "Jalón de Tríceps"],
  [/\bTricep(s)? Extension\b/gi, "Extensión de Tríceps"],
  [/\bUpright Row\b/gi, "Remo al Mentón"],
  [/\bSide Bend\b/gi, "Flexión Lateral"],
  [/\bBench Press\b/gi, "Press de Banca"],
  [/\bShoulder Press\b/gi, "Press de Hombros"],
  [/\bMilitary Press\b/gi, "Press Militar"],
  [/\bArnold Press\b/gi, "Press Arnold"],
  [/\bPush Press\b/gi, "Press con Impulso"],
  [/\bOverhead Press\b/gi, "Press Sobre la Cabeza"],
  [/\bDeadlift\b/gi, "Peso Muerto"],
  [/\bSquat\b/gi, "Sentadilla"],
  [/\bLunge(s)?\b/gi, "Zancada"],
  [/\bPull-?Ups?\b/gi, "Dominadas"],
  [/\bChin-Up\b/gi, "Dominada en Supino"],
  [/\bPulldown\b/gi, "Jalón al Pecho"],
  [/\bPull-Down\b/gi, "Jalón al Pecho"],
  [/\bRow\b/gi, "Remo"],
  [/\bCurl\b/gi, "Curl"],
  [/\bPress\b/gi, "Press"],
  [/\bExtension\b/gi, "Extensión"],
  [/\bRaise(s)?\b/gi, "Elevación"],
  [/\bFlye?s\b/gi, "Aperturas"],
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
  [/\bClimb(ing)?\b/gi, "Escalada"],
  [/\bLoad(ing)?\b/gi, "Carga"],
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

  // ─── Qualifiers ─────────────────────────────────────────────────────────
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
  [/\bPowerlifting\b/gi, "(Powerlifting)"],
  [/\bStiff-?Leg(ged)?\b/gi, "Piernas Rígidas"],
  [/\bStraight-?Arm\b/gi, "Brazos Rectos"],
  [/\bFlying\b/gi, "en Vuelo"],
  [/\bBicep(s)?\b/gi, "Bíceps"],
  [/\bTricep(s)?\b/gi, "Tríceps"],
  [/\bShoulder(s)?\b/gi, "Hombros"],
  [/\bDelt(oid)?\b/gi, "Deltoides"],
  [/\bWrist\b/gi, "Muñeca"],
  [/\bPronation\b/gi, "Pronación"],
  [/\bSupination\b/gi, "Supinación"],
  [/\bRotation(s)?\b/gi, "Rotación"],
  [/\bAdduction(s)?\b/gi, "Aducción"],
  [/\bAbduction(s)?\b/gi, "Abducción"],
  [/\bBend\b/gi, "Flexión"],

  // ─── Misc ────────────────────────────────────────────────────────────────
  [/\bAir Bike\b/gi, "Bicicleta de Aire"],
  [/\bBike\b/gi, "Bicicleta"],
  [/\bRope\b/gi, "Cuerda"],
  [/\bCrawl\b/gi, "Arrastre en Cuatro Patas"],
  [/\bTrainer\b/gi, "Entrenador"],
  [/\bBalance Board\b/gi, "Tabla de Equilibrio"],
  [/\bTo A\b/gi, "hasta"],
  [/\bWith\b/gi, "con"],
  [/\b - \b/g, " — "],
  // NOTE: do NOT add [/\bWith\b/gi, "con"] — it causes double-con when combined
  // with equipment words that already generate "con X" (e.g. Band → con Banda)
];

function applyWordMap(name: string): string {
  let result = name;
  for (const [pattern, replacement] of WORD_MAP) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

/**
 * Remove duplicate consecutive prepositions produced by the word-map.
 * e.g. "con con con Kettlebell" → "con Kettlebell"
 *      "Sentadilla con con Banda" → "Sentadilla con Banda"
 */
function cleanupSpanish(name: string): string {
  let s = name;
  let prev: string;
  do {
    prev = s;
    s = s.replace(/\bcon con\b/gi, 'con');
    s = s.replace(/\ben en\b/gi, 'en');
  } while (s !== prev);
  return s.replace(/\s{2,}/g, ' ').trim();
}

/**
 * In Spanish, equipment and position modifiers go AFTER the base movement.
 * This function runs multiple passes, collecting any leading modifier tokens
 * and appending them at the end.
 * e.g. "con Mancuernas Alternado Curl de Bíceps" → "Curl de Bíceps con Mancuernas Alternado"
 * e.g. "en Polea Acostado Extensión de Tríceps"  → "Extensión de Tríceps en Polea Acostado"
 */
function reorderSpanish(name: string): string {
  const leadingModifiers: RegExp[] = [
    // Equipment (longer phrases first to avoid partial matches)
    /^(con Barra EZ)\s+/i,
    /^(con Barra)\s+/i,
    /^(con Mancuernas?)\s+/i,
    /^(con Kettlebells?)\s+/i,
    /^(en Máquina Smith)\s+/i,
    /^(en Máquina)\s+/i,
    /^(en Polea)\s+/i,
    /^(en Anillas)\s+/i,
    /^(en TRX)\s+/i,
    /^(en Suspensión)\s+/i,
    /^(en Banco)\s+/i,
    /^(en Cajón)\s+/i,
    /^(en Suelo)\s+/i,
    /^(en Predicador)\s+/i,
    /^(con Banda)\s+/i,
    /^(con Cuerda)\s+/i,
    /^(con Disco)\s+/i,
    /^(con Cadenas)\s+/i,
    /^(con Trineo)\s+/i,
    /^(con Pelota Medicinal)\s+/i,
    /^(con Pelota)\s+/i,
    /^(con Bolsa de Arena)\s+/i,
    // Position / limb modifiers
    /^(a Dos Brazos)\s+/i,
    /^(a Un Brazo)\s+/i,
    /^(a Una Pierna)\s+/i,
    /^(con Pies Elevados)\s+/i,
    /^(con Peso)\s+/i,
    /^(Alternado)\s+/i,
    /^(Asistido)\s+/i,
    /^(Agarre (?:Amplio|Cerrado|Neutro|Supino|Prono|de Arranque))\s+/i,
    /^(Sentado)\s+/i,
    /^(de Pie)\s+/i,
    /^(Acostado)\s+/i,
    /^(Inclinado)\s+/i,
    /^(Declinado)\s+/i,
    /^(Colgado)\s+/i,
  ];

  const collected: string[] = [];
  let remainder = name;
  let found = true;

  while (found) {
    found = false;
    for (const pattern of leadingModifiers) {
      const match = remainder.match(pattern);
      if (match) {
        collected.push(match[1]);
        remainder = remainder.slice(match[0].length);
        found = true;
        break;
      }
    }
  }

  return collected.length > 0 ? `${remainder} ${collected.join(' ')}`.trim() : name;
}

function translateDescription(desc: string | null): string | null {
  if (!desc) return null;
  let result = desc;
  for (const [pattern, replacement] of DESC_PHRASES) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

async function main() {
  console.log("Fetching exercises from exercise_library...");
  const { data, error } = await supabase
    .from("exercise_library")
    .select("id, name, description");

  if (error) throw error;
  if (!data || data.length === 0) {
    console.log("No exercises found.");
    return;
  }

  console.log(`Found ${data.length} exercises. Translating...`);

  let translated = 0;
  let skipped = 0;
  const notFound: string[] = [];

  const BATCH = 50;
  const updates: { id: string; name: string; description: string | null }[] = [];

  for (const ex of data) {
    const newName = translateName(ex.name);
    const newDesc = translateDescription(ex.description);

    if (newName !== ex.name || newDesc !== ex.description) {
      updates.push({ id: ex.id, name: newName, description: newDesc });
      translated++;
    } else {
      skipped++;
      if (newName === ex.name) notFound.push(ex.name);
    }
  }

  console.log(`\nTo translate: ${translated}, Already in Spanish or unchanged: ${skipped}`);

  if (updates.length === 0) {
    console.log("Nothing to update.");
    return;
  }

  // Apply updates in batches
  let applied = 0;
  for (let i = 0; i < updates.length; i += BATCH) {
    const batch = updates.slice(i, i + BATCH);
    for (const u of batch) {
      const { error: upErr } = await supabase
        .from("exercise_library")
        .update({ name: u.name, description: u.description })
        .eq("id", u.id);

      if (upErr) {
        console.error(`Error updating "${u.name}":`, upErr.message);
      } else {
        applied++;
      }
    }
    console.log(`Updated ${Math.min(i + BATCH, updates.length)}/${updates.length}`);
  }

  console.log(`\nDone! Updated: ${applied}`);

  if (notFound.length > 0) {
    const sample = notFound.slice(0, 20);
    console.log(`\nExercises without specific translation (${notFound.length} total, showing first 20):`);
    sample.forEach((n) => console.log(`  - ${n}`));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
