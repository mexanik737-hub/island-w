import { motion } from "motion/react";
import type { CharacterId } from "../../ipc/settings";

export const CHARACTER_OPTIONS: { id: CharacterId; name: string; glyph: string }[] = [
  {
    "id": "liquid",
    "name": "Liquid island",
    "glyph": ""
  },
  {
    "id": "pixel",
    "name": "Pixel",
    "glyph": "👾"
  },
  {
    "id": "spark",
    "name": "Spark",
    "glyph": "✨"
  },
  {
    "id": "eyes",
    "name": "Eyes",
    "glyph": "👀"
  },
  {
    "id": "tail",
    "name": "Tail",
    "glyph": "🐈‍⬛"
  },
  {
    "id": "legs",
    "name": "Island legs",
    "glyph": "🟣"
  },
  {
    "id": "jellyfish",
    "name": "Jellyfish",
    "glyph": "🪼"
  },
  {
    "id": "hamster",
    "name": "Hamster wheel",
    "glyph": "🐹"
  },
  {
    "id": "campfire",
    "name": "Campfire",
    "glyph": "🔥"
  },
  {
    "id": "lens",
    "name": "Lens",
    "glyph": "🔍"
  },
  {
    "id": "newton",
    "name": "Newton’s cradle",
    "glyph": "⚖️"
  },
  {
    "id": "cat",
    "name": "Cat",
    "glyph": "🐱"
  },
  {
    "id": "frog",
    "name": "Frog",
    "glyph": "🐸"
  },
  {
    "id": "ghost",
    "name": "Ghost",
    "glyph": "👻"
  },
  {
    "id": "cloud",
    "name": "Cloud",
    "glyph": "☁️"
  },
  {
    "id": "planet",
    "name": "Planet",
    "glyph": "🪐"
  },
  {
    "id": "flower",
    "name": "Flower",
    "glyph": "🌸"
  },
  {
    "id": "mushroom",
    "name": "Mushroom",
    "glyph": "🍄"
  },
  {
    "id": "duck",
    "name": "Duck",
    "glyph": "🦆"
  },
  {
    "id": "fox",
    "name": "Fox",
    "glyph": "🦊"
  },
  {
    "id": "axolotl",
    "name": "Axolotl",
    "glyph": "🦎"
  },
  {
    "id": "star",
    "name": "Star",
    "glyph": "⭐"
  },
  {
    "id": "robot",
    "name": "Robot",
    "glyph": "🤖"
  },
  {
    "id": "slime",
    "name": "Slime",
    "glyph": "🟢"
  },
  {
    "id": "butterfly",
    "name": "Butterfly",
    "glyph": "🦋"
  }
];

export function CharacterSprite({ character, preview = false }: { character: CharacterId; preview?: boolean }) {
  if (character === "liquid") return null;
  const option = CHARACTER_OPTIONS.find((item) => item.id === character) ?? CHARACTER_OPTIONS[1];
  return (
    <motion.div
      className={`island-character island-character--${character} ${preview ? "island-character--preview" : ""}`}
      aria-label={option.name}
      title={option.name}
      animate={{ y: [0, -2, 0], rotate: character === "newton" ? [0, 5, -5, 0] : [0, -1.5, 1.5, 0], scale: [1, 1.035, 1] }}
      transition={{ duration: character === "hamster" ? 1.15 : 2.3, repeat: Infinity, ease: "easeInOut" }}
    >
      <span>{option.glyph}</span>
    </motion.div>
  );
}
