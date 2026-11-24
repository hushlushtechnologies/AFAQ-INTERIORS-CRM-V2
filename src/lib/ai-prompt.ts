/** Turns the designer's short brief into a precise instruction for the image model. */
export function buildDesignPrompt(o: { prompt: string; style?: string; room?: string; keepLayout: boolean; hasPhoto: boolean }) {
  const lines: string[] = [];
  if (o.hasPhoto) {
    lines.push(
      `Redesign the interior shown in this photo${o.room ? ` (${o.room.toLowerCase()})` : ""} as a professional interior designer for a high-end Dubai interior design firm would.`,
    );
    if (o.keepLayout) {
      lines.push(
        "Keep the room's architecture exactly as it is: the same walls, windows, doors, ceiling height, columns, floor plan and camera angle. Change only finishes, furniture, lighting, decor and materials.",
      );
    } else {
      lines.push("You may change the layout, ceiling and joinery, but keep the same camera viewpoint and overall room size.");
    }
  } else {
    lines.push(`Create a photorealistic interior design concept${o.room ? ` for a ${o.room.toLowerCase()}` : ""} for a high-end residence in Dubai.`);
  }
  if (o.style) {
    const hint = STYLE_PRESETS.find((p) => p.id === o.style)?.hint;
    lines.push(`Design style: ${o.style}${hint ? ` — ${hint}` : ""}.`);
  }
  if (o.prompt) lines.push(`Client brief: ${o.prompt}`);
  lines.push(
    "Output a single photorealistic image that looks like professional architectural interior photography: natural daylight with warm accent lighting, realistic materials and textures, correct proportions and perspective, no people, no text, no watermarks or labels.",
  );
  return lines.join("\n");
}

export const STYLE_PRESETS = [
  { id: "Modern luxury", hint: "marble, brass accents, soft neutrals, statement lighting" },
  { id: "Contemporary Arabic", hint: "mashrabiya screens, arches, warm stone, rich textiles" },
  { id: "Japandi", hint: "light oak, linen, minimal, calm earthy tones" },
  { id: "Minimal warm", hint: "clean lines, plaster walls, beige and taupe, hidden storage" },
  { id: "Classic", hint: "mouldings, symmetry, chandeliers, tufted upholstery" },
  { id: "Art deco", hint: "geometric patterns, velvet, gold, deep jewel tones" },
  { id: "Coastal", hint: "whites, sand, rattan, light blue accents" },
  { id: "Industrial", hint: "exposed concrete, black steel, leather, Edison bulbs" },
];

export const ROOM_TYPES = ["Living room", "Majlis", "Master bedroom", "Bedroom", "Kitchen", "Dining room", "Bathroom", "Entrance / foyer", "Home office", "Kids room", "Outdoor / terrace", "Reception", "Office", "Restaurant"];
