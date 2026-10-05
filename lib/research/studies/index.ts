// The study registry. Adding a study here is all it takes for the scheduler,
// the CLI and the CSV endpoint to pick it up.
import type { Study } from "../types";
import { sicFormationsStudy } from "./sic-formations";
import { cityFormationsStudy } from "./city-formations";

export const STUDIES: Study[] = [sicFormationsStudy, cityFormationsStudy];

export function studyById(id: string): Study | null {
  return STUDIES.find((s) => s.id === id) ?? null;
}
