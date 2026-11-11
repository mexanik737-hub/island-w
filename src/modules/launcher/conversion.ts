export interface UnitConversion {
  amount: number;
  from: string;
  to: string;
  result: number;
  display: string;
}
type Dimension = "length" | "mass" | "volume" | "time" | "speed" | "temperature" | "data";
interface Unit {
  code: string;
  dimension: Dimension;
  factor?: number;
  aliases: string[];
}
const UNITS: Unit[] = [
  { code: "mm", dimension: "length", factor: 0.001, aliases: ["mm", "millimeter", "millimeters", "миллиметр", "миллиметры", "мм"] },
  { code: "cm", dimension: "length", factor: 0.01, aliases: ["cm", "centimeter", "centimeters", "сантиметр", "сантиметры", "см"] },
  { code: "m", dimension: "length", factor: 1, aliases: ["m", "meter", "meters", "метр", "метры", "м"] },
  { code: "km", dimension: "length", factor: 1000, aliases: ["km", "kilometer", "kilometers", "километр", "километры", "км"] },
  { code: "in", dimension: "length", factor: 0.0254, aliases: ["in", "inch", "inches", "дюйм", "дюймы"] },
  { code: "ft", dimension: "length", factor: 0.3048, aliases: ["ft", "foot", "feet", "фут", "футы"] },
  { code: "yd", dimension: "length", factor: 0.9144, aliases: ["yd", "yard", "yards", "ярд", "ярды"] },
  { code: "mi", dimension: "length", factor: 1609.344, aliases: ["mi", "mile", "miles", "миля", "мили", "миль"] },
  { code: "mg", dimension: "mass", factor: 0.000001, aliases: ["mg", "milligram", "milligrams", "мг", "миллиграмм"] },
  { code: "g", dimension: "mass", factor: 0.001, aliases: ["g", "gram", "grams", "г", "грамм", "грамма"] },
  { code: "kg", dimension: "mass", factor: 1, aliases: ["kg", "kilogram", "kilograms", "кг", "килограмм", "килограмма"] },
  { code: "oz", dimension: "mass", factor: 0.028349523125, aliases: ["oz", "ounce", "ounces", "унция", "унции"] },
  { code: "lb", dimension: "mass", factor: 0.45359237, aliases: ["lb", "lbs", "pound", "pounds", "фунт", "фунты"] },
  { code: "t", dimension: "mass", factor: 1000, aliases: ["t", "ton", "tonne", "tons", "тонна", "тонны", "т"] },
  { code: "ml", dimension: "volume", factor: 0.001, aliases: ["ml", "milliliter", "milliliters", "мл", "миллилитр"] },
  { code: "l", dimension: "volume", factor: 1, aliases: ["l", "liter", "litre", "liters", "литр", "литра", "литров", "л"] },
  { code: "tsp", dimension: "volume", factor: 0.00492892159375, aliases: ["tsp", "teaspoon", "teaspoons"] },
  { code: "tbsp", dimension: "volume", factor: 0.01478676478125, aliases: ["tbsp", "tablespoon", "tablespoons"] },
  { code: "cup", dimension: "volume", factor: 0.2365882365, aliases: ["cup", "cups"] },
  { code: "gal", dimension: "volume", factor: 3.785411784, aliases: ["gal", "gallon", "gallons"] },
  { code: "ms", dimension: "time", factor: 0.001, aliases: ["ms", "millisecond", "milliseconds", "мс"] },
  { code: "s", dimension: "time", factor: 1, aliases: ["s", "sec", "second", "seconds", "сек", "секунда", "секунды"] },
  { code: "min", dimension: "time", factor: 60, aliases: ["min", "minute", "minutes", "мин", "минута", "минуты"] },
  { code: "h", dimension: "time", factor: 3600, aliases: ["h", "hr", "hour", "hours", "час", "часа", "часов"] },
  { code: "day", dimension: "time", factor: 86400, aliases: ["d", "day", "days", "день", "дня", "дней"] },
  { code: "m/s", dimension: "speed", factor: 1, aliases: ["m/s", "mps"] },
  { code: "km/h", dimension: "speed", factor: 1 / 3.6, aliases: ["km/h", "kph", "км/ч"] },
  { code: "mph", dimension: "speed", factor: 0.44704, aliases: ["mph", "mi/h"] },
  { code: "kn", dimension: "speed", factor: 0.5144444444, aliases: ["kn", "knot", "knots", "узел", "узла", "узлов"] },
  { code: "C", dimension: "temperature", aliases: ["c", "°c", "celsius", "centigrade", "цельсий", "с"] },
  { code: "F", dimension: "temperature", aliases: ["f", "°f", "fahrenheit", "фаренгейт", "ф"] },
  { code: "K", dimension: "temperature", aliases: ["k", "kelvin", "кельвин", "к"] },
  { code: "B", dimension: "data", factor: 1, aliases: ["b", "byte", "bytes", "байт", "байта"] },
  { code: "KB", dimension: "data", factor: 1000, aliases: ["kb", "kilobyte", "kilobytes"] },
  { code: "MB", dimension: "data", factor: 1_000_000, aliases: ["mb", "megabyte", "megabytes"] },
  { code: "GB", dimension: "data", factor: 1_000_000_000, aliases: ["gb", "gigabyte", "gigabytes"] },
  { code: "TB", dimension: "data", factor: 1_000_000_000_000, aliases: ["tb", "terabyte", "terabytes"] },
  { code: "KiB", dimension: "data", factor: 1024, aliases: ["kib"] },
  { code: "MiB", dimension: "data", factor: 1_048_576, aliases: ["mib"] },
  { code: "GiB", dimension: "data", factor: 1_073_741_824, aliases: ["gib"] },
];
const ALIAS = new Map<string, Unit>();
for (const unit of UNITS) for (const alias of unit.aliases) ALIAS.set(alias.toLowerCase(), unit);

function toBase(value: number, unit: Unit): number {
  if (unit.dimension === "temperature") {
    if (unit.code === "C") return value + 273.15;
    if (unit.code === "F") return (value - 32) * 5 / 9 + 273.15;
    return value;
  }
  return value * (unit.factor ?? 1);
}
function fromBase(value: number, unit: Unit): number {
  if (unit.dimension === "temperature") {
    if (unit.code === "C") return value - 273.15;
    if (unit.code === "F") return (value - 273.15) * 9 / 5 + 32;
    return value;
  }
  return value / (unit.factor ?? 1);
}
function format(value: number): string {
  if (!Number.isFinite(value)) return String(value);
  if (Math.abs(value) >= 1e9 || (Math.abs(value) > 0 && Math.abs(value) < 1e-6)) return value.toExponential(5);
  return Number(value.toFixed(6)).toString();
}
/** Examples: "5 km to mi", "100 c to f", "12 кг в lb". */
export function convertUnits(input: string): UnitConversion | null {
  const match = /^\s*(-?\d+(?:[.,]\d+)?)\s*([a-zа-яё°0-9/]+)\s+(?:to|in|в|→)\s*([a-zа-яё°0-9/]+)\s*$/i.exec(input);
  if (!match) return null;
  const amount = Number(match[1].replace(",", "."));
  const from = ALIAS.get(match[2].toLowerCase());
  const to = ALIAS.get(match[3].toLowerCase());
  if (!Number.isFinite(amount) || !from || !to || from.dimension !== to.dimension) return null;
  const result = fromBase(toBase(amount, from), to);
  return {
    amount,
    from: from.code,
    to: to.code,
    result,
    display: format(amount) + " " + from.code + " = " + format(result) + " " + to.code,
  };
}
