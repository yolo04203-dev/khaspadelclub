import { useParams } from "react-router-dom";
import LadderCategories from "./LadderCategories";

// LadderDetail now renders the Level 1 categories page.
// Kept as a thin wrapper to preserve the existing route.
export default function LadderDetail() {
  return <LadderCategories />;
}
