import fs from "node:fs";
import path from "node:path";
import TableTopicsClient from "./TableTopicsClient";
import { IMAGE_TAGS } from "@/lib/table-topics-image-tags";

const IMAGE_EXTENSIONS = /\.(png|jpe?g|webp|gif)$/i;

// Runs at build time (this page has no dynamic data, so Next statically
// renders it): scans public/table-topics-images/ so new images just need
// to be uploaded there — no manifest to hand-maintain.
export default function TableTopicsPage() {
  let files: string[] = [];
  try {
    const dir = path.join(process.cwd(), "public", "table-topics-images");
    files = fs.readdirSync(dir).filter((f) => IMAGE_EXTENSIONS.test(f));
  } catch {
    files = [];
  }

  const images = files.map((file) => ({ file, tags: IMAGE_TAGS[file] ?? [] }));

  return <TableTopicsClient images={images} />;
}