import type { Meal } from "./supabase";

export function totals(meals: Meal[]) {
  return meals.reduce(
    (acc, m) => ({
      calories: acc.calories + (m.calories || 0),
      protein: acc.protein + Number(m.protein || 0),
      carbs: acc.carbs + Number(m.carbs || 0),
      fat: acc.fat + Number(m.fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfDaysAgo(days: number): Date {
  const d = startOfToday();
  d.setDate(d.getDate() - days);
  return d;
}

export function groupByMealType(meals: Meal[]) {
  const order: Meal["meal_type"][] = ["breakfast", "lunch", "dinner", "snack"];
  const map = new Map<Meal["meal_type"], Meal[]>();
  for (const t of order) map.set(t, []);
  for (const m of meals) map.get(m.meal_type)?.push(m);
  return order.map((t) => ({ type: t, items: map.get(t) ?? [] }));
}

export function weeklyBuckets(meals: Meal[]) {
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = startOfToday();
  const buckets: { day: string; cal: number; date: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    buckets.push({ day: labels[d.getDay()], cal: 0, date: d.toISOString().slice(0, 10) });
  }
  for (const m of meals) {
    const key = m.consumed_at.slice(0, 10);
    const b = buckets.find((x) => x.date === key);
    if (b) b.cal += m.calories || 0;
  }
  return buckets;
}