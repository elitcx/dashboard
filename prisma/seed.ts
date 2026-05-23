// Seeds a starter exercise library for each user. Not run automatically;
// call manually with `npm run db:seed` if you want to pre-populate.
//
// The app also auto-creates exercises on the fly when a workout is logged
// with a new exercise name, so this seed is optional.

import { PrismaClient, type MuscleGroup, type ExerciseCategory } from "@prisma/client";

const prisma = new PrismaClient();

const SEED_EXERCISES: Array<{
  name: string;
  muscleGroup: MuscleGroup;
  category?: ExerciseCategory;
}> = [
  { name: "Bench Press", muscleGroup: "CHEST" },
  { name: "Incline Bench Press", muscleGroup: "CHEST" },
  { name: "Dumbbell Bench Press", muscleGroup: "CHEST" },
  { name: "Push Up", muscleGroup: "CHEST" },
  { name: "Cable Fly", muscleGroup: "CHEST" },

  { name: "Pull Up", muscleGroup: "BACK" },
  { name: "Lat Pulldown", muscleGroup: "BACK" },
  { name: "Barbell Row", muscleGroup: "BACK" },
  { name: "Cable Row", muscleGroup: "BACK" },
  { name: "Deadlift", muscleGroup: "BACK" },

  { name: "Overhead Press", muscleGroup: "SHOULDERS" },
  { name: "Lateral Raise", muscleGroup: "SHOULDERS" },
  { name: "Front Raise", muscleGroup: "SHOULDERS" },
  { name: "Face Pull", muscleGroup: "SHOULDERS" },

  { name: "Barbell Curl", muscleGroup: "BICEPS" },
  { name: "Dumbbell Curl", muscleGroup: "BICEPS" },
  { name: "Hammer Curl", muscleGroup: "BICEPS" },

  { name: "Tricep Pushdown", muscleGroup: "TRICEPS" },
  { name: "Tricep Extension", muscleGroup: "TRICEPS" },
  { name: "Skull Crusher", muscleGroup: "TRICEPS" },
  { name: "Dip", muscleGroup: "TRICEPS" },

  { name: "Squat", muscleGroup: "QUADS" },
  { name: "Front Squat", muscleGroup: "QUADS" },
  { name: "Leg Press", muscleGroup: "QUADS" },
  { name: "Leg Extension", muscleGroup: "QUADS" },
  { name: "Lunges", muscleGroup: "QUADS" },

  { name: "Romanian Deadlift", muscleGroup: "HAMSTRINGS" },
  { name: "Leg Curl", muscleGroup: "HAMSTRINGS" },

  { name: "Hip Thrust", muscleGroup: "GLUTES" },
  { name: "Glute Bridge", muscleGroup: "GLUTES" },

  { name: "Calf Raise", muscleGroup: "CALVES" },
  { name: "Standing Calf Raise", muscleGroup: "CALVES" },

  { name: "Plank", muscleGroup: "CORE" },
  { name: "Crunch", muscleGroup: "CORE" },
  { name: "Hanging Leg Raise", muscleGroup: "CORE" },
  { name: "Russian Twist", muscleGroup: "CORE" },

  { name: "Running", muscleGroup: "FULL_BODY", category: "CARDIO" },
  { name: "Cycling", muscleGroup: "FULL_BODY", category: "CARDIO" },
  { name: "Rowing", muscleGroup: "FULL_BODY", category: "CARDIO" },
];

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  if (users.length === 0) {
    console.log("No users found. Sign up first, then re-run.");
    return;
  }

  for (const user of users) {
    let created = 0;
    for (const ex of SEED_EXERCISES) {
      const result = await prisma.exercise.upsert({
        where: { userId_name: { userId: user.id, name: ex.name } },
        update: {},
        create: {
          userId: user.id,
          name: ex.name,
          muscleGroup: ex.muscleGroup,
          category: ex.category ?? "STRENGTH",
          isCustom: false,
        },
      });
      if (result) created++;
    }
    console.log(`Seeded ${created} exercises for ${user.email}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
